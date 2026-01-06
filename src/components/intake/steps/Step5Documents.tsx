import { IntakeFormData } from '@/types/intake';
import { FormField } from '../FormField';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, X } from 'lucide-react';
import { useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Step5Props {
  data: IntakeFormData;
  onChange: (updates: Partial<IntakeFormData>) => void;
}

export function Step5Documents({ data, onChange }: Step5Props) {
  const { t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onChange({ documents: [...data.documents, ...files] });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    const newDocuments = data.documents.filter((_, i) => i !== index);
    onChange({ documents: newDocuments });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-display font-semibold text-foreground">
          {t('step5.title')}
        </h2>
        <p className="text-muted-foreground mt-2">
          {t('step5.description')}
        </p>
      </div>

      {/* Privacy notice */}
      <div className="bg-secondary/50 border border-border rounded-lg p-4 mb-6">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">{t('step5.privacyNote')}</strong> {t('step5.privacyNoteText')}
        </p>
      </div>

      {/* File upload area */}
      <div
        onClick={() => fileInputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
        />
        <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <p className="text-foreground font-medium">{t('step5.uploadClick')}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {t('step5.uploadFormats')}
        </p>
      </div>

      {/* Uploaded files list */}
      {data.documents.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">{t('step5.uploadedFiles')}</p>
          {data.documents.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-card border border-border rounded-lg p-3"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <FormField
        label={t('step5.additionalNotes')}
        description={t('step5.additionalNotesDesc')}
      >
        <Textarea
          value={data.additionalNotes}
          onChange={(e) => onChange({ additionalNotes: e.target.value })}
          placeholder={t('step5.additionalNotesPlaceholder')}
          className="min-h-[100px]"
        />
      </FormField>
    </div>
  );
}
