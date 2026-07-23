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

// admin-upload-template'in TEMPLATE_GROUPS kümesiyle birebir aynı 6 grup.
type TemplateGroup = "ihtiyari" | "isci_isveren" | "ticari" | "tuketici" | "kira" | "ortaklik";

/** Uyuşmazlık türü anahtar kelimelerini admin-upload-template/detectTemplateType()'ın
 * tanıdığı gruplara indirger — o fonksiyondaki İŞÇİ/TİCARİ/TÜKETİCİ/KİRA/ORTAKLIK
 * anahtar kelimeleriyle birebir tutarlı olmalı. */
function disputeGroup(dt: string): TemplateGroup | null {
  if (["isci", "isci_isveren", "iş", "işçi", "işveren", "labor", "employment"].some((k) => dt.includes(k))) return "isci_isveren";
  if (["ticari", "commercial", "inşaat", "insaat", "bankacılık", "bankacilik", "sigorta", "fikri"].some((k) => dt.includes(k))) return "ticari";
  if (["tüketici", "tuketici", "consumer", "sağlık", "saglik"].some((k) => dt.includes(k))) return "tuketici";
  if (["kira", "gayrimenkul", "rent", "real_estate", "realestate"].some((k) => dt.includes(k))) return "kira";
  if (["ortaklik", "ortaklık", "partnership", "şirket", "sirket"].some((k) => dt.includes(k))) return "ortaklik";
  return null;
}

function uniq(arr: string[]): string[] {
  return [...new Set(arr)];
}

/**
 * Map (mediation_type, outcome, disputeType, kind) → ordered template_type fallback chain.
 * İlk eleman en özel (uyuşmazlık türüne göre) şablon adayı, son eleman her zaman
 * document_templates'te seed edilmiş garanti jenerik Bakanlık şablonudur. Hangi adayın
 * kullanılacağı (aktif + dolu olan ilki) çağıran tarafta DB'ye bakılarak belirlenir —
 * seçim tamamen deterministiktir, AI'ye bırakılmaz.
 *
 * Hukuki hiyerarşi iki ayrı koldur ve BİRBİRİNE ASLA KARIŞMAZ:
 * - "ihtiyari" (mediation_type="ihtiyari"): uyuşmazlık grubu kavramı yok, tamamen
 *   jenerik ihtiyari_* şablonları kullanılır (dispute_type'tan türetilen grup bu kolda
 *   hiçbir zaman dikkate alınmaz).
 * - "dava_sarti" (mediation_type="dava_sarti"): işçi-işveren/ticari/tüketici/kira/ortaklık
 *   bu kolun ALT TÜRLERİDİR — önce {grup}_* tür-özel aday, bulunamazsa jenerik
 *   dava_sarti_* şablonuna düşülür. Bu kolda ihtiyari_* şablonlarına asla düşülmez.
 *
 * admin-upload-template artık iki tür isim üretiyor: (a) sabit legacy adlar
 * (isci_isveren_anlasma, dava_sarti_ilk_oturum, ihtiyari_davet vb.) ve (b) dinamik
 * "{grup}_{belge_tipi}" deseni (ör. isci_isveren_anlasma_son_tutanak). Aday listesi
 * önce yeni deseni, sonra legacy grup-özel adı, en sonda jenerik/dava_sarti fallback'i
 * dener — bu sıralamayla hem yeni yüklenen tür-özel şablonlar hem de eski Bakanlık
 * şablonları kesintisiz çalışır.
 */
