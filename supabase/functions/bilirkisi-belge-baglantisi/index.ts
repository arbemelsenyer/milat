// BİLİRKİŞİ BELGE BAĞLANTISI — kısa ömürlü imzalı bağlantı
//
// Kapı BİLİRKİŞİNİN KENDİ OTURUMUDUR. Depolama politikası DEĞİŞTİRİLMEZ; bu
// fonksiyon hizmet anahtarıyla yalnız izin verilmiş TEK belge için imzalı bir
// bağlantı üretir ve bağlantı 5 dakika sonra ölür.
//
// ÜÇ KAPI birden aranır (üçü de sorguda, ekranda değil):
//   1. İstek sahibi, experts.user_id üzerinden bir bilirkişi kaydına bağlı mı,
//   2. O bilirkişi bu dosyada görevi KABUL ETMİŞ mi (durum='kabul'),
//   3. İstenen belge, bu bilirkişi için ONAYLANMIŞ evrak kümesinde mi
//      (bilirkisi_evrak_kumesi.onaylandi = true).
// Üçünden biri tutmazsa bağlantı üretilmez. Dosya kapandıysa erişim kesilir.
//
// Anahtarlar loglanmaz; üretilen bağlantı da konsola yazılmaz.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const KOVA = "case-documents";
const OMUR_SANIYE = 300; // 5 dakika

// Arşiv ekranındaki liste ile aynı (src/pages/Archive.tsx:29).
const KAPALI_DURUMLAR = ["completed", "resolved", "closed", "archived"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Oturum doğrulanamadı" }, 401);
    const { data: userRes } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    const kullanici = userRes?.user;
    if (!kullanici) return json({ error: "Oturum doğrulanamadı" }, 401);

    const govde = await req.json().catch(() => ({}));
    const document_id = typeof (govde as any)?.document_id === "string"
      ? (govde as any).document_id.trim() : "";
    if (!document_id) return json({ error: "document_id gerekli" }, 400);

    // 1. KAPI — istek sahibi bir bilirkişi kaydına bağlı mı
    const { data: ben } = await admin.from("experts")
      .select("id").eq("user_id", kullanici.id).maybeSingle();
    if (!ben) return json({ error: "Bilirkişi kaydınız bulunamadı" }, 403);
    const expertId = String((ben as any).id);

    // 3. KAPI — belge, bu bilirkişi için ONAYLANMIŞ kümede mi
    const { data: kumeSatiri } = await admin.from("bilirkisi_evrak_kumesi")
      .select("case_id, document_id, onaylandi")
      .eq("expert_id", expertId).eq("document_id", document_id)
      .eq("onaylandi", true).maybeSingle();
    if (!kumeSatiri) return json({ error: "Bu belge size açılmadı" }, 403);
    const caseId = String((kumeSatiri as any).case_id);

    // 2. KAPI — görevi kabul etmiş mi
    const { data: gorev } = await admin.from("bilirkisi_onerileri")
      .select("id, durum").eq("case_id", caseId).eq("expert_id", expertId)
      .eq("durum", "kabul").limit(1).maybeSingle();
    if (!gorev) return json({ error: "Görevi kabul etmeden belge açılmaz" }, 403);

    // Kapanış kapısı
    const { data: dosya } = await admin.from("cases")
      .select("id, status, closed_at").eq("id", caseId).maybeSingle();
    if (!dosya) return json({ error: "Dosya bulunamadı" }, 404);
    if ((dosya as any).closed_at || KAPALI_DURUMLAR.includes(String((dosya as any).status ?? ""))) {
      return json({ error: "Dosya kapandı; erişiminiz sona erdi" }, 403);
    }

    const { data: belge } = await admin.from("case_documents")
      .select("id, file_path, file_name").eq("id", document_id).eq("case_id", caseId).maybeSingle();
    if (!belge || !(belge as any).file_path) return json({ error: "Belge bulunamadı" }, 404);

    const { data: imzali, error: sErr } = await admin.storage
      .from(KOVA).createSignedUrl(String((belge as any).file_path), OMUR_SANIYE);
    if (sErr || !imzali?.signedUrl) {
      return json({ error: `Bağlantı üretilemedi: ${sErr?.message ?? "bilinmeyen sebep"}` }, 500);
    }

    // Denetim izi: eylemin özeti yazılır, belge İÇERİĞİ ve bağlantı yazılmaz.
    await admin.from("expert_assignment_logs").insert({
      case_id: caseId, expert_id: expertId, actor_id: kullanici.id, actor_role: "expert",
      action: "document_opened",
      details: { document_id, file_name: (belge as any).file_name ?? null },
    });

    return json({
      ok: true,
      url: imzali.signedUrl,
      file_name: (belge as any).file_name ?? null,
      omur_saniye: OMUR_SANIYE,
    });
  } catch (e: any) {
    const mesaj = String(e?.message ?? e).slice(0, 300);
    console.error("[bilirkisi-belge-baglantisi] hata", mesaj);
    return json({ error: mesaj }, 500);
  }
});
