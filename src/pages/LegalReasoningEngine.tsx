import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppNavbar } from '@/components/AppNavbar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Loader2, Brain, AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Scale } from 'lucide-react';

interface CeliskilKart { baslik: string; risk: 'yuksek'|'orta'|'dusuk'; aciklama: string; emsal: string; }
interface IhtiyacSorusu { id: number; soru: string; cevap: string; }
interface CozumRaporu { yoneticiOzeti: string; riskler: string[]; firsatlar: string[]; kaynaklar: Array<{tip:string;referans:string;ilgililik:string}>; strateji: string; onerim: string; }
type Asama = 'form'|'maskeleme'|'analiz'|'sorular'|'rapor';

const NIS_ALANLAR = [
  {value:'isci_isveren',label:'Isci-Isveren',icon:'👷'},
  {value:'ticari',label:'Ticari Uyusmazlik',icon:'🏢'},
  {value:'tuketici',label:'Tuketici',icon:'🛒'},
  {value:'saglik_hukuku',label:'Saglik Hukuku Uyusmazliklari',icon:'🏥'},
  {value:'sigorta',label:'Sigorta Uyusmazliklari',icon:'📋'},
  {value:'insaat',label:'Insaat & Yapi',icon:'🏗️'},
  {value:'marka_patent',label:'Marka & Patent',icon:'™️'},
];

const TARAF_ILISKISI = ['Is','Ticari','Tuketici','Komsu','Aile','Diger'];

function maskele(metin: string) {
  const map: Record<string,string> = {};
  let m = metin; let tc=0,iban=0,plaka=0;
  m = m.replace(/\b\d{11}\b/g, x=>{const k=`[TC_${++tc}]`;map[k]=x;return k;});
  m = m.replace(/TR\d{2}[\s\d]{20,26}/gi, x=>{const k=`[IBAN_${++iban}]`;map[k]=x;return k;});
  m = m.replace(/\b\d{2}[A-Z]{1,3}\d{2,4}\b/g, x=>{const k=`[PLAKA_${++plaka}]`;map[k]=x;return k;});
  return {maskelenmis:m, eslesmeler:map};
}

async function callGemini(prompt: string): Promise<string> {
  const { data, error } = await supabase.functions.invoke('legal-reasoning-gemini', {
    body: { prompt },
  });
  if (error) throw error;
  return (data as { text?: string })?.text || '';
}

function RiskBadge({risk}:{risk:string}) {
  const c: Record<string,{bg:string;color:string;label:string}> = {
    yuksek:{bg:'#fde8e8',color:'#a32d2d',label:'Yuksek Risk'},
    orta:{bg:'#fff3cd',color:'#856404',label:'Orta Risk'},
    dusuk:{bg:'#e6f4ea',color:'#1e7e34',label:'Dusuk Risk'},
  };
  const s = c[risk]||c.orta;
  return <span style={{background:s.bg,color:s.color,padding:'2px 10px',borderRadius:20,fontSize:11,fontWeight:500}}>{s.label}</span>;
}

