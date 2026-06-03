import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronUp, FileText, ClipboardCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Skeleton } from '../../components/ui/skeleton';
import { Separator } from '../../components/ui/separator';
import { Label } from '../../components/ui/label';

import {
  useAdminPublications,
  useVerifyPublication,
  useRejectPublication,
  useNeedsCorrectionPublication,
  usePublicationFiles,
} from '../../hooks/usePublications';
import { publicationsApi } from '../../api/publications';
import {
  Publication,
  DatabaseType,
  PublicationStatus,
  Quartile,
  PublicationAdminFilters,
} from '../../types';

const DB_TYPES: { value: DatabaseType; labelKey: string }[] = [
  { value: 'SCOPUS', labelKey: 'scopus' },
  { value: 'WEB_OF_SCIENCE', labelKey: 'webOfScience' },
  { value: 'KOKSON', labelKey: 'kokson' },
  { value: 'OTHER', labelKey: 'other' },
];

const PUB_STATUSES: { value: PublicationStatus; labelKey: string }[] = [
  { value: 'DRAFT', labelKey: 'draft' },
  { value: 'SUBMITTED', labelKey: 'submitted' },
  { value: 'UNDER_REVIEW', labelKey: 'underReview' },
  { value: 'VERIFIED', labelKey: 'verified' },
  { value: 'REJECTED', labelKey: 'rejected' },
  { value: 'NEEDS_CORRECTION', labelKey: 'needsCorrection' },
];

const QUARTILES: Quartile[] = ['Q1', 'Q2', 'Q3', 'Q4', 'NONE'];

const FILE_TYPE_LABELS: Record<string, string> = {
  PDF_ARTICLE: 'PDF Article',
  OTTISK: 'Ottisk',
  CERTIFICATE: 'Certificate',
  JOURNAL_PAGE_SCAN: 'Journal Page Scan',
  DOI_CONFIRMATION: 'DOI Confirmation',
  OTHER: 'Other',
};

function statusBadgeVariant(s: PublicationStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (s) {
    case 'VERIFIED': return 'default';
    case 'REJECTED': return 'destructive';
    case 'DRAFT': return 'outline';
    default: return 'secondary';
  }
}

function quartileBadgeClass(q: Quartile) {
  switch (q) {
    case 'Q1': return 'bg-green-100 text-green-800';
    case 'Q2': return 'bg-blue-100 text-blue-800';
    case 'Q3': return 'bg-yellow-100 text-yellow-800';
    case 'Q4': return 'bg-orange-100 text-orange-800';
    default: return 'bg-muted text-muted-foreground';
  }
}

