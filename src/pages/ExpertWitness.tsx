
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
    setUploading(true);
    setError('');
    try {
      const filePath = `expert-reports/${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage.from('case-documents').upload(filePath, file);
      if (uploadError) throw uploadError;
      setUploading(false);
      setAnalyzing(true);
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: `Sen bir hukuki belge analiz uzmanısın. Sadece JSON formatında yanıt ver: {"summary":"özet","keyFindings":["bulgu"],"recommendations":["öneri"],"riskLevel":"low|medium|high","relevantLaw":["yasa"]}`,
          messages: [{ role: 'user', content: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }, { type: 'text', text: 'Bu bilirkişi raporunu analiz et.' }] }],
        }),
      });
      const data = await response.json();
      const parsed: AnalysisResult = JSON.parse(data.content?.[0]?.text?.replace(/```json|```/g, '').trim() || '{}');
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
          <label className="text-sm font-medium block mb-1">{t('Başvuru ID (isteğe bağlı)', 'Case ID (optional)')}</label>
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
