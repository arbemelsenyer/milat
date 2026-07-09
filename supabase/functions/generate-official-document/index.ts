// generate-official-document: selects template based on case metadata and fills placeholders.
// Returns filled text + selected template metadata. Client renders PDF/DOCX/UDF.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const j = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

/** Map (mediation_type, outcome, disputeType, kind) → template_type */
function selectTemplate(opts: {
  mediation_type?: string | null;
  outcome?: string | null;
  dispute_type?: string | null;
  kind: "son_tutanak" | "davet" | "ilk_oturum";
}): string {
  const { mediation_type, outcome, dispute_type, kind } = opts;
  const dt = (dispute_type || "").toLowerCase();

  if (kind === "davet") {
    if (mediation_type === "ihtiyari") return "ihtiyari_davet";
    if (["isci", "isci_isveren", "iş", "işçi", "işveren", "labor", "employment"].some((k) => dt.includes(k))) return "isci_isveren_davet";
    if (["ticari", "commercial", "inşaat", "insaat", "bankacılık", "bankacilik", "sigorta", "fikri"].some((k) => dt.includes(k))) return "ticari_davet";
    if (["tüketici", "tuketici", "consumer", "sağlık", "saglik"].some((k) => dt.includes(k))) return "tuketici_davet";
    if (["kira", "gayrimenkul", "aile", "family", "rent"].some((k) => dt.includes(k))) return "ihtiyari_davet";
    return "ihtiyari_davet";
  }

  if (kind === "ilk_oturum") return "dava_sarti_ilk_oturum";

  // son_tutanak
  const isIhtiyari = mediation_type === "ihtiyari";
  const agreed = outcome === "anlasma";
  if (isIhtiyari) return agreed ? "ihtiyari_anlasma" : "ihtiyari_anlasamamama";
  return agreed ? "dava_sarti_anlasma" : "dava_sarti_anlasamamama";
}

function fmtDate(d?: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("tr-TR");
  } catch {
    return "";
  }
}