export default function LegalReasoningEngine() {
  const {language} = useLanguage();
  const t = (tr:string,en:string) => language==='tr'?tr:en;
  const [asama,setAsama] = useState<Asama>('form');
  const [nisAlan,setNisAlan] = useState('');
  const [basvuranAd,setBasvuranAd] = useState('');
  const [basvuranIletisim,setBasvuranIletisim] = useState('');
  const [karsiTarafAd,setKarsiTarafAd] = useState('');
  const [karsiTarafIletisim,setKarsiTarafIletisim] = useState('');
  const [iliski,setIliski] = useState('');
  const [uyusmazlik,setUyusmazlik] = useState('');
  const [maskelenmis,setMaskelenmis] = useState('');
  const [eslesmeler,setEslesmeler] = useState<Record<string,string>>({});
  const [celiskilKartlar,setCeliskilKartlar] = useState<CeliskilKart[]>([]);
  const [sorular,setSorular] = useState<IhtiyacSorusu[]>([]);
  const [rapor,setRapor] = useState<CozumRaporu|null>(null);
  const [loading,setLoading] = useState(false);
  const [acikKart,setAcikKart] = useState<number|null>(null);

  async function handleBaslat() {
    const {maskelenmis:m, eslesmeler:e} = maskele(uyusmazlik);
    setMaskelenmis(m); setEslesmeler(e); setAsama('maskeleme');
  }

  async function handleAnalize() {
    setLoading(true); setAsama('analiz');
    const nis = NIS_ALANLAR.find(n=>n.value===nisAlan)?.label||nisAlan;
    try {
      const analizText = await callGemini(`Sen Turk hukuku uzmanisin. Sadece JSON dondur, baska hicbir sey yazma:
{"celiskilKartlar":[{"baslik":"...","risk":"yuksek|orta|dusuk","aciklama":"...","emsal":"Yargitay/BAM referansi"}]}

Nis Alan: ${nis}
Basvuran: ${basvuranAd}
Karsi Taraf: ${karsiTarafAd}
Iliski: ${iliski}
Uyusmazlik: ${maskelenmis}

Hukuki celiskileri ve riskleri tespit et.`);
      const parsed = JSON.parse(analizText.replace(/```json|```/g,'').trim());
      setCeliskilKartlar(parsed.celiskilKartlar||[]);

      const sorularText = await callGemini(`Sen arabuluculuk uzmanisın. Sadece JSON dondur:
{"sorular":["soru1","soru2","soru3","soru4","soru5"]}

Nis Alan: ${nis}, Uyusmazlik: ${maskelenmis}
Taraflarin gercek ihtiyaclarini ortaya cikaracak 5 soru uret.`);
      const sp = JSON.parse(sorularText.replace(/```json|```/g,'').trim());
      setSorular((sp.sorular||[]).map((s:string,i:number)=>({id:i+1,soru:s,cevap:''})));
      setAsama('sorular');
    } catch(e: any){
      console.error(e);
      toast({ title: 'Analiz hatası', description: e?.message || 'Bilinmeyen hata', variant: 'destructive' });
      setAsama('maskeleme');
    }
    setLoading(false);
  }

  async function handleRapor() {
    setLoading(true); setAsama('rapor');
    const nis = NIS_ALANLAR.find(n=>n.value===nisAlan)?.label||nisAlan;
    const cevaplar = sorular.map(s=>`${s.soru}\nCevap: ${s.cevap}`).join('\n\n');
    try {
      const raporText = await callGemini(`Sen Turk hukuku ve uluslararasi arabuluculuk uzmanisın. Sadece JSON dondur:
{"yoneticiOzeti":"...","riskler":["..."],"firsatlar":["..."],"kaynaklar":[{"tip":"...","referans":"...","ilgililik":"..."}],"strateji":"...","onerim":"..."}

Nis Alan: ${nis}, Uyusmazlik: ${maskelenmis}
Celiskiler: ${JSON.stringify(celiskilKartlar)}
Cevaplar: ${cevaplar}

Kapsamli cozum raporu uret.`);
      setRapor(JSON.parse(raporText.replace(/```json|```/g,'').trim()));
    } catch(e: any){
      console.error(e);
      toast({ title: 'Rapor hatası', description: e?.message || 'Bilinmeyen hata', variant: 'destructive' });
      setAsama('sorular');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar/>
      <main className="container max-w-2xl py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold mb-2">{t('Akilli Hukuki Analiz & Cozum Motoru','Legal Reasoning & Solution Engine')}</h1>
          <p className="text-muted-foreground text-sm">{t('Bilirkisi raporlari, Yargitay kararlari ve mevzuati sentezleyerek somut cozum onerisi uretir.','Synthesizes expert reports and court decisions to generate concrete solutions.')}</p>
        </div>

        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2">
          {[{key:'form',label:'Basvuru'},{key:'maskeleme',label:'Gizlilik'},{key:'analiz',label:'Analiz'},{key:'sorular',label:'Ihtiyac'},{key:'rapor',label:'Rapor'}].map((s,i,arr)=>(
            <div key={s.key} className="flex items-center gap-1 flex-shrink-0">
              <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:500,background:asama===s.key?'#1D9E75':['form','maskeleme','analiz','sorular','rapor'].indexOf(asama)>i?'#E6F4EE':'#f1f1f1',color:asama===s.key?'#fff':'#666'}}>{i+1}</div>
              <span style={{fontSize:11,color:asama===s.key?'#1D9E75':'#999'}}>{s.label}</span>
              {i<arr.length-1&&<span style={{color:'#ddd',margin:'0 2px'}}>→</span>}
            </div>
          ))}
        </div>

        {asama==='form'&&(
          <div className="space-y-5">
            <div>
              <label className="text-sm font-medium block mb-3">{t('Nis Alan Secin','Select Area')}</label>
              <div className="grid grid-cols-2 gap-2">
                {NIS_ALANLAR.map(n=>(
                  <button key={n.value} onClick={()=>setNisAlan(n.value)} className={`p-3 rounded-lg border text-left flex items-center gap-2 transition-colors ${nisAlan===n.value?'border-primary bg-primary/5':'border-border hover:border-primary/50'}`}>
                    <span>{n.icon}</span><span className={`text-sm font-medium ${nisAlan===n.value?'text-primary':''}`}>{n.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">{t('Basvuran Ad Soyad','Applicant Name')}</label>
                <input value={basvuranAd} onChange={e=>setBasvuranAd(e.target.value)} placeholder="Ad Soyad" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"/>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">{t('Basvuran Iletisim','Applicant Contact')}</label>
                <input value={basvuranIletisim} onChange={e=>setBasvuranIletisim(e.target.value)} placeholder="Tel / E-posta" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"/>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">{t('Karsi Taraf Ad','Other Party Name')}</label>
                <input value={karsiTarafAd} onChange={e=>setKarsiTarafAd(e.target.value)} placeholder="Ad Soyad / Sirket" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"/>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">{t('Karsi Taraf Iletisim','Other Party Contact')}</label>
                <input value={karsiTarafIletisim} onChange={e=>setKarsiTarafIletisim(e.target.value)} placeholder="Tel / E-posta" className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background"/>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">{t('Taraflar Arasindaki Iliski','Relationship')}</label>
              <select value={iliski} onChange={e=>setIliski(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background">
                <option value="">{t('Secin...','Select...')}</option>
                {TARAF_ILISKISI.map(i=><option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium block mb-1">{t('Uyusmazligi Anlatın','Describe Dispute')}</label>
              <textarea value={uyusmazlik} onChange={e=>setUyusmazlik(e.target.value)} rows={5} placeholder={t('Konu, tarihler, talepler...','Subject, dates, claims...')} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none"/>
              <p className="text-xs text-muted-foreground mt-1">🔒 {t('Kisisel veriler AI\'ya gitmeden maskelenir.','Personal data masked before reaching AI.')}</p>
            </div>

            <Button onClick={handleBaslat} disabled={!nisAlan||!uyusmazlik.trim()||!basvuranAd.trim()||!karsiTarafAd.trim()} className="w-full gap-2">
              <Brain className="w-4 h-4"/>{t('Analizi Baslat','Start Analysis')}
            </Button>
          </div>
        )}

        {asama==='maskeleme'&&(
          <div className="space-y-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3"><CheckCircle className="w-5 h-5 text-green-600"/><p className="text-sm font-medium text-green-700">{t('Kisisel Veriler Maskelendi','Personal Data Masked')}</p></div>
              {Object.keys(eslesmeler).length>0
                ?<div className="space-y-1">{Object.entries(eslesmeler).map(([k,v])=><div key={k} className="flex items-center gap-2 text-xs"><span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">{v.substring(0,6)}***</span><span>→</span><span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">{k}</span></div>)}</div>
                :<p className="text-xs text-green-600">{t('Maskelenecek veri bulunamadi.','No data to mask.')}</p>}
            </div>
            <div className="bg-muted rounded-lg p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">AI'YA GIDECEK METIN</p>
              <p className="text-sm leading-relaxed">{maskelenmis}</p>
            </div>
            <Button onClick={handleAnalize} className="w-full gap-2"><Scale className="w-4 h-4"/>{t('Hukuki Analizi Baslat','Start Legal Analysis')}</Button>
          </div>
        )}

        {asama==='analiz'&&(
          <div className="space-y-4">
            {loading
              ?<div className="text-center py-16"><Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4"/><p className="text-sm">{t('Yargitay kararlari taranıyor...','Scanning court decisions...')}</p></div>
              :celiskilKartlar.length>0&&(
                <>
                  <p className="text-sm font-medium">{t('Tespit Edilen Celiskiler & Riskler','Detected Conflicts & Risks')}</p>
                  {celiskilKartlar.map((k,i)=>(
                    <div key={i} className="border border-border rounded-lg overflow-hidden">
                      <button className="w-full p-4 text-left flex items-center justify-between" onClick={()=>setAcikKart(acikKart===i?null:i)}>
                        <div className="flex items-center gap-3"><AlertTriangle className="w-4 h-4 text-amber-500"/><span className="text-sm font-medium">{k.baslik}</span></div>
                        <div className="flex items-center gap-2"><RiskBadge risk={k.risk}/>{acikKart===i?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</div>
                      </button>
                      {acikKart===i&&<div className="px-4 pb-4 border-t pt-3"><p className="text-sm mb-2">{k.aciklama}</p><div className="bg-blue-50 rounded p-2"><p className="text-xs text-blue-700 font-medium">📚 Emsal</p><p className="text-xs text-blue-600 mt-1">{k.emsal}</p></div></div>}
                    </div>
                  ))}
                  <Button onClick={()=>setAsama('sorular')} className="w-full">{t('Ihtiyac Tespitine Gec','Continue')}</Button>
                </>
              )}
          </div>
        )}

        {asama==='sorular'&&(
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4"><p className="text-sm font-medium mb-1">{t('Ihtiyac Tespiti Mulakati','Needs Assessment')}</p><p className="text-xs text-muted-foreground">{t('AI uyusmazliginiza ozel sorular uretti.','AI generated questions for your dispute.')}</p></div>
            {sorular.map((s,i)=>(
              <div key={s.id} className="border border-border rounded-lg p-4">
                <p className="text-sm font-medium mb-2">{i+1}. {s.soru}</p>
                <textarea value={s.cevap} onChange={e=>{const y=[...sorular];y[i].cevap=e.target.value;setSorular(y);}} rows={3} placeholder={t('Cevavinizi yazin...','Write your answer...')} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none"/>
              </div>
            ))}
            <Button onClick={handleRapor} disabled={sorular.some(s=>!s.cevap.trim())||loading} className="w-full gap-2"><Brain className="w-4 h-4"/>{t('Cozum Raporu Uret','Generate Report')}</Button>
          </div>
        )}

        {asama==='rapor'&&(
          <div className="space-y-4">
            {loading
              ?<div className="text-center py-16"><Brain className="w-10 h-10 text-primary mx-auto mb-4 animate-pulse"/><p className="text-sm">{t('Cozum raporu hazirlaniyor...','Preparing report...')}</p></div>
              :rapor&&(
                <>
                  <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-green-600"/><h2 className="font-semibold">{t('Cozum & Strateji Raporu','Solution & Strategy Report')}</h2></div>
                  <div className="bg-muted rounded-lg p-4"><p className="text-xs font-medium text-muted-foreground mb-2">YONETICI OZETI</p><p className="text-sm leading-relaxed">{rapor.yoneticiOzeti}</p></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-red-50 rounded-lg p-3"><p className="text-xs font-medium text-red-700 mb-2">RISKLER</p>{rapor.riskler.map((r,i)=><p key={i} className="text-xs mb-1">• {r}</p>)}</div>
                    <div className="bg-green-50 rounded-lg p-3"><p className="text-xs font-medium text-green-700 mb-2">FIRSATLAR</p>{rapor.firsatlar.map((f,i)=><p key={i} className="text-xs mb-1">• {f}</p>)}</div>
                  </div>
                  {rapor.kaynaklar.length>0&&<div className="bg-blue-50 rounded-lg p-4"><p className="text-xs font-medium text-blue-700 mb-2">KAYNAKLAR</p>{rapor.kaynaklar.map((k,i)=><div key={i} className="mb-2"><p className="text-xs font-medium text-blue-800">{k.tip}: {k.referans}</p><p className="text-xs text-blue-600 italic">{k.ilgililik}</p></div>)}</div>}
                  <div className="bg-amber-50 rounded-lg p-4"><p className="text-xs font-medium text-amber-700 mb-2">STRATEJI</p><p className="text-sm">{rapor.strateji}</p></div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200"><p className="text-xs font-medium text-green-700 mb-2">SOMUT ONERI</p><p className="text-sm font-medium">{rapor.onerim}</p></div>
                  <Button variant="outline" className="w-full" onClick={()=>{setAsama('form');setNisAlan('');setUyusmazlik('');setBasvuranAd('');setKarsiTarafAd('');setCeliskilKartlar([]);setSorular([]);setRapor(null);}}>{t('Yeni Analiz','New Analysis')}</Button>
                </>
              )}
          </div>
        )}
      </main>
    </div>
  );
}
