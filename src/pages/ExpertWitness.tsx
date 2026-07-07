
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/contexts/LanguageContext';
import { AppNavbar } from '@/components/AppNavbar';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface AnalysisResult {
  summary: string;
  keyFindings: string[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high';
  relevantLaw: string[];
}

const NO_DATA_RESULT: AnalysisResult = {
  summary: 'Yeterli veri yok',
  keyFindings: [],
  recommendations: [],
  riskLevel: 'low',
  relevantLaw: [],
};

export default function ExpertWitness() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [caseId, setCaseId] = useState('');
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const t = (tr: string, en: string) => language === 'tr' ? tr : en;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError(t('Sadece PDF dosyası yükleyebilirsiniz.', 'Only PDF files are allowed.'));
      return;
    }
    setFile(f);
    setError('');
    setResult(null);
  }

  async function handleAnalyze() {
    if (!file || !user) return;
    if (!caseId.trim()) {
      setError(t('Analiz sonucunu kaydetmek için Başvuru ID gereklidir.', 'A Case ID is required to save the analysis.'));
      return;
    }
    setUploading(true);
    setError('');
    try {
      const filePath = `${user.id}/${caseId.trim()}/${Date.now()}-${file.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from('case-documents').upload(filePath, file);
      if (uploadError) throw uploadError;
      setUploading(false);
      setAnalyzing(true);

      // mediation-ai's "analyze_document" action only reads body.text — there is no
      // server-side PDF parser yet, so a PDF's real text can't be extracted here or
      // there. Only call it when we actually have readable text; otherwise report
      // "Yeterli veri yok" instead of letting the AI guess from nothing.
      const extractedText = file.type === 'text/plain' ? (await file.text()).trim() : '';
      let parsed: AnalysisResult = NO_DATA_RESULT;
      if (extractedText) {
        const { data, error: aiError } = await supabase.functions.invoke('mediation-ai', {
          body: { action: 'analyze_document', text: extractedText, file_path: uploadData?.path ?? filePath, niche: 'bilirkişi raporu' },
        });
        if (aiError) throw aiError;
        const cards: Array<{ title?: string; riskLevel?: string; description?: string; precedent?: string }> = data?.cards ?? [];
        parsed = cards.length ? {
          summary: `${cards.length} bulgu tespit edildi.`,
          keyFindings: cards.map(c => c.description).filter((x): x is string => !!x),
          recommendations: [],
          riskLevel: cards.some(c => c.riskLevel === 'high') ? 'high' : cards.some(c => c.riskLevel === 'medium') ? 'medium' : 'low',
          relevantLaw: cards.map(c => c.precedent).filter((x): x is string => !!x),
        } : NO_DATA_RESULT;
      }

      const { error: docError } = await supabase.from('case_documents').insert({
        case_id: caseId.trim(),
        uploaded_by: user.id,
        file_name: file.name,
        file_path: uploadData?.path ?? filePath,
        file_size: file.size,
        mime_type: file.type,
        analysis_result: parsed,
      } as any);
      if (docError) throw docError;

      setResult(parsed);
    } catch (e) {
      setError(t('Analiz sırasında hata oluştu.', 'Analysis failed.'));
    }
    setUploading(false);
    setAnalyzing(false);
  }

  return (
    <div className="min-h-screen bg-background">
      <AppNavbar />
      <main className="container max-w-2xl py-8 px-4">
        <h1 className="text-2xl font-semibold mb-2">{t('Bilirkişi Raporu Analizi', 'Expert Witness Analysis')}</h1>
        <p className="text-muted-foreground text-sm mb-6">{t('PDF raporu yükleyin, AI analiz etsin.', 'Upload PDF report for AI analysis.')}</p>
        <div className="mb-4">
          <label className="text-sm font-medium block mb-1">{t('Başvuru ID', 'Case ID')}</label>
          <input value={caseId} onChange={e => setCaseId(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" />
        </div>
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center mb-4 cursor-pointer" onClick={() => document.getElementById('pdf-input')?.click()}>
          <input id="pdf-input" type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
          {file ? <p className="font-medium text-sm">{file.name}</p> : <p className="text-sm text-muted-foreground">{t('PDF dosyası seçin', 'Select PDF file')}</p>}
        </div>
        {error && <p className="text-destructive text-sm mb-4">{error}</p>}
        <Button onClick={handleAnalyze} disabled={!file || uploading || analyzing} className="w-full mb-6">
          {uploading ? t('Yükleniyor...', 'Uploading...') : analyzing ? t('AI Analiz Ediyor...', 'Analyzing...') : t('Raporu Analiz Et', 'Analyze Report')}
        </Button>
        {result && (
          <div className="space-y-4">
            <div className="bg-muted rounded-lg p-4"><p className="text-xs font-medium text-muted-foreground mb-2">ÖZET</p><p className="text-sm">{result.summary}</p></div>
            <div className="bg-blue-50 rounded-lg p-4"><p className="text-xs font-medium text-blue-700 mb-2">BULGULAR</p>{result.keyFindings.map((f,i) => <p key={i} className="text-sm">• {f}</p>)}</div>
            <div className="bg-green-50 rounded-lg p-4"><p className="text-xs font-medium text-green-700 mb-2">ÖNERİLER</p>{result.recommendations.map((r,i) => <p key={i} className="text-sm">→ {r}</p>)}</div>
            <div className="bg-amber-50 rounded-lg p-4"><p className="text-xs font-medium text-amber-700 mb-2">MEVZUAT</p>{result.relevantLaw.map((l,i) => <p key={i} className="text-sm">⚖ {l}</p>)}</div>
          </div>
        )}
      </main>
    </div>
  );
}