function selectTemplateCandidates(opts: {
  mediation_type?: string | null;
  outcome?: string | null;
  dispute_type?: string | null;
  kind: "son_tutanak" | "davet" | "ilk_oturum" | "anlasma_belgesi";
  variant?: string | null;
}): string[] {
  const { mediation_type, outcome, dispute_type, kind, variant } = opts;
  const dt = (dispute_type || "").toLowerCase();
  const isIhtiyari = mediation_type === "ihtiyari";
  // İhtiyari kolunda grup kavramı yok — dispute_type'tan türetilen grup yalnızca
  // dava_sarti kolunda (5 alt tür) kullanılır, ihtiyari'de her zaman görmezden gelinir.
  const group = isIhtiyari ? null : disputeGroup(dt);

  // anlasma_belgesi (m.18): şartların tam metnini içeren ayrı belge — son_tutanak (m.17)
  // zincirinden TAMAMEN bağımsız. Jenerik dava_sarti/ihtiyari fallback'i BİLEREK yok:
  // tür-özel anlaşma belgesi şablonu yüklenmemişse 424 dönmeli, asla son_tutanak
  // şablonuna sessizce düşmemeli (iki belge birbirinin yerine geçemez).
  if (kind === "anlasma_belgesi") {
    if (isIhtiyari) return ["ihtiyari_anlasma_belgesi"];
    const candidates: string[] = [];
    if (variant && group) candidates.push(`${group}_${variant}_anlasma_belgesi`);
    if (group) candidates.push(`${group}_anlasma_belgesi`);
    return uniq(candidates);
  }

  if (kind === "davet") {
    if (isIhtiyari) return ["ihtiyari_davet"];
    // {grup}_davet yeni deseni, isci_isveren/ticari/tuketici için zaten legacy adla
    // birebir örtüşür; kira/ortaklik için admin-upload-template'in kabul ettiği yeni
    // grup-özel adlardır. Bulunamazsa jenerik dava_sarti_davet'e düşülür.
    return uniq([...(group ? [`${group}_davet`] : []), "dava_sarti_davet"]);
  }

  if (kind === "ilk_oturum") {
    if (isIhtiyari) return ["ihtiyari_ilk_oturum"];
    // Legacy: sadece isci_isveren_ilk_oturum / ticari_ilk_oturum tanınıyordu.
    // Yeni desenle diğer gruplar (tuketici/kira/ortaklik) için de {grup}_ilk_oturum
    // denenir, ardından jenerik dava_sarti_ilk_oturum'a düşülür.
    return uniq([...(group ? [`${group}_ilk_oturum`] : []), "dava_sarti_ilk_oturum"]);
  }

  // son_tutanak
  const agreed = outcome === "anlasma";
  const genericType = isIhtiyari
    ? (agreed ? "ihtiyari_anlasma" : "ihtiyari_anlasamamama")
    : (agreed ? "dava_sarti_anlasma" : "dava_sarti_anlasamamama");

  // İhtiyari kolunda da yeni "{grup}_{belge_tipi}" deseniyle tutarlı olması için önce
  // ihtiyari_{anlasma,anlasamama}_son_tutanak denenir, bulunamazsa legacy jenerik ada düşülür.
  if (isIhtiyari) {
    return agreed
      ? ["ihtiyari_anlasma_son_tutanak", "ihtiyari_anlasma"]
      : ["ihtiyari_anlasamama_son_tutanak", "ihtiyari_anlasamamama"];
  }

  const candidates: string[] = [];

  // 0) Varyant desteği: dava sonucunun özel bir alt türü belirtilmişse (ör. "ise_iade",
  // "nisbi"), grup-özel varyant şablonu listenin en başına eklenir. anlasma_belgesi
  // adayı BİLEREK burada yok — son_tutanak (m.17) zinciri anlaşma belgesi (m.18)
  // şablonunu asla döndürmemeli, iki tür karışmamalı.
  if (variant && group) {
    candidates.push(`${group}_${variant}_anlasma_son_tutanak`);
  }

  // 1) Yeni desen: {grup}_anlasma_son_tutanak / {grup}_anlasamama_son_tutanak.
  // group null ise (dava_sarti ama 5 alt türden hiçbirine uymuyor) bu adım atlanır —
  // o durumda doğrudan jenerik dava_sarti_* şablonuna düşülür.
  if (group) candidates.push(agreed ? `${group}_anlasma_son_tutanak` : `${group}_anlasamama_son_tutanak`);

  // 2) Legacy grup-özel adlar (admin-upload-template/detectTemplateType()'ın tanıdığı):
  // isci_isveren_{anlasma,anlasamamama}, ticari_{anlasma,anlasamamama},
  // tuketici_{anlasma,anlasamama}, kira_{anlasma,anlasamamama}, ortaklik_{anlasma,anlasamamama}.
  let legacySpecific: string | null = null;
  if (group === "isci_isveren") legacySpecific = agreed ? "isci_isveren_anlasma" : "isci_isveren_anlasamamama";
  else if (group === "ticari") legacySpecific = agreed ? "ticari_anlasma" : "ticari_anlasamamama";
  else if (group === "tuketici") legacySpecific = agreed ? "tuketici_anlasma" : "tuketici_anlasamama";
  else if (group === "kira") legacySpecific = agreed ? "kira_anlasma" : "kira_anlasamamama";
  else if (group === "ortaklik") legacySpecific = agreed ? "ortaklik_anlasma" : "ortaklik_anlasamamama";
  if (legacySpecific) candidates.push(legacySpecific);

  // 3) Jenerik dava_sarti fallback — her zaman garanti seed'lenmiş.
  candidates.push(genericType);

  return uniq(candidates);
}

