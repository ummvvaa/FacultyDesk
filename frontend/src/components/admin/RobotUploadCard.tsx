import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileSpreadsheet, X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/button';
import { robotRunsApi } from '../../api/robotRuns';
import { useToast } from '../../hooks/useToast';

interface Props {
  onRunStarted: () => void;
}

const MAX_SIZE = 25 * 1024 * 1024;

export default function RobotUploadCard({ onRunStarted }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validate = (f: File): string | null => {
    if (!f.name.toLowerCase().endsWith('.xlsx'))
      return t('admin.robot.upload.invalidFormat', 'Only .xlsx files are allowed');
    if (f.size > MAX_SIZE)
      return t('admin.robot.upload.fileTooLarge', 'File too large (max 25 MB)');
    return null;
  };

  const handleFile = (f: File) => {
    const err = validate(f);
    if (err) {
      toast({ title: err, variant: 'destructive' });
      return;
    }
    setFile(f);
    setSuccess(false);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      await robotRunsApi.uploadAndRun(file);
      setSuccess(true);
      setFile(null);
      toast({ title: t('admin.robot.upload.success', 'Robot started'), variant: 'success' });
      setTimeout(() => {
        onRunStarted();
        setSuccess(false);
      }, 3000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unknown error';
      toast({ title: t('admin.robot.upload.error', 'Failed to start robot') + ': ' + msg, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Upload className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-sm">{t('admin.robot.upload.title', 'Upload Excel & Run Robot')}</h3>
      </div>

      {success ? (
        <div className="flex items-center gap-3 text-green-600 bg-green-50 dark:bg-green-950/30 rounded-lg p-4">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{t('admin.robot.upload.success', 'Robot started — table will refresh shortly')}</span>
        </div>
      ) : (
        <>
          <div
            onDrop={onDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              dragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-muted/30'
            }`}
            onClick={() => document.getElementById('robot-file-input')?.click()}
          >
            <input
              id="robot-file-input"
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={onInputChange}
              disabled={uploading}
            />

            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet className="w-7 h-7 text-green-600 shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  className="ml-2 p-1 rounded hover:bg-muted transition-colors"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <FileSpreadsheet className="w-8 h-8 mx-auto text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  {t('admin.robot.upload.dragHere', 'Drag .xlsx here or')}{' '}
                  <span className="text-primary underline underline-offset-2">
                    {t('admin.robot.upload.browse', 'browse')}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground/60">max 25 MB</p>
              </div>
            )}
          </div>

          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t('admin.robot.upload.uploading', 'Starting robot...')}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                {t('admin.robot.upload.uploadButton', 'Upload & Run Robot')}
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
