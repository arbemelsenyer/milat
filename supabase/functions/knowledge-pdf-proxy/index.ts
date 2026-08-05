// Bakanlık (adb.adalet.gov.tr) kitap PDF'leri tarayıcıya CORS başlığı vermiyor; pdf.js
// bu dosyaları doğrudan çekemiyor. Bu fonksiyon PDF'i sunucudan çekip uygulamaya CORS'lu
// aktarır. Hiçbir DB tablosuna dokunmaz.
//
// GÜVENLİK: açık proxy DEĞİLDİR. Yalnızca aşağıdaki sabit ön ek ile BAŞLAYAN adresler
// geçirilir; başka her adres 403 alır. Yetkilendirme config.toml'daki verify_jwt = true
// ile yapılır (oturumsuz istek gateway'de 401 alır).

const ALLOWED_PREFIX = "https://adb.adalet.gov.tr/";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, range",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
};

function text(body: string, status: number) {
  return new Response(body, { status, headers: { ...corsHeaders, "Content-Type": "text/plain; charset=utf-8" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") return text("Yalnızca GET destekleniyor.", 405);

  const target = new URL(req.url).searchParams.get("url");
  if (!target) return text("url parametresi gerekli.", 400);

  // İzin listesi: yalnız tam ön ek eşleşmesi. Şema/host oyunlarını engellemek için
  // URL çözümlenip mutlak hâli tekrar kontrol edilir.
  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return text("Geçersiz url.", 400);
  }
  if (!parsed.href.startsWith(ALLOWED_PREFIX) || parsed.protocol !== "https:" || parsed.host !== "adb.adalet.gov.tr") {
    return text("Bu adres izin listesinde değil.", 403);
  }

  // Range başlığı hedefe AYNEN iletilir; hedef Accept-Ranges: bytes desteklediği için
  // 4 MB'lık kitaplar komple indirilmeden pdf.js parça parça okuyabilir.
  const fwd: Record<string, string> = {};
  const range = req.headers.get("range");
  if (range) fwd["Range"] = range;

  let upstream: Response;
  try {
    upstream = await fetch(parsed.href, { headers: fwd, redirect: "follow" });
  } catch (e: any) {
    return text(`Kaynağa ulaşılamadı: ${e?.message ?? String(e)}`, 502);
  }
  if (!upstream.ok && upstream.status !== 206) {
    return text(`Kaynak ${upstream.status} döndü.`, 502);
  }

  const out = new Headers(corsHeaders);
  out.set("Content-Type", "application/pdf");
  for (const h of ["Content-Length", "Content-Range", "Accept-Ranges", "Last-Modified", "ETag"]) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }
  out.set("Cache-Control", "private, max-age=300");

  // Durum kodu aynen geçirilir (206 Partial Content dâhil).
  return new Response(upstream.body, { status: upstream.status, headers: out });
});
