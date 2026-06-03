import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Download, Loader2, FileText, FileSpreadsheet, File } from 'lucide-react';
import { Template } from '../../types';
import { templatesApi } from '../../api/templates';

interface Props {
  template: Template | null;
  open: boolean;
  onClose: () => void;
  onDownload: (t: Template) => void;
}

const FILE_TYPE_BADGE: Record<string, string> = {
  PDF: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  DOCX: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  XLSX: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  OTHER: 'bg-muted text-muted-foreground',
};

const FILE_TYPE_ICON: Record<string, React.ReactNode> = {
  DOCX: <FileText className="w-5 h-5 text-blue-500" />,
  PDF: <File className="w-5 h-5 text-red-500" />,
  XLSX: <FileSpreadsheet className="w-5 h-5 text-green-600" />,
  OTHER: <File className="w-5 h-5 text-gray-400" />,
};

const TemplatePreviewModal: React.FC<Props> = ({ template, open, onClose, onDownload }) => {
  const { t } = useTranslation();

  const [docxHtml, setDocxHtml] = useState<string>('');
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const prevBlobUrl = useRef<string>('');

  const fileType = template?.fileType || 'OTHER';

  useEffect(() => {
    if (!open || !template) return;

    setDocxHtml('');
    setPdfBlobUrl('');
    setError('');
    setLoading(true);

    if (fileType === 'DOCX') {
      templatesApi.preview(template.id)
        .then(async (arrayBuffer) => {
          const mammoth = await import('mammoth');
          const result = await mammoth.convertToHtml({ arrayBuffer });
          setDocxHtml(result.value);
        })
        .catch(() => setError(t('templatesLibrary.preview.loadError')))
        .finally(() => setLoading(false));
    } else if (fileType === 'PDF') {
      templatesApi.preview(template.id)
        .then((arrayBuffer) => {
          const blob = new Blob([arrayBuffer], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          if (prevBlobUrl.current) URL.revokeObjectURL(prevBlobUrl.current);
          prevBlobUrl.current = url;
          setPdfBlobUrl(url);
        })
        .catch(() => setError(t('templatesLibrary.preview.loadError')))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }

    return () => {
      if (prevBlobUrl.current) {
        URL.revokeObjectURL(prevBlobUrl.current);
        prevBlobUrl.current = '';
      }
    };
  }, [open, template?.id, fileType]);

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl w-full p-0 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              {FILE_TYPE_ICON[fileType]}
              <DialogTitle className="text-base font-semibold truncate">{template.name}</DialogTitle>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${FILE_TYPE_BADGE[fileType] || FILE_TYPE_BADGE.OTHER}`}>
                {fileType}
              </span>
            </div>
            <Button size="sm" variant="outline" onClick={() => onDownload(template)}>
              <Download className="w-4 h-4 mr-2" />
              {t('templatesLibrary.preview.downloadInstead')}
            </Button>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-auto min-h-0">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {!loading && error && (
            <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mb-3 opacity-40" />
              <p className="text-sm mb-4">{error}</p>
              <Button variant="outline" onClick={() => onDownload(template)}>
                <Download className="w-4 h-4 mr-2" />
                {t('templatesLibrary.preview.downloadInstead')}
              </Button>
            </div>
          )}

          {!loading && !error && fileType === 'PDF' && pdfBlobUrl && (
            <iframe
              src={pdfBlobUrl}
              className="w-full h-full min-h-[70vh]"
              title={template.name}
              style={{ border: 'none' }}
            />
          )}

          {!loading && !error && fileType === 'DOCX' && docxHtml && (
            <div className="p-6">
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: docxHtml }}
              />
            </div>
          )}

          {!loading && !error && (fileType === 'XLSX' || fileType === 'OTHER') && (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center text-muted-foreground">
              <FileSpreadsheet className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-sm mb-4">{t('templatesLibrary.preview.notSupported')}</p>
              <Button variant="outline" onClick={() => onDownload(template)}>
                <Download className="w-4 h-4 mr-2" />
                {t('templatesLibrary.preview.downloadInstead')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplatePreviewModal;