function fmtDate(d?: string | null): string {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("tr-TR");
  } catch {
    return "";
  }
}

function partyRoleLabel(r?: string | null): string {
  // MediationEngine.tsx'teki roleLabel() ile birebir aynı sözleşme.
  if (r === "applicant") return "Başvurucu";
  if (r === "respondent") return "Karşı Taraf";
  if (r === "third_party") return "Üçüncü Taraf";
  return "";
}

function partyBlock(p: any): string {
  const isCorp = p.party_type === "corporate";
  const name = isCorp ? p.company_name || "-" : `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "-";
  const lines = [
    isCorp ? `Unvanı: ${name}` : `Adı ve Soyadı: ${name}`,
    isCorp ? `Vergi Kimlik Numarası: ${p.tax_number ?? "-"}` : `T.C. Kimlik Numarası: ${p.tc_kimlik ?? "-"}`,
    `Adresi: ${p.address ?? "-"}`,
    `Telefon: ${p.phone ?? "-"}`,
    `E-posta: ${p.email ?? "-"}`,
  ];
  // Sadece dolu olanlar basılır — boş "Vergi Dairesi: —" satırı üretilmez.
  if (p.authorized_person) lines.push(`Yetkili: ${p.authorized_person}`);
  if (p.tax_office) lines.push(`Vergi Dairesi: ${p.tax_office}`);
  if (p.trade_registry_no) lines.push(`Ticaret Sicil No: ${p.trade_registry_no}`);
  if (p.vekil_ad_soyad) {
    const vekilDetails = [
      p.vekil_baro ? `Baro: ${p.vekil_baro}` : null,
      p.vekil_sicil_no ? `Sicil No: ${p.vekil_sicil_no}` : null,
    ].filter(Boolean).join(", ");
    lines.push(`Vekili: ${p.vekil_ad_soyad}${vekilDetails ? ` (${vekilDetails})` : ""}`);
  }
  return lines.join("\n");
}

/** Very simple placeholder-fill: replaces common patterns like ……, ___, blank-after-colon rows. */
function fillTemplate(content: string, data: Record<string, string>, kind?: string): string {
  let out = content;

  // Row-based replacement: for known labels ending with ":" replace value.
  const rowMap: Record<string, string> = {
    // "Büro Dosya Numarası" bu büronun kendi iç dosya no'su (case_process_tracker.arb_no) —
    // "Arabuluculuk Dosya Numarası" (UYAP/Bakanlık düzeyi application_no/uyap_no) ile karıştırılmaz.
    "Büro Dosya Numarası": data.arb_no,
    "Arabuluculuk Dosya Numarası": data.dosya_no,
    "Arabuluculuk Bürosu": data.buro_no,
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
  // 6325 s. Kanun m.17/m.18 ayrımı: son tutanak (m.17) yalnızca anlaşmanın varlığını
  // usuli olarak bildirir, şart metnini içermez — o yüzden {{anlasma_ozeti}} burada
  // nötr bir ifadeye çözülür, gerçek şartlara asla dönmez (bkz. aşağıdaki ek bloğu).
  out = out.replace(
    /{{anlasma_ozeti}}/g,
    kind === "anlasma_belgesi" ? data.agreement_terms || "" : data.outcome === "anlasma" ? "Taraflar aralarında anlaşmışlardır." : ""
  );

  // Append parties + agreement info as an appendix
  if (data.parties_block) out += `\n\n--- TARAFLAR ---\n${data.parties_block}\n`;
  // Anlaşma şartlarının tam metni YALNIZCA m.18 "Anlaşma Belgesi"ne eklenir — m.17 son
  // tutanak, davet ve ilk oturum belgeleri bu metni asla içermemelidir (gizlilik).
  if (kind === "anlasma_belgesi" && data.agreement_terms) out += `\n--- ANLAŞMA ŞARTLARI ---\n${data.agreement_terms}\n`;
  if (data.agreement_amount) out += `\nAnlaşma Bedeli: ${data.agreement_amount} TL\n`;
  if (data.session_date) out += `\nToplantı Tarihi: ${data.session_date}\n`;
  if (data.fee_block) out += `\n--- ÜCRET BİLGİSİ ---\n${data.fee_block}\n`;
  if (data.mediator_name) out += `\n--- ARABULUCU ---\nArabulucu Adı: ${data.mediator_name}\nSicil No: [Arabulucu dolduracak]\nBüro: [Arabulucu dolduracak]\n`;
  if (data.closed_at) out += `\nSürecin Bitiş Tarihi: ${data.closed_at}\n`;
  if (data.dava_sarti_son_tarih) out += `\nDava Şartı Süreç Son Tarihi: ${data.dava_sarti_son_tarih}\n`;

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
  const { case_id, kind, outcome_override, template_type: explicitTemplateType, variant: requestedVariant } = body || {};
  const requestedTemplateType = typeof explicitTemplateType === "string" ? explicitTemplateType.trim() : "";
  const variant = typeof requestedVariant === "string" && requestedVariant.trim() ? requestedVariant.trim() : null;
  if (!case_id) return j({ error: "case_id required" }, 400);
  // template_type doğrudan verildiyse kind zorunlu değildir — aday listesi hesaplanmadan
  // istenen tür doğrudan (aktifse) kullanılır. Bu, frontend'in ileride yeni belge tiplerini
  // (müracaat tutanağı, yetki belgesi vb.) doğrudan istemesinin yoludur.
  if (!requestedTemplateType) {
    if (!kind) return j({ error: "case_id and kind required" }, 400);
    if (!["son_tutanak", "davet", "ilk_oturum", "anlasma_belgesi"].includes(kind)) return j({ error: "invalid kind" }, 400);
  }

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
  const candidates = requestedTemplateType
    ? [requestedTemplateType]
    : selectTemplateCandidates({
        mediation_type: caseRow.mediation_type,
        outcome,
        dispute_type: caseRow.dispute_type,
        kind: kind as any,
        variant,
      });

  // Deterministik seçim: aday listesi en özelden en jeneriğe sıralıdır. İlk AKTİF ve
  // dolu şablon kullanılır — tür-özel şablon yüklenmemiş/pasifse hata vermeden
  // sessizce jenerik Bakanlık şablonuna düşülür.
  const { data: tplRows } = await admin
    .from("document_templates")
    .select("template_type, template_content, source_url, is_active")
    .in("template_type", candidates);
  const byType = new Map((tplRows || []).map((r: any) => [r.template_type, r]));

  let template_type = candidates[candidates.length - 1] ?? kind;
  let tpl: { template_content: string; source_url: string | null } | null = null;
  for (const c of candidates) {
    const row = byType.get(c);
    if (row?.is_active && row.template_content) {
      template_type = c;
      tpl = row;
      break;
    }
  }

  if (!tpl) {
    return j({
      error: "template_missing",
      template_type,
      message: `'${template_type}' şablonu henüz yüklenmemiş. Admin panelinden 'Şablonları Bakanlıktan Güncelle' butonuna tıklayın.`,
    }, 424);
  }

  const [{ data: parties }, { data: sessions }, { data: fee }, { data: profile }, { data: tracker }] = await Promise.all([
    admin.from("case_parties").select("*").eq("case_id", case_id),
    admin.from("case_sessions").select("*").eq("case_id", case_id).order("scheduled_at", { ascending: true }).limit(1),
    admin.from("case_fees").select("*").eq("case_id", case_id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    caseRow.assigned_mediator_id
      ? admin.from("profiles").select("full_name").eq("user_id", caseRow.assigned_mediator_id).maybeSingle()
      : Promise.resolve({ data: null } as any),
    admin.from("case_process_tracker").select("buro_no, arb_no").eq("case_id", case_id).maybeSingle(),
  ]);

  const partiesArr = parties || [];
  const parties_block = partiesArr.map((p: any, i: number) => {
    const typeLabel = p.party_type === "corporate" ? "Tüzel Kişi" : "Gerçek Kişi";
    const role = partyRoleLabel(p.party_role);
    const header = role ? `Taraf ${i + 1} (${typeLabel}, ${role}):` : `Taraf ${i + 1} (${typeLabel}):`;
    return `${header}\n${partyBlock(p)}`;
  }).join("\n\n");

  const sess = sessions?.[0] as any;
  const session_date = sess?.scheduled_at ? `${fmtDate(sess.scheduled_at)} ${new Date(sess.scheduled_at).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}` : "";

  const fee_block = fee ? [
    `Brüt Ücret: ${(fee as any).calculated_fee ?? "-"} TL`,
    `KDV: ${(fee as any).vat_amount ?? "-"} TL`,
    `Toplam: ${(fee as any).total_fee ?? "-"} TL`,
    `Tarife: ${(fee as any).tarife_yili ?? ""} - ${(fee as any).tarife_maddesi ?? ""}`,
  ].join("\n") : "";

  // Dava şartı yasal son tarih: uzatılmışsa deadline_extended, yoksa deadline_total.
  // Sadece dava_sarti kolunda basılır — ihtiyari'de yasal süre kavramı yok.
  const davaSartiSonTarih = caseRow.mediation_type === "dava_sarti"
    ? fmtDate(caseRow.deadline_extended || caseRow.deadline_total)
    : "";

  const filled = fillTemplate(tpl.template_content, {
    dosya_no: caseRow.application_no || caseRow.uyap_no || "",
    buro_no: (tracker as any)?.buro_no || "",
    arb_no: (tracker as any)?.arb_no || "",
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
    outcome: outcome || "",
    closed_at: fmtDate(caseRow.closed_at),
    dava_sarti_son_tarih: davaSartiSonTarih,
  }, kind);

  // Build UDF content.xml per the real UYAP schema: <template format_id="1.8">
  // with a single CDATA text pool (<content>) and <elements> paragraphs whose
  // <content startOffset length/> children reference it via character offsets
  // (NOT byte offsets — every Turkish character counts as exactly 1, hence
  // Array.from().length below). Runs are contiguous: every character in the
  // pool, including the "\n" line separators, belongs to exactly one run —
  // verified against a real UYAP-exported .udf sample. A blank line is just
  // a paragraph whose sole run is the "\n" itself; no placeholder character.
  const rawLines = filled.split("\n");
  let pool = "";
  const paragraphElems: string[] = [];
  let offset = 0;
  for (let i = 0; i < rawLines.length; i++) {
    const hasNext = i < rawLines.length - 1;
    const text = hasNext ? rawLines[i] + "\n" : rawLines[i];
    const length = Array.from(text).length;
    if (length === 0) continue;
    paragraphElems.push(`    <paragraph><content startOffset="${offset}" length="${length}"/></paragraph>`);
    pool += text;
    offset += length;
  }

  const udf = `<?xml version="1.0" encoding="UTF-8"?>
<template format_id="1.8">
  <content><![CDATA[${pool}]]></content>
  <properties><pageFormat mediaSizeName="1" leftMargin="70.875" rightMargin="70.875" topMargin="70.875" bottomMargin="70.875" paperOrientation="1" headerFOffset="20.0" footerFOffset="20.0" /></properties>
  <elements resolver="hvl-default">
${paragraphElems.join("\n")}
  </elements>
  <styles>
    <style name="default" description="Geçerli" family="Dialog" size="12" bold="false" italic="false" foreground="-13421773" FONT_ATTRIBUTE_KEY="javax.swing.plaf.FontUIResource[family=Dialog,name=Dialog,style=plain,size=12]" />
    <style name="hvl-default" family="Times New Roman" size="12" description="Gövde" />
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
