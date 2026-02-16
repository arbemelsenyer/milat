import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Trash2, Download, Loader2 } from 'lucide-react';

interface CaseDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
  uploaded_by: string;
}

interface CaseDocumentsProps {
  caseId: string;
}

export function CaseDocuments({ caseId }: CaseDocumentsProps) {
  const { language } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [caseId]);

  const fetchDocuments = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('case_documents')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDocuments(data as CaseDocument[]);
    }
    setIsLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0 || !user) return;

    setIsUploading(true);

    for (const file of files) {
      const filePath = `${user.id}/${caseId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from('case-documents')
        .upload(filePath, file);

      if (uploadError) {
        toast({ variant: 'destructive', title: language === 'tr' ? 'Yükleme hatası' : 'Upload error', description: uploadError.message });
        continue;
      }

      await supabase.from('case_documents').insert({
        case_id: caseId,
        uploaded_by: user.id,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
      });
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    fetchDocuments();
    toast({
      title: language === 'tr' ? 'Yüklendi' : 'Uploaded',
      description: language === 'tr' ? 'Belgeler başarıyla yüklendi.' : 'Documents uploaded successfully.',
    });
  };

  const handleDownload = async (doc: CaseDocument) => {
    const { data, error } = await supabase.storage
      .from('case-documents')
      .download(doc.file_path);

    if (error || !data) {
      toast({ variant: 'destructive', title: language === 'tr' ? 'Hata' : 'Error', description: error?.message || 'Download failed' });
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (doc: CaseDocument) => {
    await supabase.storage.from('case-documents').remove([doc.file_path]);
    await supabase.from('case_documents').delete().eq('id', doc.id);
    fetchDocuments();
    toast({
      title: language === 'tr' ? 'Silindi' : 'Deleted',
      description: language === 'tr' ? 'Belge silindi.' : 'Document deleted.',
    });
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5" />
          {language === 'tr' ? 'Belgeler' : 'Documents'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleUpload}
            className="hidden"
            accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
          />
          {isUploading ? (
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
          ) : (
            <>
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-foreground font-medium">
                {language === 'tr' ? 'Belge yüklemek için tıklayın' : 'Click to upload documents'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF, Word, Metin, Görseller</p>
            </>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            {language === 'tr' ? 'Henüz belge yüklenmedi.' : 'No documents uploaded yet.'}
          </p>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between bg-card border border-border rounded-lg p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(doc.file_size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="ghost" size="icon" onClick={() => handleDownload(doc)}>
                    <Download className="w-4 h-4" />
                  </Button>
                  {doc.uploaded_by === user?.id && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(doc)}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
