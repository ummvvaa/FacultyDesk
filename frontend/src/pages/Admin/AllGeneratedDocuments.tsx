import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Download, Pencil, Trash2, Inbox, FileSpreadsheet } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import EmptyState from '../../components/EmptyState';
import TableRowSkeleton from '../../components/skeletons/TableRowSkeleton';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAdminGeneratedDocuments, useUpdateGeneratedDocStatus, useDeleteGeneratedDoc } from '../../hooks/useGeneratedDocuments';
import { generatedDocumentsApi } from '../../api/generatedDocuments';
import { usersApi } from '../../api/users';
import { useToast } from '../../hooks/useToast';
import { useNavigate } from 'react-router-dom';
import {
  GeneratedDocumentAdminFilters,
  GeneratedDocStatus,
  DocumentType,
} from '../../types';

const SELECT_CLS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

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

const ALL_DOC_TYPES: DocumentType[] = [
  'INDIVIDUAL_WORKLOAD',
  'SEMESTER_WORKLOAD',
  'PRACTICE_SUPERVISION',
  'DIPLOMA_SUPERVISION',
  'KKK_DOCUMENT',
  'OTHER',
];

const ALL_STATUSES: GeneratedDocStatus[] = [
  'GENERATED',
  'UPLOADED',
  'VIEWED',
  'DOWNLOADED',
  'NEEDS_REVIEW',
  'ERROR',
];

