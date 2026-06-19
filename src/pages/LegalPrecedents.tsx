
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppNavbar } from '@/components/AppNavbar';
import { Button } from '@/components/ui/button';
import { Loader2, Search, Scale, BookOpen } from 'lucide-react';

interface PrecedentResult {
  summary: string;
  yargitayKararlar: Array<{ karar: string; ozet: string; ilgililik: string }>;
  mevzuat: Array<{ kanun: string; madde: string; aciklama: string }>;
  tavsiye: string;
  kazanmaSansi: 'dusuk' | 'orta' | 'yuksek';
}

export default function LegalPrecedents() {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === 'tr' ? tr : en;
  const [disputeDesc, setDisputeDesc] = useState('');
  const [disputeType, setDisputeType] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrecedentResult | null>(null);
  const [error, setError] = useState('');

  const disputeTypes = [
    { value: 'ticari', label: t('Ticari', 'Commercial') },
    { value: 'is', label: t('İş', 'Employment') },
    { value: 'kira', label: t('Kira', 'Rental') },
    { value: 'tuketici', label: t('Tüketici', 'Consumer') },
    { value: 'insaat', label: t('İnşaat', 'Construction') },
    { value: 'aile', label: t('Aile', 'Family') },
    { value: 'sigorta', label: t('Sigorta', 'Insurance') },
    { value: 'fikri_mulkiyet', label: t('Fikri Mülkiyet', 'Intellectual Property') },
    { value: 'saglik', label: t('Sağlık Hukuku', 'Health Law') },
  ];

  async function handleSearch() {
    if (!disputeDesc.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: `Sen Türk hukuku uzmanısın. Sadece JSON formatında yanıt ver: {"summary":"özet","yargitayKararlar":[{"karar":"daire ve no","ozet":"özet","ilgililik":"ilgililik"}],"mevzuat":[{"kanun":"kanun","madde":"madde","aciklama":"açıklama"}],"tavsiye":"tavsiye","kazanmaSansi":"dusuk|orta|yuksek"}`,
          messages: [{ role: 'user', content: `Uyuşmazlık türü: ${disputeType || 'Belirtilmedi'}\n\nAçıklama: ${disputeDesc}\n\nİlgili Yargıtay kararları ve mevzuat ver.` }],
        }),
      });
      const data = await response.json();
      const parsed: PrecedentResult = JSON.parse(data.content?.[0]?.text?.replace(/```json|```/g, '').trim() || '{}');
      setResult(parsed);
    } catch (e) {
      setError(t('Arama sırasında hata oluştu.', 'Search failed.'));
    }
    setLoading(false);
  }

  const sansiColor = { dusuk: '#dc2626', orta: '#d97706', yuksek: '#16a34a' };
  const sansiLabel = { dusuk: t('Düşük', 'Low'), orta: t('Orta', 'Medium'), yuksek: t('Yüksek', 'High') };

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="container max-w-2xl py-8 px-4">
        <h1 className="text-2xl font-semibold mb-2">{t('Emsal Karar & Mevzuat Taraması', 'Legal Precedent Search')}</h1>
        <p className="text-muted-foreground text-sm mb-6">{t('Uyuşmazlığınızı anlatın, AI ilgili kararları bulsun.', 'Describe your dispute, AI will find relevant decisions.')}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {disputeTypes.map(d => (
            <button key={d.value} onClick={() => setDisputeType(d.value)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${disputeType === d.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:border-primary'}`}>
              {d.label}
            </button>
          ))}
        </div>
        <textarea value={disputeDesc} onChange={e => setDisputeDesc(e.target.value)} rows={5}
          placeholder={t('Uyuşmazlığı açıklayın...', 'Describe the dispute...')}
          className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none mb-4" />
        {error && <p className="text-destructive text-sm mb-4">{error}</p>}
        <Button onClick={handleSearch} disabled={loading || !disputeDesc.trim()} className="w-full mb-6 gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t('Taranıyor...', 'Searching...')}</> : <><Search className="w-4 h-4" />{t('Emsal Ara', 'Search')}</>}
        </Button>
        {result && (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground">ÖZET</p>
                <span style={{ background: sansiColor[result.kazanmaSansi] + '20', color: sansiColor[result.kazanmaSansi], padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 500 }}>
                  {t('Başarı:', 'Success:')} {sansiLabel[result.kazanmaSansi]}
                </span>
              </div>
              <p className="text-sm">{result.summary}</p>
            </div>
            {result.yargitayKararlar.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3"><Scale className="w-4 h-4 text-blue-600" /><p className="text-xs font-medium text-blue-700">YARGITAY KARARLARI</p></div>
                {result.yargitayKararlar.map((k, i) => (
                  <div key={i} className="mb-3 pb-3 border-b border-blue-100 last:border-0 last:mb-0 last:pb-0">
                    <p className="text-sm font-medium text-blue-800">{k.karar}</p>
                    <p className="text-sm mt-1">{k.ozet}</p>
                    <p className="text-xs text-muted-foreground mt-1 italic">{k.ilgililik}</p>
                  </div>
                ))}
              </div>
            )}
            {result.mevzuat.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3"><BookOpen className="w-4 h-4 text-amber-600" /><p className="text-xs font-medium text-amber-700">MEVZUAT</p></div>
                {result.mevzuat.map((m, i) => (
                  <div key={i} className="mb-3 pb-3 border-b border-amber-100 last:border-0 last:mb-0 last:pb-0">
                    <p className="text-sm font-medium text-amber-800">{m.kanun} — {m.madde}</p>
                    <p className="text-sm mt-1">{m.aciklama}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4">
              <p className="text-xs font-medium text-green-700 mb-2">TAVSİYE</p>
              <p className="text-sm">{result.tavsiye}</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

