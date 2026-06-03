import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet, Download, Eye } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { Card, CardContent } from '../components/ui/card';
import EmptyState from '../components/EmptyState';
import TableRowSkeleton from '../components/skeletons/TableRowSkeleton';
import { Button } from '../components/ui/button';
import { useMyGeneratedDocuments } from '../hooks/useGeneratedDocuments';
import { generatedDocumentsApi } from '../api/generatedDocuments';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../hooks/useToast';
import { GeneratedDocument, GeneratedDocStatus, DocumentType } from '../types';

const DOC_TYPE_BADGE: Record<DocumentType, string> = {
  INDIVIDUAL_WORKLOAD: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  SEMESTER_WORKLOAD: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  PRACTICE_SUPERVISION: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  DIPLOMA_SUPERVISION: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  KKK_DOCUMENT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  OTHER: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const STATUS_BADGE: Record<GeneratedDocStatus, string> = {
  GENERATED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  UPLOADED: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  VIEWED: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
  DOWNLOADED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  NEEDS_REVIEW: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ERROR: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

function formatDate(dt?: string): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

interface ViewModalProps {
  doc: GeneratedDocument;
  onClose: () => void;
}

const ViewModal: React.FC<ViewModalProps> = ({ doc, onClose }) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const handleDownload = async () => {
    try {
      await generatedDocumentsApi.download(doc.id, doc.originalFileName);
      toast({ title: t('common.success'), description: t('generatedDocuments.actions.download'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-lg border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">{doc.title}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-3 text-sm">
          <Row label={t('generatedDocuments.columns.type')}>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${DOC_TYPE_BADGE[doc.documentType]}`}>
              {t(`generatedDocuments.types.${toCamelKey(doc.documentType)}`)}
            </span>
          </Row>
          <Row label={t('generatedDocuments.columns.source')}>{doc.sourceExcelFile || '—'}</Row>
          <Row label={t('generatedDocuments.columns.date')}>{formatDate(doc.generationDate)}</Row>
          <Row label={t('generatedDocuments.columns.status')}>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[doc.status]}`}>
              {t(`generatedDocuments.statuses.${toCamelKey(doc.status)}`)}
            </span>
          </Row>
          {doc.comment && (
            <Row label={t('generatedDocuments.columns.comment')}>{doc.comment}</Row>
          )}
          {doc.originalFileName && (
            <Row label={t('generatedDocuments.columns.file')}>{doc.originalFileName}</Row>
          )}
        </div>
        <div className="flex justify-end gap-2 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            {t('generatedDocuments.actions.download')}
          </Button>
        </div>
      </div>
    </div>
  );
};

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex gap-2">
    <span className="text-muted-foreground w-32 shrink-0">{label}</span>
    <span className="flex-1 break-words">{children}</span>
  </div>
);

const GeneratedDocuments: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: docs, isLoading } = useMyGeneratedDocuments();
  const [viewDoc, setViewDoc] = useState<GeneratedDocument | null>(null);
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = docs
    ? [...docs].sort((a, b) => {
        const ta = new Date(a.generationDate ?? a.createdAt ?? 0).getTime();
        const tb = new Date(b.generationDate ?? b.createdAt ?? 0).getTime();
        return sortDesc ? tb - ta : ta - tb;
      })
    : [];

  const handleView = async (doc: GeneratedDocument) => {
    try {
      const updated = await generatedDocumentsApi.getById(doc.id);
      setViewDoc(updated);
      qc.invalidateQueries({ queryKey: ['generated-documents', 'me'] });
    } catch {
      setViewDoc(doc);
    }
  };

  const handleDownload = async (doc: GeneratedDocument) => {
    try {
      await generatedDocumentsApi.download(doc.id, doc.originalFileName);
      qc.invalidateQueries({ queryKey: ['generated-documents', 'me'] });
      toast({ title: t('common.success'), description: t('generatedDocuments.actions.download'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('generatedDocuments.myDocuments')} icon={FileSpreadsheet} />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody><TableRowSkeleton rows={5} cols={7} /></tbody>
              </table>
            </div>
          ) : sorted.length === 0 ? (
            <EmptyState
              icon={FileSpreadsheet}
              title={t('emptyStates.generatedDocuments.title')}
              description={t('emptyStates.generatedDocuments.description')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('generatedDocuments.columns.title')}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('generatedDocuments.columns.type')}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('generatedDocuments.columns.source')}</th>
                    <th
                      className="px-4 py-3 text-left font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground"
                      onClick={() => setSortDesc(!sortDesc)}
                    >
                      {t('generatedDocuments.columns.date')} {sortDesc ? '↓' : '↑'}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('generatedDocuments.columns.status')}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('generatedDocuments.columns.comment')}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('generatedDocuments.columns.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sorted.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{doc.title}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${DOC_TYPE_BADGE[doc.documentType]}`}>
                          {t(`generatedDocuments.types.${toCamelKey(doc.documentType)}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[160px] truncate text-muted-foreground">{doc.sourceExcelFile || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(doc.generationDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_BADGE[doc.status]}`}>
                          {t(`generatedDocuments.statuses.${toCamelKey(doc.status)}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        {doc.comment ? (
                          <span title={doc.comment} className="truncate block cursor-help text-muted-foreground">
                            {doc.comment}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleView(doc)}>
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            {t('generatedDocuments.actions.view')}
                          </Button>
                          <Button size="sm" onClick={() => handleDownload(doc)}>
                            <Download className="w-3.5 h-3.5 mr-1" />
                            {t('generatedDocuments.actions.download')}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {viewDoc && <ViewModal doc={viewDoc} onClose={() => setViewDoc(null)} />}
    </div>
  );
};

function toCamelKey(val: string): string {
  return val.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export default GeneratedDocuments;
