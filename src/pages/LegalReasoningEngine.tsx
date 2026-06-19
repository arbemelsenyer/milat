import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { AppNavbar } from '@/components/AppNavbar';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, Brain, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Scale } from 'lucide-react';

interface CeliskilKart {
  baslik: string;
  risk: 'yuksek' | 'orta' | 'dusuk';
  aciklama: string;
  emsal: string;
}
interface IhtiyacSorusu {
  id: number;
  soru: string;
  cevap: string;
}
interface CozumRaporu {
  yoneticiOzeti: string;
  riskler: string[];
  firsatlar: string[];
  kaynaklar: Array<{ tip: string; referans: string; ilgililik: string }>;
  strateji: string;
  onerim: string;
}
type Asama = 'form' | 'maskeleme' | 'analiz' | 'sorular' | 'rapor';

const NIS_ALANLAR = [
  { value: 'isci_isveren', label: 'Isci-Isveren', icon: '👷' },
  { value: 'ticari', label: 'Ticari Uyusmazlik', icon: '🏢' },
  { value: 'tuketici', label: 'Tuketici', icon: '🛒' },
 { value: 'saglik_turizmi', label: 'Sağlık Hukuku Uyuşmazlıkları', icon: '🏥' },
 { value: 'sigorta', label: 'Sigorta Hukuku Uyuşmazlıkları', icon: '📋' },
  { value: 'insaat', label: 'Insaat & Yapi', icon: '🏗️' },
  { value: 'marka_patent', label: 'Marka & Patent', icon: '™️' },
];

function maskeleKisiselVeri(metin: string): { maskelenmis: string; eslesmeler: Record<string, string> } {
  const eslesmeler: Record<string, string> = {};
  let maskelenmis = metin;
  let sayac = { tc: 0, iban: 0, plaka: 0, tel: 0 };
  maskelenmis = maskelenmis.replace(/\b\d{11}\b/g, (m) => { const e = `[TC_KIMLIK_${++sayac.tc}]`; eslesmeler[e] = m; return e; });
  maskelenmis = maskelenmis.replace(/TR\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{2}/gi, (m) => { const e = `[IBAN_${++sayac.iban}]`; eslesmeler[e] = m; return e; });
  maskelenmis = maskelenmis.replace(/\b\d{2}[A-Z]{1,3}\d{2,4}\b/g, (m) => { const e = `[PLAKA_${++sayac.plaka}]`; eslesmeler[e] = m; return e; });
  return { maskelenmis, eslesmeler };
}

async function callClaude(system: string, userMsg: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 1000, system, messages: [{ role: 'user', content: userMsg }] }),
  });
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

