// TASLAK DENETİMİ — SUNUCU KOPYASI (İBA 2.6 / B21)
//
// Bu dosyadaki mantık YENİDEN YAZILMADI: src/components/mediation/TaslakDenetimi.tsx
// içindeki SAF (React'sız) bölüm BİREBİR taşındı. Sebep: edge fonksiyonları Deno'da
// koşar ve src/ altındaki modülleri içe aktaramaz; aynı kuralın iki yerde ayrı ayrı
// yazılması yerine tek kaynaktan kopyalandı. Ön yüzdeki bileşene DOKUNULMADI —
// arabulucunun elle çalıştırdığı yol aynen duruyor (constitution m.8).
//
// Bu denetim BELGEYİ DEĞİŞTİRMEZ, hukuki geçerlilik yorumu yapmaz; yalnız neyin
// belirsiz, eksik ya da çelişkili göründüğünü gösterir. Düzeltmeyi insan yapar.
// KURAL: ön yüzdeki dosya değişirse bu kopya da aynı commit'te güncellenir.

export type Bulgu = {
  tip: string;
  konum: string;
  alinti: string;
  aciklama: string;
};

const trKucuk = (s: string) => String(s ?? "").toLocaleLowerCase("tr");
// Kalip karsilastirmasi noktasiz i tuzagina takilmasin: Turkce kucultmede
// ASCII "I" harfi "ı" olur ("IMZA" -> "ımza") ve aranan "imza" kalibiyla
// eslesmez. Karsilastirmada butun "ı" harfleri "i" sayilir.
const esitle = (s: string) => trKucuk(s).replace(/ı/g, "i");

function satirNo(metin: string, indeks: number): string {
  if (indeks < 0) return "yer belirlenemedi";
  return `satır ${metin.slice(0, indeks).split("\n").length}`;
}

// Cümle sonu sayılan nokta: ardından BOŞLUK ya da metin sonu gelen nokta.
// (Binlik ayıracı "150.000" cümleyi bölmesin diye — testte alıntı "000 TL (…"
// diye kesiliyordu.)
function cumleSonuMu(metin: string, i: number): boolean {
  const c = metin[i];
  if (c === "\n") return true;
  if (c !== "." && c !== ";" && c !== "!" && c !== "?") return false;
  const sonraki = metin[i + 1];
  return sonraki === undefined || /\s/.test(sonraki);
}

// Alıntı: eşleşmenin geçtiği CÜMLE, en çok bir cümle ve 160 karakter.
function cumleAl(metin: string, indeks: number): string {
  let bas = -1;
  for (let i = Math.min(indeks - 1, metin.length - 1); i >= 0; i--) {
    if (cumleSonuMu(metin, i)) { bas = i; break; }
  }
  let son = metin.length;
  for (let i = indeks; i < metin.length; i++) {
    if (cumleSonuMu(metin, i)) { son = i; break; }
  }
  const parca = metin.slice(bas + 1, son).trim().replace(/\s+/g, " ");
  return parca.length > 160 ? `${parca.slice(0, 157)}…` : parca;
}

/* ── Türkçe sayı sözcüklerinden rakama çeviri (rakam–yazı çelişkisi için) ── */
const SAYI_SOZ: Record<string, number> = {
  sıfır: 0, bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9,
  on: 10, yirmi: 20, otuz: 30, kırk: 40, elli: 50, altmış: 60, yetmiş: 70, seksen: 80, doksan: 90,
};
const SAYI_CARPAN: Record<string, number> = { yüz: 100, bin: 1000, milyon: 1000000, milyar: 1000000000 };
const SAYI_EK = new Set(["türk", "lirası", "lira", "tl", "try", "adet", "gün", "ay", "yıl", "hafta", "ve"]);