// --- Detail modal ---
function DetailModal({ pub, open, onClose }: { pub: Publication; open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { data: files = [], isLoading: filesLoading } = usePublicationFiles(open ? pub.id : null);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold leading-snug pr-8">{pub.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">{t('publications.form.authors')}: </span>{pub.authors}</div>
            <div><span className="text-muted-foreground">{t('publications.form.year')}: </span>{pub.publicationYear ?? '—'}</div>
            <div><span className="text-muted-foreground">{t('publications.form.journal')}: </span>{pub.journalName ?? '—'}</div>
            <div>
              <span className="text-muted-foreground">{t('publications.form.quartile')}: </span>
              {pub.quartile && pub.quartile !== 'NONE' ? (
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${quartileBadgeClass(pub.quartile)}`}>
                  {pub.quartile}
                </span>
              ) : '—'}
            </div>
            <div><span className="text-muted-foreground">{t('publications.form.percentile')}: </span>{pub.percentile ?? '—'}</div>
            <div>
              <span className="text-muted-foreground">DOI: </span>
              {pub.doi
                ? <a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{pub.doi}</a>
                : '—'}
            </div>
            <div>
              <span className="text-muted-foreground">URL: </span>
              {pub.url
                ? <a href={pub.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Link</a>
                : '—'}
            </div>
            <div><span className="text-muted-foreground">{t('publications.form.indexingStatus')}: </span>{pub.indexingStatus ?? '—'}</div>
            <div>
              <span className="text-muted-foreground">{t('publications.form.databaseType')}: </span>
              {t(`publications.databaseTypes.${DB_TYPES.find(d => d.value === pub.databaseType)?.labelKey ?? 'other'}`)}
            </div>
          </div>

          {pub.reviewerComment && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-xs text-muted-foreground mb-1">Reviewer comment:</p>
              <p>{pub.reviewerComment}</p>
            </div>
          )}

          <Separator />
          <p className="font-medium">Files</p>
          {filesLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : files.length === 0 ? (
            <p className="text-muted-foreground text-sm">No files attached.</p>
          ) : (
            <div className="space-y-1">
              {files.map((file) => (
                <div key={file.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <span className="text-sm truncate">{file.originalName}</span>
                    <Badge variant="outline" className="text-xs shrink-0">
                      {FILE_TYPE_LABELS[file.fileType] ?? file.fileType}
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => publicationsApi.downloadFile(file.id, file.originalName)}
                  >
                    {t('publications.actions.downloadFile')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Comment modal for reject / needs-correction ---
interface CommentModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: (comment: string) => void;
  loading: boolean;
}

function CommentModal({ open, title, onClose, onSubmit, loading }: CommentModalProps) {
  const { t } = useTranslation();
  const [comment, setComment] = useState('');

  React.useEffect(() => {
    if (open) setComment('');
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Label>Comment</Label>
          <textarea
            className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Enter your comment..."
          />
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
            <Button
              onClick={() => onSubmit(comment)}
              disabled={loading || !comment.trim()}
            >
              {t('common.save')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Row actions ---
interface ActionsProps {
  pub: Publication;
  onDetail: () => void;
}
function RowActions({ pub, onDetail }: ActionsProps) {
  const { t } = useTranslation();
  const verify = useVerifyPublication();
  const reject = useRejectPublication();
  const needsCorrection = useNeedsCorrectionPublication();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [ncOpen, setNcOpen] = useState(false);

  return (
    <>
      <div className="flex gap-1 justify-end">
        <Button size="sm" variant="ghost" onClick={onDetail}>
          {t('common.edit')}
        </Button>
        {pub.status !== 'VERIFIED' && (
          <>
            <Button
              size="sm"
              variant="ghost"
              className="text-green-600 hover:text-green-700"
              onClick={() => {
                if (window.confirm('Verify this publication?')) {
                  verify.mutate({ id: pub.id });
                }
              }}
              disabled={verify.isPending}
            >
              <CheckCircle className="w-4 h-4 mr-1" />
              {t('publications.actions.verify')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setRejectOpen(true)}
            >
              <XCircle className="w-4 h-4 mr-1" />
              {t('publications.actions.reject')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-yellow-600 hover:text-yellow-700"
              onClick={() => setNcOpen(true)}
            >
              <AlertCircle className="w-4 h-4 mr-1" />
              {t('publications.actions.needsCorrection')}
            </Button>
          </>
        )}
      </div>

      <CommentModal
        open={rejectOpen}
        title={t('publications.actions.reject')}
        onClose={() => setRejectOpen(false)}
        onSubmit={(comment) => {
          reject.mutate({ id: pub.id, comment }, { onSuccess: () => setRejectOpen(false) });
        }}
        loading={reject.isPending}
      />
      <CommentModal
        open={ncOpen}
        title={t('publications.actions.needsCorrection')}
        onClose={() => setNcOpen(false)}
        onSubmit={(comment) => {
          needsCorrection.mutate({ id: pub.id, comment }, { onSuccess: () => setNcOpen(false) });
        }}
        loading={needsCorrection.isPending}
      />
    </>
  );
}

// --- Main ---
export default function PublicationsReview() {
  const { t } = useTranslation();

  const [filters, setFilters] = useState<PublicationAdminFilters>({ page: 0, size: 20 });
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [detailPub, setDetailPub] = useState<Publication | null>(null);

  const { data, isLoading } = useAdminPublications(filters);
  const publications = data?.content ?? [];
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.number ?? 0;

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users-all'],
    queryFn: async () => {
      const { apiClient } = await import('../../api/client');
      const { data } = await apiClient.get('/users');
      return data as { id: number; username: string }[];
    },
  });

  const setFilter = <K extends keyof PublicationAdminFilters>(
    key: K,
    value: PublicationAdminFilters[K]
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 0 }));
  };

  const clearVal = (v: string) => (v === '_all' ? undefined : (v as any));

  const pubTypeLabel = (pub: Publication) => {
    const map: Record<string, string> = {
      SCOPUS_JOURNAL: 'Scopus Journal',
      SCOPUS_CONFERENCE: 'Scopus Conf.',
      WOS_ARTICLE: 'WoS Article',
      KOKSON_ARTICLE: 'KOKSON',
      LOCAL_JOURNAL: 'Local Journal',
      CONFERENCE_PAPER: 'Conference',
      PATENT: 'Patent',
      CERTIFICATE: 'Certificate',
      OTHER: 'Other',
    };
    return map[pub.publicationType] ?? pub.publicationType;
  };

  return (
    <div className="p-6">
      <PageHeader title={t('nav.publicationsReview')} icon={ClipboardCheck} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-lg bg-muted/40 border">
        <Select
          value={filters.authorId ? String(filters.authorId) : '_all'}
          onValueChange={(v) => setFilter('authorId', clearVal(v) ? Number(clearVal(v)) : undefined)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All authors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All authors</SelectItem>
            {allUsers.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.databaseType ?? '_all'}
          onValueChange={(v) => setFilter('databaseType', clearVal(v) as DatabaseType | undefined)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All databases" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All databases</SelectItem>
            {DB_TYPES.map((dt) => (
              <SelectItem key={dt.value} value={dt.value}>
                {t(`publications.databaseTypes.${dt.labelKey}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? '_all'}
          onValueChange={(v) => setFilter('status', clearVal(v) as PublicationStatus | undefined)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All statuses</SelectItem>
            {PUB_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {t(`publications.statuses.${s.labelKey}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.quartile ?? '_all'}
          onValueChange={(v) => setFilter('quartile', clearVal(v) as Quartile | undefined)}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Quartile" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All</SelectItem>
            {QUARTILES.map((q) => (
              <SelectItem key={q} value={q}>{q}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Input
            className="w-24"
            placeholder="Year from"
            value={yearFrom}
            type="number"
            onChange={(e) => {
              setYearFrom(e.target.value);
              setFilter('year', e.target.value ? Number(e.target.value) : undefined);
            }}
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setFilters({ page: 0, size: 20 });
            setYearFrom('');
            setYearTo('');
          }}
        >
          Reset
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Title</th>
                <th className="text-left px-4 py-3 font-medium">Author</th>
                <th className="text-left px-4 py-3 font-medium">Year</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">DB</th>
                <th className="text-left px-4 py-3 font-medium">Q</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : publications.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-muted-foreground">
                    No publications found.
                  </td>
                </tr>
              ) : (
                publications.map((pub) => (
                  <tr
                    key={pub.id}
                    className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setDetailPub(pub)}
                  >
                    <td className="px-4 py-3 max-w-xs">
                      <p className="font-medium truncate">{pub.title}</p>
                      {pub.doi && (
                        <p className="text-xs text-muted-foreground truncate">{pub.doi}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {pub.author?.username ?? '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{pub.publicationYear ?? '—'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs">{pubTypeLabel(pub)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant="outline" className="text-xs">
                        {t(`publications.databaseTypes.${DB_TYPES.find(d => d.value === pub.databaseType)?.labelKey ?? 'other'}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {pub.quartile && pub.quartile !== 'NONE' ? (
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${quartileBadgeClass(pub.quartile)}`}>
                          {pub.quartile}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge variant={statusBadgeVariant(pub.status)} className="text-xs">
                        {t(`publications.statuses.${pub.status.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <RowActions pub={pub} onDetail={() => setDetailPub(pub)} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
            <p className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === 0}
                onClick={() => setFilters((p) => ({ ...p, page: currentPage - 1 }))}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage + 1 >= totalPages}
                onClick={() => setFilters((p) => ({ ...p, page: currentPage + 1 }))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detailPub && (
        <DetailModal
          pub={detailPub}
          open={!!detailPub}
          onClose={() => setDetailPub(null)}
        />
      )}
    </div>
  );
}