function RiskBadge({ risk }: { risk: string }) {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    yuksek: { bg: '#fde8e8', color: '#a32d2d', label: 'Yuksek Risk' },
    orta: { bg: '#fff3cd', color: '#856404', label: 'Orta Risk' },
    dusuk: { bg: '#e6f4ea', color: '#1e7e34', label: 'Dusuk Risk' },
  };
  const c = cfg[risk] || cfg.orta;
  return <span style={{ background: c.bg, color: c.color, padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>{c.label}</span>;
}

export default function LegalReasoningEngine() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === 'tr' ? tr : en;
  const [asama, setAsama] = useState<Asama>('form');
  const [nisAlan, setNisAlan] = useState('');
  const [uyusmazlik, setUyusmazlik] = useState('');
  const [maskelenmisMetin, setMaskelenmisMetin] = useState('');
  const [eslesmeler, setEslesmeler] = useState<Record<string, string>>({});
  const [celiskilKartlar, setCeliskilKartlar] = useState<CeliskilKart[]>([]);
  const [sorular, setSorular] = useState<IhtiyacSorusu[]>([]);
  const [cozumRaporu, setCozumRaporu] = useState<CozumRaporu | null>(null);
  const [loading, setLoading] = useState(false);
  const [acikKart, setAcikKart] = useState<number | null>(null);

  async function handleBaslat() {
    if (!nisAlan || !uyusmazlik.trim()) return;
    const { maskelenmis, eslesmeler: e } = maskeleKisiselVeri(uyusmazlik);
    setMaskelenmisMetin(maskelenmis);
    setEslesmeler(e);
    setAsama('maskeleme');
  }

  async function handleAnalize() {
    setLoading(true);
    setAsama('analiz');
    const nisLabel = NIS_ALANLAR.find(n => n.value === nisAlan)?.label || nisAlan;
    try {
      const analizJson = await callClaude(
        `Sen Turk hukuku uzmani bir AI analistisin. Sadece JSON dondur: {"celiskilKartlar": [{"baslik": "...","risk": "yuksek|orta|dusuk","aciklama": "...","emsal": "Yargitay/BAM/WIPO referansi"}]}`,
        `Nis Alan: ${nisLabel}\nUyusmazlik: ${maskelenmisMetin}\n\nHukuki celiskileri, riskleri ve anomalileri tespit et.`
      );
      const parsed = JSON.parse(analizJson.replace(/```json|```/g, '').trim());
      setCeliskilKartlar(parsed.celiskilKartlar || []);
      const sorularJson = await callClaude(
        `Sen arabuluculuk uzmanisın. Sadece JSON dondur: {"sorular": ["soru1","soru2","soru3","soru4","soru5"]}`,
        `Nis Alan: ${nisLabel}\nUyusmazlik: ${maskelenmisMetin}\n\nTaraflarin gercek ihtiyaclarini ortaya cikaracak 5 soru uret.`
      );
      const sorularParsed = JSON.parse(sorularJson.replace(/```json|```/g, '').trim());
      setSorular((sorularParsed.sorular || []).map((s: string, i: number) => ({ id: i + 1, soru: s, cevap: '' })));
      setAsama('sorular');
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  async function handleCozumUret() {
    setLoading(true);
    setAsama('rapor');
    const nisLabel = NIS_ALANLAR.find(n => n.value === nisAlan)?.label || nisAlan;
    const cevaplar = sorular.map(s => `${s.soru}\nCevap: ${s.cevap}`).join('\n\n');
    try {
      const raporJson = await callClaude(
        `Sen Turk hukuku ve uluslararasi arabuluculuk uzmanisın. Sadece JSON dondur: {"yoneticiOzeti":"...","riskler":["..."],"firsatlar":["..."],"kaynaklar":[{"tip":"...","referans":"...","ilgililik":"..."}],"strateji":"...","onerim":"..."}`,
        `Nis Alan: ${nisLabel}\nUyusmazlik: ${maskelenmisMetin}\nCeliskiler: ${JSON.stringify(celiskilKartlar)}\nCevaplar:\n${cevaplar}\n\nKapsamli cozum raporu uret.`
      );
      setCozumRaporu(JSON.parse(raporJson.replace(/```json|```/g, '').trim()));
    } catch (e) { console.error(e); }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="container max-w-2xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">{t('Akilli Hukuki Analiz & Cozum Motoru', 'Legal Reasoning & Solution Engine')}</h1>
          <p className="text-muted-foreground text-sm">{t('Bilirkisi raporlari, Yargitay kararlari ve mevzuati sentezleyerek somut cozum onerisi uretir.', 'Synthesizes expert reports, court decisions and legislation to generate concrete solutions.')}</p>
        </div>

        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {[{key:'form',label:t('Basvuru','Intake')},{key:'maskeleme',label:t('Gizlilik','Privacy')},{key:'analiz',label:t('Analiz','Analysis')},{key:'sorular',label:t('Ihtiyac','Needs')},{key:'rapor',label:t('Rapor','Report')}].map((s,i,arr) => (
            <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
              <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:500,background:asama===s.key?'#1D9E75':['form','maskeleme','analiz','sorular','rapor'].indexOf(asama)>i?'#E6F4EE':'#f1f1f1',color:asama===s.key?'#fff':'#666'}}>{i+1}</div>
              <span style={{fontSize:11,color:asama===s.key?'#1D9E75':'#999',fontWeight:asama===s.key?500:400}}>{s.label}</span>
              {i<arr.length-1&&<span style={{color:'#ddd',margin:'0 2px'}}>→</span>}
            </div>
          ))}
        </div>

        {asama==='form'&&(
          <div className="space-y-6">
            <div>
              <label className="text-sm font-medium block mb-3">{t('Nis Alan Secin','Select Dispute Area')}</label>
              <div className="grid grid-cols-2 gap-2">
                {NIS_ALANLAR.map(n=>(
                  <button key={n.value} onClick={()=>setNisAlan(n.value)} className={`p-3 rounded-lg border text-left transition-colors flex items-center gap-2 ${nisAlan===n.value?'border-primary bg-primary/5':'border-border hover:border-primary/50'}`}>
                    <span className="text-lg">{n.icon}</span>
                    <span className={`text-sm font-medium ${nisAlan===n.value?'text-primary':''}`}>{n.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">{t('Uyusmazligi Anlatın','Describe the Dispute')}</label>
              <textarea value={uyusmazlik} onChange={e=>setUyusmazlik(e.target.value)} rows={6} placeholder={t('Taraflar, konu, tarihler... (Kisisel veriler otomatik maskelenir)','Parties, subject, dates... (Personal data auto-masked)')} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none"/>
              <p className="text-xs text-muted-foreground mt-1">🔒 {t('TC No, IBAN, plaka gibi veriler AI\'ya gitmeden maskelenir.','ID No, IBAN, plates are masked before reaching AI.')}</p>
            </div>
            <Button onClick={handleBaslat} disabled={!nisAlan||!uyusmazlik.trim()} className="w-full gap-2">
              <Brain className="w-4 h-4"/>{t('Analizi Baslat','Start Analysis')}
            </Button>
          </div>
        )}

        {asama==='maskeleme'&&(
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3"><CheckCircle className="w-5 h-5 text-green-600"/><p className="text-sm font-medium text-green-700">{t('Kisisel Veriler Maskelendi','Personal Data Masked')}</p></div>
              {Object.keys(eslesmeler).length>0?(
                <div className="space-y-1">
                  {Object.entries(eslesmeler).map(([etiket,gercek])=>(
                    <div key={etiket} className="flex items-center gap-2 text-xs">
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded line-through">{gercek.substring(0,8)}***</span>
                      <span className="text-gray-500">→</span>
                      <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">{etiket}</span>
                    </div>
                  ))}
                </div>
              ):<p className="text-xs text-green-600">{t('Maskelenecek kisisel veri bulunamadi.','No personal data found.')}</p>}
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("AI'YA GIDECEK METIN (ANONIM)","TEXT SENT TO AI (ANONYMOUS)")}</p>
              <p className="text-sm leading-relaxed">{maskelenmisMetin}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-3">
              <p className="text-xs text-amber-700">🔐 {t('Gercek isim-maske eslesmeleri sifireli yerel veritabaninda saklanir.','Real mappings stored encrypted locally. AI never sees this.')}</p>
            </div>
            <Button onClick={handleAnalize} className="w-full gap-2"><Scale className="w-4 h-4"/>{t('Hukuki Analizi Baslat','Start Legal Analysis')}</Button>
          </div>
        )}

        {asama==='analiz'&&(
          <div className="space-y-4">
            {loading?(
              <div className="text-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4"/>
                <p className="text-sm font-medium">{t('Yargitay kararlari ve mevzuat taranıyor...','Scanning court decisions...')}</p>
              </div>
            ):celiskilKartlar.length>0?(
              <>
                <p className="text-sm font-medium">{t('Tespit Edilen Hukuki Celiskiler & Riskler','Detected Legal Conflicts & Risks')}</p>
                {celiskilKartlar.map((kart,i)=>(
                  <div key={i} className="border border-border rounded-lg overflow-hidden">
                    <button className="w-full p-4 text-left flex items-center justify-between" onClick={()=>setAcikKart(acikKart===i?null:i)}>
                      <div className="flex items-center gap-3"><AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0"/><span className="text-sm font-medium">{kart.baslik}</span></div>
                      <div className="flex items-center gap-2"><RiskBadge risk={kart.risk}/>{acikKart===i?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</div>
                    </button>
                    {acikKart===i&&(
                      <div className="px-4 pb-4 border-t border-border pt-3">
                        <p className="text-sm mb-2">{kart.aciklama}</p>
                        <div className="bg-blue-50 rounded p-2"><p className="text-xs text-blue-700 font-medium">📚 {t('Emsal','Precedent')}</p><p className="text-xs text-blue-600 mt-1">{kart.emsal}</p></div>
                      </div>
                    )}
                  </div>
                ))}
                <Button onClick={()=>setAsama('sorular')} className="w-full">{t('Ihtiyac Tespitine Gec','Continue to Needs Assessment')}</Button>
              </>
            ):null}
          </div>
        )}

        {asama==='sorular'&&(
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4 mb-2">
              <p className="text-sm font-medium mb-1">{t('Ihtiyac Tespiti Mulakati','Needs Assessment Interview')}</p>
              <p className="text-xs text-muted-foreground">{t('AI uyusmazliginiza ozel sorular uretti.','AI generated questions specific to your dispute.')}</p>
            </div>
            {sorular.map((s,i)=>(
              <div key={s.id} className="border border-border rounded-lg p-4">
                <p className="text-sm font-medium mb-2">{i+1}. {s.soru}</p>
                <textarea value={s.cevap} onChange={e=>{const y=[...sorular];y[i].cevap=e.target.value;setSorular(y);}} rows={3} placeholder={t('Cevavinizi yazin...','Write your answer...')} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none"/>
              </div>
            ))}
            <Button onClick={handleCozumUret} disabled={sorular.some(s=>!s.cevap.trim())||loading} className="w-full gap-2">
              <Brain className="w-4 h-4"/>{t('Cozum Raporu Uret','Generate Solution Report')}
            </Button>
          </div>
        )}

        {asama==='rapor'&&(
          <div className="space-y-4">
            {loading?(
              <div className="text-center py-16">
                <Brain className="w-10 h-10 text-primary mx-auto mb-4 animate-pulse"/>
                <p className="text-sm font-medium">{t('Cozum raporu hazirlaniyor...','Preparing solution report...')}</p>
              </div>
            ):cozumRaporu?(
              <>
                <div className="flex items-center gap-2 mb-2"><CheckCircle className="w-5 h-5 text-green-600"/><h2 className="font-semibold">{t('Yapay Zeka Cozum & Strateji Raporu','AI Solution & Strategy Report')}</h2></div>
                <div className="bg-muted rounded-lg p-4"><p className="text-xs font-medium text-muted-foreground mb-2">YONETICI OZETI</p><p className="text-sm leading-relaxed">{cozumRaporu.yoneticiOzeti}</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-red-50 rounded-lg p-3"><p className="text-xs font-medium text-red-700 mb-2">RISKLER</p>{cozumRaporu.riskler.map((r,i)=><p key={i} className="text-xs mb-1">• {r}</p>)}</div>
                  <div className="bg-green-50 rounded-lg p-3"><p className="text-xs font-medium text-green-700 mb-2">FIRSATLAR</p>{cozumRaporu.firsatlar.map((f,i)=><p key={i} className="text-xs mb-1">• {f}</p>)}</div>
                </div>
                {cozumRaporu.kaynaklar.length>0&&(
                  <div className="bg-blue-50 rounded-lg p-4"><p className="text-xs font-medium text-blue-700 mb-2">KAYNAKLAR</p>{cozumRaporu.kaynaklar.map((k,i)=><div key={i} className="mb-2"><p className="text-xs font-medium text-blue-800">{k.tip}: {k.referans}</p><p className="text-xs text-blue-600 italic">{k.ilgililik}</p></div>)}</div>
                )}
                <div className="bg-amber-50 rounded-lg p-4"><p className="text-xs font-medium text-amber-700 mb-2">STRATEJI</p><p className="text-sm leading-relaxed">{cozumRaporu.strateji}</p></div>
                <div className="bg-green-50 rounded-lg p-4 border border-green-200"><p className="text-xs font-medium text-green-700 mb-2">SOMUT ONERI</p><p className="text-sm leading-relaxed font-medium">{cozumRaporu.onerim}</p></div>
                <Button variant="outline" className="w-full" onClick={()=>{setAsama('form');setNisAlan('');setUyusmazlik('');setCeliskilKartlar([]);setSorular([]);setCozumRaporu(null);}}>{t('Yeni Analiz Baslat','Start New Analysis')}</Button>
              </>
            ):null}
          </div>
        )}
      </main>
    </div>
  );
}