function partyBlock(p: any): string {
  const isCorp = p.party_type === "corporate";
  const name = isCorp ? p.company_name || "-" : `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "-";
  return [
    isCorp ? `Unvanı: ${name}` : `Adı ve Soyadı: ${name}`,
    isCorp ? `Vergi Kimlik Numarası: ${p.tax_number ?? "-"}` : `T.C. Kimlik Numarası: ${p.tc_kimlik ?? "-"}`,
    `Adresi: ${p.address ?? "-"}`,
    `Telefon: ${p.phone ?? "-"}`,
    `E-posta: ${p.email ?? "-"}`,
  ].join("\n");
}

/** Very simple placeholder-fill: replaces common patterns like ……, ___, blank-after-colon rows. */
function fillTemplate(content: string, data: Record<string, string>): string {
  let out = content;

  // Row-based replacement: for known labels ending with ":" replace value.
  const rowMap: Record<string, string> = {
    "Büro Dosya Numarası": data.dosya_no,
    "Arabuluculuk Dosya Numarası": data.dosya_no,
    "Arabuluculuk Bürosu": data.buro,
    "Arabuluculuk Bürosuna Başvuru Tarihi": data.basvuru_tarihi,
    "Arabulucunun Görevlendirildiği Tarih": data.gorevlendirme_tarihi,
    "Tutanağın Düzenlendiği Tarih": data.tutanak_tarihi,
    "Tutanağının Düzenlendiği Tarih": data.tutanak_tarihi,
    "Tutanağın Düzenlendiği Yer": data.tutanak_yeri,
    "Tutanağının Düzenlendiği Yer": data.tutanak_yeri,
    "Arabuluculuk Sürecinin Başladığı Tarih": data.basvuru_tarihi,
  };
  for (const [label, val] of Object.entries(rowMap)) {
    if (val == null || val === "") continue;
    const re = new RegExp(`(${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*:)([^\\n]*)`, "g");
    out = out.replace(re, `$1 ${val}`);
  }

  // Placeholder tokens
  out = out.replace(/{{dosya_no}}/g, data.dosya_no || "");
  out = out.replace(/{{anlasma_bedeli}}/g, data.anlasma_bedeli || "");
  out = out.replace(/{{anlasma_konusu}}/g, data.anlasma_konusu || "");

  // Append parties + agreement info as an appendix
  if (data.parties_block) out += `\n\n--- TARAFLAR ---\n${data.parties_block}\n`;
  if (data.agreement_terms) out += `\n--- ANLAŞMA ŞARTLARI ---\n${data.agreement_terms}\n`;
  if (data.agreement_amount) out += `\nAnlaşma Bedeli: ${data.agreement_amount} TL\n`;
  if (data.session_date) out += `\nToplantı Tarihi: ${data.session_date}\n`;
  if (data.fee_block) out += `\n--- ÜCRET BİLGİSİ ---\n${data.fee_block}\n`;
  if (data.mediator_name) out += `\n--- ARABULUCU ---\nArabulucu Adı: ${data.mediator_name}\nSicil No: [Arabulucu dolduracak]\nBüro: [Arabulucu dolduracak]\n`;

  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return j({ error: "Unauthorized" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userRes, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userRes?.user) return j({ error: "Unauthorized" }, 401);
  const admin = createClient(supabaseUrl, serviceKey);

  let body: any = {};
  try { body = await req.json(); } catch {}
  const { case_id, kind, outcome_override } = body || {};
  if (!case_id || !kind) return j({ error: "case_id and kind required" }, 400);
  if (!["son_tutanak", "davet", "ilk_oturum"].includes(kind)) return j({ error: "invalid kind" }, 400);

  // Load case, parties, session, fee, mediator profile.
  const { data: caseRow, error: caseErr } = await admin.from("cases").select("*").eq("id", case_id).maybeSingle();
  if (caseErr || !caseRow) return j({ error: "Case not found" }, 404);

  // Access check: user must be admin, mediator, owner, or party.
  const uid = userRes.user.id;
  const [{ data: adminRole }, { data: partyRow }] = await Promise.all([
    admin.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
    admin.from("case_parties").select("id").eq("case_id", case_id).eq("user_id", uid).maybeSingle(),
  ]);
  const canAccess = adminRole || caseRow.user_id === uid || caseRow.assigned_mediator_id === uid || partyRow;
  if (!canAccess) return j({ error: "Forbidden" }, 403);

  const outcome = outcome_override || caseRow.outcome;
  const template_type = selectTemplate({
    mediation_type: caseRow.mediation_type,
    outcome,
    dispute_type: caseRow.dispute_type,
    kind: kind as any,
  });

  const { data: tpl } = await admin.from("document_templates").select("template_content, source_url").eq("template_type", template_type).maybeSingle();
  if (!tpl?.template_content) {
    return j({
      error: "template_missing",
      template_type,
      message: `'${template_type}' şablonu henüz yüklenmemiş. Admin panelinden 'Şablonları Bakanlıktan Güncelle' butonuna tıklayın.`,
    }, 424);
  }

  const [{ data: parties }, { data: sessions }, { data: fee }, { data: profile }] = await Promise.all([
    admin.from("case_parties").select("*").eq("case_id", case_id),
    admin.from("case_sessions").select("*").eq("case_id", case_id).order("scheduled_at", { ascending: true }).limit(1),
    admin.from("case_fees").select("*").eq("case_id", case_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    caseRow.assigned_mediator_id
      ? admin.from("profiles").select("full_name").eq("user_id", caseRow.assigned_mediator_id).maybeSingle()
      : Promise.resolve({ data: null } as any),
  ]);

  const partiesArr = parties || [];
  const parties_block = partiesArr.map((p: any, i: number) => `Taraf ${i + 1} (${p.party_type === "corporate" ? "Tüzel Kişi" : "Gerçek Kişi"}):\n${partyBlock(p)}`).join("\n\n");

  const sess = sessions?.[0] as any;
  const session_date = sess?.scheduled_at ? `${fmtDate(sess.scheduled_at)} ${new Date(sess.scheduled_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}` : "";

  const fee_block = fee ? [
    `Brüt Ücret: ${(fee as any).calculated_fee ?? "-"} TL`,
    `KDV: ${(fee as any).vat_amount ?? "-"} TL`,
    `Toplam: ${(fee as any).total_fee ?? "-"} TL`,
    `Tarife: ${(fee as any).tarife_yili ?? ""} - ${(fee as any).tarife_maddesi ?? ""}`,
  ].join("\n") : "";

  const filled = fillTemplate(tpl.template_content, {
    dosya_no: caseRow.application_no || caseRow.uyap_no || "",
    buro: "",
    basvuru_tarihi: fmtDate(caseRow.application_date || caseRow.created_at),
    gorevlendirme_tarihi: fmtDate(caseRow.created_at),
    tutanak_tarihi: new Date().toLocaleDateString("tr-TR"),
    tutanak_yeri: "",
    anlasma_konusu: caseRow.issue_description || caseRow.title || "",
    anlasma_bedeli: caseRow.agreement_amount ? String(caseRow.agreement_amount) : "",
    agreement_terms: caseRow.agreement_terms || "",
    agreement_amount: caseRow.agreement_amount ? String(caseRow.agreement_amount) : "",
    parties_block,
    session_date,
    fee_block,
    mediator_name: (profile as any)?.full_name || "",
  });

  // Build UDF content.xml per the real UYAP schema: <template format_id="1.8">
  // with a single CDATA text pool (<content>) and <elements> paragraphs that
  // reference it via character offsets (NOT byte offsets — every Turkish
  // character and emoji counts as exactly 1, hence Array.from().length below).
  // Empty lines are represented by a zero-width space (U+200B) per spec.
  const rawLines = filled.split("\n");
  let pool = "";
  const paragraphElems: string[] = [];
  let offset = 0;
  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i] === "" ? "​" : rawLines[i];
    const length = Array.from(line).length;
    paragraphElems.push(`    <paragraph startOffset="${offset}" length="${length}"/>`);
    pool += line;
    offset += length;
    if (i < rawLines.length - 1) {
      pool += "\n";
      offset += 1;
    }
  }

  const udf = `<?xml version="1.0" encoding="UTF-8"?>
<template format_id="1.8">
  <content><![CDATA[${pool}]]></content>
  <properties pageWidth="595.28" pageHeight="841.89" marginTop="56.7" marginRight="56.7" marginBottom="56.7" marginLeft="56.7"/>
  <elements>
${paragraphElems.join("\n")}
  </elements>
  <styles>
    <style id="default" fontFamily="Times New Roman" size="11" color="-16777216" bold="false" italic="false"/>
  </styles>
</template>`;

  return j({
    template_type,
    filled_text: filled,
    udf_xml: udf,
    source_url: tpl.source_url,
    case: {
      application_no: caseRow.application_no,
      mediation_type: caseRow.mediation_type,
      outcome,
      dispute_type: caseRow.dispute_type,
    },
  });
});