function formatDate(dt?: string): string {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function toCamelKey(val: string): string {
  return val.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

interface StatusModalProps {
  docId: number;
  currentStatus: GeneratedDocStatus;
  currentComment?: string;
  onClose: () => void;
}

const StatusModal: React.FC<StatusModalProps> = ({ docId, currentStatus, currentComment, onClose }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const updateStatus = useUpdateGeneratedDocStatus();
  const [status, setStatus] = useState<GeneratedDocStatus>(currentStatus);
  const [comment, setComment] = useState(currentComment ?? '');

  const handleSave = async () => {
    try {
      await updateStatus.mutateAsync({ id: docId, status, comment: comment || undefined });
      toast({ title: t('common.success'), variant: 'success' });
      onClose();
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md border border-border">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">{t('generatedDocuments.actions.changeStatus')}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t('generatedDocuments.columns.status')}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as GeneratedDocStatus)}
              className={SELECT_CLS}
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{t(`generatedDocuments.statuses.${toCamelKey(s)}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">{t('generatedDocuments.columns.comment')}</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-6 border-t border-border">
          <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
          <Button onClick={handleSave} disabled={updateStatus.isPending}>{t('common.save')}</Button>
        </div>
      </div>
    </div>
  );
};

const AllGeneratedDocuments: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const deleteDoc = useDeleteGeneratedDoc();

  const [teacherId, setTeacherId] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sourceExcel, setSourceExcel] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);

  const [statusModal, setStatusModal] = useState<{ id: number; status: GeneratedDocStatus; comment?: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: users } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => usersApi.getAll(),
  });

  const filters: GeneratedDocumentAdminFilters = {
    teacherId: teacherId ? Number(teacherId) : undefined,
    documentType: (documentType as DocumentType) || undefined,
    dateFrom: dateFrom ? `${dateFrom}T00:00:00` : undefined,
    dateTo: dateTo ? `${dateTo}T23:59:59` : undefined,
    sourceExcel: sourceExcel || undefined,
    status: (statusFilter as GeneratedDocStatus) || undefined,
    page,
    size: 20,
  };

  const { data, isLoading } = useAdminGeneratedDocuments(filters);

  const handleFilterChange = () => setPage(0);

  const handleDownload = async (id: number, fileName?: string) => {
    try {
      await generatedDocumentsApi.download(id, fileName);
      toast({ title: t('common.success'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteDoc.mutateAsync(id);
      toast({ title: t('common.success'), variant: 'success' });
      setDeleteConfirm(null);
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    }
  };

  const docs = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title={t('generatedDocuments.allDocuments')} icon={FileSpreadsheet} />

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          <select
            value={teacherId}
            onChange={(e) => { setTeacherId(e.target.value); handleFilterChange(); }}
            className={SELECT_CLS}
          >
            <option value="">{t('generatedDocuments.filters.teacher')}</option>
            {users?.map((u) => (
              <option key={u.id} value={u.id}>{u.username}</option>
            ))}
          </select>

          <select
            value={documentType}
            onChange={(e) => { setDocumentType(e.target.value); handleFilterChange(); }}
            className={SELECT_CLS}
          >
            <option value="">{t('generatedDocuments.filters.type')}</option>
            {ALL_DOC_TYPES.map((dt) => (
              <option key={dt} value={dt}>{t(`generatedDocuments.types.${toCamelKey(dt)}`)}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); handleFilterChange(); }}
            className={SELECT_CLS}
            placeholder={t('generatedDocuments.filters.dateFrom')}
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); handleFilterChange(); }}
            className={SELECT_CLS}
            placeholder={t('generatedDocuments.filters.dateTo')}
          />

          <Input
            placeholder={t('generatedDocuments.filters.sourceExcel')}
            value={sourceExcel}
            onChange={(e) => { setSourceExcel(e.target.value); handleFilterChange(); }}
          />

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); handleFilterChange(); }}
            className={SELECT_CLS}
          >
            <option value="">{t('generatedDocuments.filters.status')}</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{t(`generatedDocuments.statuses.${toCamelKey(s)}`)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody><TableRowSkeleton rows={8} cols={6} /></tbody>
              </table>
            </div>
          ) : docs.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={t('emptyStates.allGeneratedDocuments.title')}
              description={t('emptyStates.allGeneratedDocuments.description')}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('generatedDocuments.columns.teacher')}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('generatedDocuments.columns.title')}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('generatedDocuments.columns.type')}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('generatedDocuments.columns.source')}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('generatedDocuments.columns.date')}</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">{t('generatedDocuments.columns.status')}</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">{t('generatedDocuments.columns.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {docs.map((doc) => (
                    <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          className="text-primary hover:underline font-medium"
                          onClick={() => doc.teacherId && navigate(`/user/${doc.teacherId}`)}
                        >
                          {doc.teacherUsername || '—'}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-medium max-w-[180px] truncate">{doc.title}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${DOC_TYPE_BADGE[doc.documentType]}`}>
                          {t(`generatedDocuments.types.${toCamelKey(doc.documentType)}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-[140px] truncate text-muted-foreground">{doc.sourceExcelFile || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">{formatDate(doc.generationDate)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_BADGE[doc.status]}`}>
                          {t(`generatedDocuments.statuses.${toCamelKey(doc.status)}`)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            title={t('generatedDocuments.actions.download')}
                            onClick={() => handleDownload(doc.id, doc.originalFileName)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title={t('generatedDocuments.actions.changeStatus')}
                            onClick={() => setStatusModal({ id: doc.id, status: doc.status, comment: doc.comment })}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title={t('generatedDocuments.actions.delete')}
                            className="text-destructive hover:text-destructive"
                            onClick={() => setDeleteConfirm(doc.id)}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
            &larr;
          </Button>
          <span className="flex items-center text-sm text-muted-foreground px-2">
            {page + 1} / {totalPages}
          </span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
            &rarr;
          </Button>
        </div>
      )}

      {/* Status modal */}
      {statusModal && (
        <StatusModal
          docId={statusModal.id}
          currentStatus={statusModal.status}
          currentComment={statusModal.comment}
          onClose={() => setStatusModal(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-sm border border-border p-6 space-y-4">
            <h2 className="text-lg font-semibold">{t('generatedDocuments.actions.delete')}</h2>
            <p className="text-muted-foreground text-sm">{t('generatedDocuments.deleteConfirm')}</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</Button>
              <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)} disabled={deleteDoc.isPending}>
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllGeneratedDocuments;
