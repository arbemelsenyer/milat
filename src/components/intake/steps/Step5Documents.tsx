import { IntakeFormData } from '@/types/intake';
import { FormField } from '../FormField';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, X } from 'lucide-react';
import { useRef } from 'react';

interface Step5Props {
  data: IntakeFormData;
  onChange: (updates: Partial<IntakeFormData>) => void;
}

export function Step5Documents({ data, onChange }: Step5Props) {
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
          Any supporting documents?
        </h2>
        <p className="text-muted-foreground mt-2">
          Optional: Add relevant documents to support your case
        </p>
      </div>

      {/* Privacy notice */}
      <div className="bg-secondary/50 border border-border rounded-lg p-4 mb-6">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Privacy Note:</strong> Documents uploaded here 
          are for mediation preparation only and are treated as confidential. 
          They will not be retained after your session.
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
        <p className="text-foreground font-medium">Click to upload documents</p>
        <p className="text-sm text-muted-foreground mt-1">
          PDF, Word, Text, or Images (max 10MB each)
        </p>
      </div>

      {/* Uploaded files list */}
      {data.documents.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Uploaded files:</p>
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
        label="Additional notes"
        description="Any other context you'd like to share"
      >
        <Textarea
          value={data.additionalNotes}
          onChange={(e) => onChange({ additionalNotes: e.target.value })}
          placeholder="Any other information that might be helpful..."
          className="min-h-[100px]"
        />
      </FormField>
    </div>
  );
}
