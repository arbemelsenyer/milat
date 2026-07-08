import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppNavbar } from '@/components/AppNavbar';
import { Button } from '@/components/ui/button';
import { Loader2, FileCheck, Copy, Download, CheckCircle } from 'lucide-react';

// apiType maps this screen's doc ids onto mediation-ai's generate_agreement
// docType values (tutanak | anlasma | mutabakat | uzlasma).
const DOC_TYPES = [
  { id: 'arabuluculuk_anlasmasi', apiType: 'anlasma', label: 'Arabuluculuk Anlaşması', labelEn: 'Mediation Agreement' },
  { id: 'mutabakat_muhtirasi', apiType: 'mutabakat', label: 'Mutabakat Muhtırası', labelEn: 'Memorandum of Agreement' },
  { id: 'gorusme_tutanagi', apiType: 'tutanak', label: 'Görüşme Tutanağı', labelEn: 'Session Minutes' },
  { id: 'uzlasma_belgesi', apiType: 'uzlasma', label: 'Uzlaşma Belgesi', labelEn: 'Settlement Document' },
];

export default function AgreementGenerator() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const t = (tr: string, en: string) => language === 'tr' ? tr : en;
  const [docType, setDocType] = useState('arabuluculuk_anlasmasi');
  const [tarafA, setTarafA] = useState('');
  const [tarafB, setTarafB] = useState('');
  const [uyusmazlik, setUyusmazlik] = useState('');
  const [sartlar, setSartlar] = useState('');
  const [arabulucu, setArabulucu] = useState('');
  const [loading, setLoading] = useState(false);
  const [doc, setDoc] = useState('');
  const [copied, setCopied] = useState(false);
  const [caseId, setCaseId] = useState('');
  const selectedDoc = DOC_TYPES.find(d => d.id === docType)!;

  async function handleGenerate() {
    if (!tarafA.trim() || !tarafB.trim() || !uyusmazlik.trim()) return;
    setLoading(true);
    setDoc('');
    const today = new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    const context = `Tarih: ${today}\nTaraf A: ${tarafA}\nTaraf B: ${tarafB}\n${arabulucu ? `Arabulucu: ${arabulucu}\n` : ''}Uyuşmazlık: ${uyusmazlik}\n${sartlar ? `Anlaşılan Şartlar: ${sartlar}` : ''}`;
    let fullText = '';
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mediation-ai`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
        body: JSON.stringify({ action: 'generate_agreement', docType: selectedDoc.apiType, context }),
      });
      if (!resp.ok || !resp.body) {
        throw new Error(t('AI servisine ulaşılamadı, lütfen tekrar deneyin.', 'Could not reach the AI service, please retry.'));
      }
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content ?? '';
            if (delta) { fullText += delta; setDoc(fullText); }
          } catch {}
        }
      }
      if (!fullText.trim()) {
        throw new Error(t('Belge üretilemedi, lütfen tekrar deneyin.', 'Document could not be generated, please retry.'));
      }
      if (caseId && user) {
        await supabase.from('case_documents').insert({
          case_id: caseId,
          file_name: `${selectedDoc.label}_${today}.txt`,
          file_path: `agreements/${caseId}/${Date.now()}_${docType}.txt`,
          mime_type: 'text/plain',
          uploaded_by: user.id,
        });
      }
    } catch (e) {
      // If the stream had already produced text, keep it visible and append
      // the error instead of wiping out what the user already saw generated.
      const msg = e instanceof Error ? e.message : t('Belge oluşturulurken hata oluştu.', 'Document generation failed.');
      setDoc(fullText ? `${fullText}\n\n⚠️ ${msg}` : msg);
    }
    setLoading(false);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(doc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const blob = new Blob([doc], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDoc.label}_${new Date().toLocaleDateString('tr-TR')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="container max-w-2xl py-8 px-4">
        <h1 className="text-2xl font-semibold mb-2">{t('Anlaşma Belgesi Oluştur', 'Generate Agreement Document')}</h1>
        <p className="text-muted-foreground text-sm mb-6">{t('Bilgileri girin, AI Türk hukukuna uygun belge hazırlasın.', 'Enter details, AI will generate a document compliant with Turkish law.')}</p>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {DOC_TYPES.map(d => (
            <button key={d.id} onClick={() => setDocType(d.id)}
              className={`p-3 rounded-lg border text-left transition-colors ${docType === d.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}>
              <p className={`text-sm font-medium ${docType === d.id ? 'text-primary' : ''}`}>{language === 'tr' ? d.label : d.labelEn}</p>
            </button>
          ))}
        </div>
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium block mb-1">{t('Taraf A', 'Party A')}</label>
              <input value={tarafA} onChange={e => setTarafA(e.target.value)} placeholder={t('Ad soyad veya şirket', 'Name or company')} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">{t('Taraf B', 'Party B')}</label>
              <input value={tarafB} onChange={e => setTarafB(e.target.value)} placeholder={t('Ad soyad veya şirket', 'Name or company')} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">{t('Arabulucu (isteğe bağlı)', 'Mediator (optional)')}</label>
            <input value={arabulucu} onChange={e => setArabulucu(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">{t('Uyuşmazlık Konusu', 'Dispute Subject')}</label>
            <textarea value={uyusmazlik} onChange={e => setUyusmazlik(e.target.value)} rows={3} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
          </div>
          {['mutabakat_muhtirasi', 'uzlasma_belgesi', 'gorusme_tutanagi'].includes(docType) && (
            <div>
              <label className="text-sm font-medium block mb-1">{t('Anlaşılan Şartlar', 'Agreed Terms')}</label>
              <textarea value={sartlar} onChange={e => setSartlar(e.target.value)} rows={4} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium block mb-1">{t('Başvuru ID (isteğe bağlı)', 'Case ID (optional)')}</label>
            <input value={caseId} onChange={e => setCaseId(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
          </div>
        </div>
        <Button onClick={handleGenerate} disabled={loading || !tarafA.trim() || !tarafB.trim() || !uyusmazlik.trim()} className="w-full mb-6 gap-2">
          {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t('Hazırlanıyor...', 'Generating...')}</> : <><FileCheck className="w-4 h-4" />{t('Belge Oluştur', 'Generate Document')}</>}
        </Button>
        {doc && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <p className="text-sm font-medium">{language === 'tr' ? selectedDoc.label : selectedDoc.labelEn}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1">
                  {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? t('Kopyalandı!', 'Copied!') : t('Kopyala', 'Copy')}
                </Button>
                {!loading && (
                  <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1">
                    <Download className="w-3 h-3" />
                    {t('İndir', 'Download')}
                  </Button>
                )}
              </div>
            </div>
            <div className="border border-border rounded-lg p-5 bg-muted/30 text-sm leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto font-serif">
              {doc}
              {loading && <span className="opacity-40 animate-pulse">▌</span>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