// "yüz elli bin" → 150000. Sayı sözcüğü yoksa null döner.
function yaziyiSayiyaCevir(ifade: string): number | null {
  const parcalar = trKucuk(ifade).replace(/[^\wçğıöşü\s]/g, " ").split(/\s+/).filter(Boolean);
  let toplam = 0;
  let gecerli = 0;
  let sayiVar = false;
  for (const p of parcalar) {
    if (p in SAYI_SOZ) { gecerli += SAYI_SOZ[p]; sayiVar = true; continue; }
    if (p in SAYI_CARPAN) {
      const carpan = SAYI_CARPAN[p];
      sayiVar = true;
      if (carpan === 100) { gecerli = (gecerli || 1) * 100; continue; }
      toplam += (gecerli || 1) * carpan;
      gecerli = 0;
      continue;
    }
    if (SAYI_EK.has(p)) continue;
    return null;   // sayı sözcüğü olmayan kelime varsa bu ifade sayı yazımı değildir
  }
  if (!sayiVar) return null;
  return toplam + gecerli;
}

// "150.000,50" → 150000.5 · "150000" → 150000
function rakamiSayiyaCevir(ham: string): number | null {
  const t = ham.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/* ── Kalıplar ── */
const BELIRSIZ_TARIH = [
  "en kısa sürede", "en kısa zamanda", "ilerleyen günlerde", "ilerleyen tarihlerde",
  "yakın zamanda", "ivedilikle", "mümkün olan en kısa", "kısa süre içinde", "peyderpey",
  "en yakın zamanda", "sonraki günlerde",
];
const OLCUSUZ_IFADE = [
  "makul süre", "makul bir süre", "makul sürede", "uygun tutar", "uygun bir tutar",
  "gerekli hâllerde", "gerekli hallerde", "gerektiğinde", "münasip", "uygun görülen",
  "ihtiyaç duyulması hâlinde", "ihtiyaç duyulması halinde", "makul ölçüde",
];
const BOS_ALAN = ["...", "…", "[ ]", "[]", "xxx", "___", "……", "{{", "<<", "tbd"];
const KAPSAM_ISARETI = [
  "ilişkin", "kaynaklanan", "konusundaki", "hakkındaki", "nedeniyle", "sebebiyle",
  "işbu", "bu dosya", "bu uyuşmazlık", "yukarıda", "sayılı",
];

function tumEslesmeler(metin: string, kalip: string): number[] {
  const k = esitle(metin);
  const a = esitle(kalip);
  const yerler: number[] = [];
  let i = k.indexOf(a);
  while (i > -1 && yerler.length < 20) {
    yerler.push(i);
    i = k.indexOf(a, i + a.length);
  }
  return yerler;
}

function cumleleriAyir(metin: string): { metin: string; indeks: number }[] {
  const sonuc: { metin: string; indeks: number }[] = [];
  let bas = 0;
  for (let i = 0; i < metin.length; i++) {
    if (cumleSonuMu(metin, i)) {
      const parca = metin.slice(bas, i).trim();
      if (parca) sonuc.push({ metin: parca, indeks: bas });
      bas = i + 1;
    }
  }
  const kalan = metin.slice(bas).trim();
  if (kalan) sonuc.push({ metin: kalan, indeks: bas });
  return sonuc;
}

function taraflarinAdlari(kayitlar: any[]): string[] {
  const adlar: string[] = [];
  for (const p of kayitlar) {
    const kurumsal = String(p.company_name ?? "").trim();
    const tam = String(p.full_name ?? "").trim();
    const ikili = `${String(p.first_name ?? "").trim()} ${String(p.last_name ?? "").trim()}`.trim();
    const ad = kurumsal || tam || ikili;
    if (ad && ad.length > 2) adlar.push(ad);
  }
  return adlar;
}

export function taslagiDenetle(metin: string, partiAdlari: string[]): Bulgu[] {
  const bulgular: Bulgu[] = [];
  if (!metin || metin.trim().length === 0) return bulgular;

  // 1) Belirsiz ödeme/edim tarihi
  for (const kalip of BELIRSIZ_TARIH) {
    for (const i of tumEslesmeler(metin, kalip)) {
      bulgular.push({
        tip: "Belirsiz tarih",
        konum: satirNo(metin, i),
        alinti: cumleAl(metin, i),
        aciklama: `"${kalip}" ifadesi bir tarih vermiyor; edimin ne zaman yerine getirileceği belirsiz görünüyor.`,
      });
    }
  }

  // 2) Ölçüsüz ifade
  for (const kalip of OLCUSUZ_IFADE) {
    for (const i of tumEslesmeler(metin, kalip)) {
      bulgular.push({
        tip: "Ölçüsüz ifade",
        konum: satirNo(metin, i),
        alinti: cumleAl(metin, i),
        aciklama: `"${kalip}" ifadesi ölçü içermiyor; süre, tutar veya koşul sayısal olarak yazılmamış görünüyor.`,
      });
    }
  }

  // 3) Taraf adı / unvan tutarsızlığı — dosya kaydındaki ad belgede aranır.
  const kucukMetin = esitle(metin);
  for (const ad of partiAdlari) {
    if (kucukMetin.includes(esitle(ad))) continue;
    const sozcukler = ad.split(/\s+/).filter((s) => s.length > 2);
    const gecenParca = sozcukler.find((s) => kucukMetin.includes(esitle(s)));
    if (gecenParca) {
      const i = kucukMetin.indexOf(esitle(gecenParca));
      bulgular.push({
        tip: "Ad / unvan tutarsızlığı",
        konum: satirNo(metin, i),
        alinti: cumleAl(metin, i),
        aciklama: `Dosya kaydındaki ad "${ad}"; belgede yalnız "${gecenParca}" geçiyor, ad tam olarak aynı yazılmamış.`,
      });
    } else {
      bulgular.push({
        tip: "Ad / unvan tutarsızlığı",
        konum: "belgede bulunamadı",
        alinti: `Dosya kaydındaki ad: ${ad}`,
        aciklama: "Dosya kaydındaki taraf adı belge metninde geçmiyor.",
      });
    }
  }

  // 4) Rakam ile yazıyla yazılan tutarın çelişmesi — parantez içi yazım karşılaştırılır.
  const parantez = /\(([^()]{3,80})\)/g;
  let m: RegExpExecArray | null;
  while ((m = parantez.exec(metin)) !== null) {
    const icerik = m[1];
    const oncekiMetin = metin.slice(Math.max(0, m.index - 60), m.index);
    // Rakam parantezin HEMEN ÖNÜNDE olmalı: aradaki metinde başka sözcük varsa
    // karşılaştırma yapılmaz (uzaktaki alakasız sayıyla sahte çelişki üretilmesin).
    const bitisik = oncekiMetin.match(/(\d[\d.]*(?:,\d+)?)\s*(?:TL|TRY|₺|Türk Lirası|lira|lirası)?\s*$/i);
    const rakamlar = bitisik ? [bitisik[1]] : null;
    const yaziDeger = yaziyiSayiyaCevir(icerik);
    const icerikRakam = icerik.match(/\d[\d.]*(?:,\d+)?/g);

    if (yaziDeger !== null && rakamlar && rakamlar.length > 0) {
      const rakamDeger = rakamiSayiyaCevir(rakamlar[rakamlar.length - 1]);
      if (rakamDeger !== null && rakamDeger !== yaziDeger) {
        bulgular.push({
          tip: "Rakam–yazı çelişkisi",
          konum: satirNo(metin, m.index),
          alinti: cumleAl(metin, m.index),
          aciklama: `Rakamla ${rakamDeger.toLocaleString("tr-TR")} yazılmış, yazıyla "${icerik.trim()}" (${yaziDeger.toLocaleString("tr-TR")}) yazılmış — iki değer aynı değil.`,
        });
      }
    } else if (icerikRakam && icerikRakam.length > 0) {
      const yaziOnce = yaziyiSayiyaCevir(oncekiMetin.split(/[.,;:]/).pop() ?? "");
      const icDeger = rakamiSayiyaCevir(icerikRakam[icerikRakam.length - 1]);
      if (yaziOnce !== null && icDeger !== null && yaziOnce !== icDeger) {
        bulgular.push({
          tip: "Rakam–yazı çelişkisi",
          konum: satirNo(metin, m.index),
          alinti: cumleAl(metin, m.index),
          aciklama: `Yazıyla ${yaziOnce.toLocaleString("tr-TR")} yazılmış, parantez içinde rakamla ${icDeger.toLocaleString("tr-TR")} yazılmış — iki değer aynı değil.`,
        });
      }
    }
  }

  const cumleler = cumleleriAyir(metin);

  // 5) Feragat / ibra kapsamının belirsizliği
  for (const c of cumleler) {
    const k = esitle(c.metin);
    if (!k.includes("feragat") && !k.includes("ibra")) continue;
    const kapsamVar = KAPSAM_ISARETI.some((x) => k.includes(x));
    if (!kapsamVar) {
      bulgular.push({
        tip: "Feragat / ibra kapsamı",
        konum: satirNo(metin, c.indeks),
        alinti: cumleAl(metin, c.indeks),
        aciklama: "Feragat/ibra ifadesinin neyi kapsadığı (hangi alacak, hangi dosya, hangi dönem) cümlede yazılmamış görünüyor.",
      });
    }
  }

  // 6) Boş bırakılmış alan / doldurulmamış şablon yeri
  for (const kalip of BOS_ALAN) {
    for (const i of tumEslesmeler(metin, kalip)) {
      bulgular.push({
        tip: "Boş alan",
        konum: satirNo(metin, i),
        alinti: cumleAl(metin, i),
        aciklama: `Metinde doldurulmamış görünen yer var ("${kalip}").`,
      });
      break;   // aynı kalıp için tek satır yeter
    }
  }
  for (const i of tumEslesmeler(metin, "....")) {
    bulgular.push({
      tip: "Boş alan",
      konum: satirNo(metin, i),
      alinti: cumleAl(metin, i),
      aciklama: "Noktalarla bırakılmış boş alan görünüyor.",
    });
    break;
  }

  // 7) İmza ve tarih alanının eksikliği
  if (!kucukMetin.includes("imza")) {
    bulgular.push({
      tip: "İmza alanı",
      konum: "belge geneli",
      alinti: "—",
      aciklama: "Metinde imza alanına ilişkin bir ifade bulunmuyor.",
    });
  }
  const tarihKalibi = /\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b/;
  if (!tarihKalibi.test(metin) && !kucukMetin.includes("tarih")) {
    bulgular.push({
      tip: "Tarih alanı",
      konum: "belge geneli",
      alinti: "—",
      aciklama: "Metinde tarih alanı ya da tarih yazımı bulunmuyor.",
    });
  }

  // 8) Aynı hükmün iki yerde farklı yazılması — yüksek benzerlikli ama aynı olmayan cümleler.
  const uzunlar = cumleler.filter((c) => c.metin.split(/\s+/).length >= 6).slice(0, 120);
  const gorulen = new Set<number>();
  for (let i = 0; i < uzunlar.length; i++) {
    for (let j = i + 1; j < uzunlar.length; j++) {
      if (gorulen.has(j)) continue;
      const a = new Set(trKucuk(uzunlar[i].metin).split(/\s+/));
      const b = new Set(trKucuk(uzunlar[j].metin).split(/\s+/));
      if (trKucuk(uzunlar[i].metin) === trKucuk(uzunlar[j].metin)) continue;
      let kesisim = 0;
      a.forEach((x) => { if (b.has(x)) kesisim++; });
      const birlesim = a.size + b.size - kesisim;
      const oran = birlesim === 0 ? 0 : kesisim / birlesim;
      if (oran >= 0.7) {
        gorulen.add(j);
        bulgular.push({
          tip: "Tekrar eden hüküm",
          konum: `${satirNo(metin, uzunlar[i].indeks)} ve ${satirNo(metin, uzunlar[j].indeks)}`,
          alinti: cumleAl(metin, uzunlar[i].indeks),
          aciklama: "Aynı hüküm iki yerde birbirinden farklı yazılmış görünüyor; iki cümle büyük ölçüde aynı, sözcükleri farklı.",
        });
      }
    }
  }

  return bulgular;
}
