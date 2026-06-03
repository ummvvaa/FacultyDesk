import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Download,
  Eye,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Search,
  Inbox,
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Skeleton } from '../../components/ui/skeleton';
import { Textarea } from '../../components/ui/textarea';
import { Separator } from '../../components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

import { kkkApi } from '../../api/kkk';
import TableRowSkeleton from '../../components/skeletons/TableRowSkeleton';
import { KkkProfile, KkkStatus } from '../../types';

const ALL_STATUSES: KkkStatus[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'SUBMITTED',
  'CHECKED',
  'RETURNED_FOR_CORRECTION',
  'READY',
];

function statusKey(s: KkkStatus): string {
  return s.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function statusBadgeVariant(s: KkkStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (s) {
    case 'READY':
    case 'CHECKED':
      return 'default';
    case 'SUBMITTED':
      return 'secondary';
    case 'RETURNED_FOR_CORRECTION':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatDate(date?: string): string {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return date;
  }
}

function csvEscape(value: unknown): string {
  if (value === undefined || value === null) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// ---------- Detail modal ----------

function DetailModal({
  teacherId,
  open,
  onClose,
}: {
  teacherId: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const detailQuery = useQuery({
    queryKey: ['kkk', 'admin', 'detail', teacherId],
    queryFn: () => kkkApi.getAdminDetail(teacherId!),
    enabled: open && teacherId !== null,
  });

  const data = detailQuery.data;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('kkk.actions.viewDetails')}</DialogTitle>
        </DialogHeader>
        {detailQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : !data ? (
          <p className="text-sm text-muted-foreground">{t('common.error')}</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-medium">{data.teacherUsername}</p>
              <p className="text-xs text-muted-foreground">{data.teacherEmail ?? '—'}</p>
              <p className="text-xs mt-1">
                {t('kkk.status.label')}:{' '}
                <Badge variant={statusBadgeVariant(data.status)} className="text-xs">
                  {t(`kkk.status.${statusKey(data.status)}`)}
                </Badge>
                {' · '}
                {t('kkk.completion')}: {data.checklist.completionPercentage}%
              </p>
            </div>

            <Separator />

            <Section title={t('kkk.tabs.education')}>
              {data.educations && data.educations.length > 0 ? (
                <ul className="space-y-1">
                  {data.educations.map((e) => (
                    <li key={e.id} className="text-xs">
                      <span className="font-medium">{e.degree ?? '—'}</span>
                      {e.specialty && <> · {e.specialty}</>}
                      <span className="text-muted-foreground"> · {e.institution ?? ''}{e.year ? ` · ${e.year}` : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : <Empty />}
            </Section>

            <Section title={t('kkk.tabs.workExperience')}>
              {data.workExperiences && data.workExperiences.length > 0 ? (
                <ul className="space-y-1">
                  {data.workExperiences.map((w) => (
                    <li key={w.id} className="text-xs">
                      <span className="font-medium">{w.position ?? '—'}</span>
                      <span className="text-muted-foreground"> · {w.organization ?? ''} · {w.startYear ?? '—'}–{w.current ? t('kkk.forms.workExperience.present') : (w.endYear ?? '—')}</span>
                    </li>
                  ))}
                </ul>
              ) : <Empty />}
            </Section>

            <Section title={t('kkk.tabs.qualificationCourses')}>
              {data.qualificationCourses && data.qualificationCourses.length > 0 ? (
                <ul className="space-y-1">
                  {data.qualificationCourses.map((c) => (
                    <li key={c.id} className="text-xs">
                      <span className="font-medium">{c.name ?? '—'}</span>
                      <span className="text-muted-foreground"> · {c.organization ?? ''}{c.year ? ` · ${c.year}` : ''}{c.hours ? ` · ${c.hours}ч` : ''}</span>
                      {c.certificateFilePath && <Badge variant="outline" className="text-xs ml-2">{t('kkk.forms.qualificationCourses.certificate')}</Badge>}
                    </li>
                  ))}
                </ul>
              ) : <Empty />}
            </Section>

            <Section title={t('kkk.tabs.awards')}>
              {data.awards && data.awards.length > 0 ? (
                <ul className="space-y-1">
                  {data.awards.map((a) => (
                    <li key={a.id} className="text-xs">
                      <span className="font-medium">{a.name ?? '—'}</span>
                      <span className="text-muted-foreground"> · {a.organization ?? ''}{a.year ? ` · ${a.year}` : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : <Empty />}
            </Section>

            <Section title={t('kkk.tabs.patents')}>
              {data.patents && data.patents.length > 0 ? (
                <ul className="space-y-1">
                  {data.patents.map((p) => (
                    <li key={p.id} className="text-xs">
                      <span className="font-medium">{p.title ?? '—'}</span>
                      <span className="text-muted-foreground"> · {p.patentNumber ?? ''}{p.year ? ` · ${p.year}` : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : <Empty />}
            </Section>

            <Section title={t('kkk.checklistTitle')}>
              <ul className="grid grid-cols-2 gap-1 text-xs">
                <ChecklistRow done={data.checklist.profileCompleted} label={t('kkk.checklist.profileCompleted')} />
                <ChecklistRow done={data.checklist.educationAdded} label={`${t('kkk.checklist.educationAdded')} (${data.checklist.educationCount})`} />
                <ChecklistRow done={data.checklist.workExperienceAdded} label={`${t('kkk.checklist.workExperienceAdded')} (${data.checklist.workExperienceCount})`} />
                <ChecklistRow done={data.checklist.qualificationCoursesLast3Years} label={`${t('kkk.checklist.qualificationCoursesLast3Years')} (${data.checklist.qualificationCoursesCount})`} />
                <ChecklistRow done={data.checklist.publicationsLast5Years} label={`${t('kkk.checklist.publicationsLast5Years')} (${data.checklist.publicationsCount})`} />
                <ChecklistRow done={data.checklist.doiLinksAdded} label={t('kkk.checklist.doiLinksAdded')} />
                <ChecklistRow done={data.checklist.confirmationFilesUploaded} label={t('kkk.checklist.confirmationFilesUploaded')} />
                <ChecklistRow done={data.checklist.awardsPatentsAdded} label={`${t('kkk.checklist.awardsPatentsAdded')} (${data.checklist.awardsPatentsCount})`} />
                <ChecklistRow done={data.checklist.englishLevelAdded} label={t('kkk.checklist.englishLevelAdded')} />
              </ul>
            </Section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="font-semibold text-sm mb-1">{title}</h4>
      {children}
    </div>
  );
}

function Empty() {
  const { t } = useTranslation();
  return <p className="text-xs text-muted-foreground">{t('kkk.emptyStates.generic')}</p>;
}

function ChecklistRow({ done, label }: { done: boolean; label: string }) {
  return (
    <li className={`flex items-center gap-1 ${done ? 'text-green-700 dark:text-green-300' : 'text-muted-foreground'}`}>
      <span>{done ? '✓' : '✗'}</span>
      <span>{label}</span>
    </li>
  );
}

// ---------- Status modal ----------

function StatusModal({
  profile,
  newStatus,
  open,
  onClose,
}: {
  profile: KkkProfile | null;
  newStatus: KkkStatus | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [comment, setComment] = useState('');

  React.useEffect(() => {
    if (open) setComment('');
  }, [open]);

  const mutation = useMutation({
    mutationFn: () =>
      kkkApi.updateStatus(profile!.id, newStatus!, comment.trim() || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kkk', 'admin'] });
      onClose();
    },
  });

  const requiresComment = newStatus === 'RETURNED_FOR_CORRECTION';

  if (!profile || !newStatus) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t(`kkk.actions.${actionKeyForStatus(newStatus)}`)}: {profile.teacherUsername}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('kkk.status.transitionTo')}:{' '}
            <Badge variant={statusBadgeVariant(newStatus)} className="text-xs">
              {t(`kkk.status.${statusKey(newStatus)}`)}
            </Badge>
          </p>
          <div className="space-y-1">
            <label className="text-sm font-medium">
              {t('kkk.alerts.reviewerComment')}
              {requiresComment ? ' *' : ''}
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder={t('kkk.alerts.commentPlaceholder')}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || (requiresComment && !comment.trim())}
          >
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function actionKeyForStatus(s: KkkStatus): string {
  switch (s) {
    case 'CHECKED': return 'markChecked';
    case 'READY': return 'markReady';
    case 'RETURNED_FOR_CORRECTION': return 'returnForCorrection';
    default: return 'changeStatus';
  }
}

// ---------- Main page ----------

const KkkSubmissions: React.FC = () => {
  const { t } = useTranslation();

  const [search, setSearch] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Set<KkkStatus>>(new Set());
  const [minCompletion, setMinCompletion] = useState(0);
  const [maxCompletion, setMaxCompletion] = useState(100);
  const [sortBy, setSortBy] = useState<'completionDesc' | 'submittedDesc'>('submittedDesc');

  const [detailTeacherId, setDetailTeacherId] = useState<number | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const [statusModalState, setStatusModalState] = useState<{
    profile: KkkProfile | null;
    newStatus: KkkStatus | null;
  }>({ profile: null, newStatus: null });

  // Fetch a large page; status filter is multi-select on client.
  const query = useQuery({
    queryKey: ['kkk', 'admin', 'all'],
    queryFn: () => kkkApi.getAdminAll({ page: 0, size: 200 }),
  });

  // Filter out empty placeholder DTOs (backend returns empty builder when out of completion range)
  const validProfiles = useMemo(
    () => (query.data?.content ?? []).filter((p) => p.teacherId !== undefined && p.teacherId !== null),
    [query.data]
  );

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    let result = validProfiles.filter((p) => {
      if (selectedStatuses.size > 0 && !selectedStatuses.has(p.status)) return false;
      const pct = p.checklist?.completionPercentage ?? 0;
      if (pct < minCompletion || pct > maxCompletion) return false;
      if (s) {
        const hay = `${p.teacherUsername ?? ''} ${p.teacherEmail ?? ''}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
    if (sortBy === 'completionDesc') {
      result = [...result].sort(
        (a, b) => (b.checklist?.completionPercentage ?? 0) - (a.checklist?.completionPercentage ?? 0)
      );
    } else {
      result = [...result].sort((a, b) => {
        const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
        const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
        return tb - ta;
      });
    }
    return result;
  }, [validProfiles, selectedStatuses, minCompletion, maxCompletion, search, sortBy]);

  const summary = useMemo(() => {
    const total = validProfiles.length;
    const submitted = validProfiles.filter((p) => p.status === 'SUBMITTED').length;
    const ready = validProfiles.filter((p) => p.status === 'READY').length;
    const returned = validProfiles.filter((p) => p.status === 'RETURNED_FOR_CORRECTION').length;
    const avg = total === 0
      ? 0
      : Math.round(
          validProfiles.reduce((s, p) => s + (p.checklist?.completionPercentage ?? 0), 0) / total
        );
    return { total, submitted, ready, returned, avg };
  }, [validProfiles]);

  const toggleStatus = (s: KkkStatus) => {
    setSelectedStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  const handleExportPdf = async (p: KkkProfile) => {
    const date = new Date().toISOString().slice(0, 10);
    const filename = `kkk_${p.teacherUsername}_${date}.pdf`;
    try {
      await kkkApi.exportPdf(p.teacherId, filename);
    } catch {
      window.alert(t('kkk.alerts.exportFailed'));
    }
  };

  const handleExportCsv = () => {
    const header = [
      t('kkk.csv.teacher'),
      t('kkk.csv.email'),
      t('kkk.csv.completion'),
      t('kkk.csv.status'),
      t('kkk.csv.submittedAt'),
      t('kkk.csv.checkedAt'),
    ];
    const rows: string[][] = filtered.map((p) => [
      p.teacherUsername ?? '',
      p.teacherEmail ?? '',
      String(p.checklist?.completionPercentage ?? 0),
      p.status,
      p.submittedAt ?? '',
      p.checkedAt ?? '',
    ]);
    downloadCsv(`kkk_summary_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...rows]);
  };

  const openStatusModal = (profile: KkkProfile, newStatus: KkkStatus) => {
    setStatusModalState({ profile, newStatus });
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t('kkk.adminTitle')}
        icon={Inbox}
        actions={
          <Button variant="outline" onClick={handleExportCsv}>
            <Download className="w-4 h-4 mr-2" />
            {t('kkk.actions.exportSummary')}
          </Button>
        }
      />

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label={t('kkk.summary.total')} value={summary.total} />
        <SummaryCard label={t('kkk.summary.submitted')} value={summary.submitted} />
        <SummaryCard label={t('kkk.summary.ready')} value={summary.ready} />
        <SummaryCard label={t('kkk.summary.returned')} value={summary.returned} />
        <SummaryCard label={t('kkk.summary.avgCompletion')} value={`${summary.avg}%`} />
      </div>

      {/* Filters */}
      <div className="border rounded-lg p-4 bg-card space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={t('kkk.filters.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('kkk.filters.sortBy')}:</span>
            <select
              className="border rounded-md px-2 py-1 text-sm bg-background"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'completionDesc' | 'submittedDesc')}
            >
              <option value="submittedDesc">{t('kkk.filters.sortSubmittedDesc')}</option>
              <option value="completionDesc">{t('kkk.filters.sortCompletionDesc')}</option>
            </select>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">{t('kkk.filters.status')}</p>
          <div className="flex flex-wrap gap-1.5">
            {ALL_STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                className={`text-xs px-2 py-1 rounded-full border transition ${
                  selectedStatuses.has(s)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-accent'
                }`}
              >
                {t(`kkk.status.${statusKey(s)}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1">
            {t('kkk.filters.completionRange')}: {minCompletion}% — {maxCompletion}%
          </p>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={100}
              value={minCompletion}
              onChange={(e) => setMinCompletion(Math.min(Number(e.target.value), maxCompletion))}
              className="flex-1"
            />
            <input
              type="range"
              min={0}
              max={100}
              value={maxCompletion}
              onChange={(e) => setMaxCompletion(Math.max(Number(e.target.value), minCompletion))}
              className="flex-1"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card overflow-hidden">
        {query.isLoading ? (
          <Table>
            <TableBody><TableRowSkeleton rows={8} cols={5} /></TableBody>
          </Table>
        ) : filtered.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {t('kkk.emptyStates.adminTable')}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('kkk.table.teacher')}</TableHead>
                <TableHead>{t('kkk.table.completion')}</TableHead>
                <TableHead>{t('kkk.table.status')}</TableHead>
                <TableHead>{t('kkk.table.submittedAt')}</TableHead>
                <TableHead>{t('kkk.table.lastUpdate')}</TableHead>
                <TableHead className="text-right">{t('kkk.table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const pct = p.checklist?.completionPercentage ?? 0;
                return (
                  <TableRow key={p.id ?? p.teacherId}>
                    <TableCell>
                      <div className="font-medium text-sm">{p.teacherUsername}</div>
                      <div className="text-xs text-muted-foreground">{p.teacherEmail ?? '—'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 w-32">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium">{pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusBadgeVariant(p.status)} className="text-xs">
                        {t(`kkk.status.${statusKey(p.status)}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(p.submittedAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(p.updatedAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1 flex-wrap">
                        <Button
                          size="sm"
                          variant="ghost"
                          title={t('kkk.actions.viewDetails')}
                          onClick={() => {
                            setDetailTeacherId(p.teacherId);
                            setDetailOpen(true);
                          }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title={t('kkk.actions.markChecked')}
                          onClick={() => openStatusModal(p, 'CHECKED')}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title={t('kkk.actions.returnForCorrection')}
                          onClick={() => openStatusModal(p, 'RETURNED_FOR_CORRECTION')}
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title={t('kkk.actions.markReady')}
                          onClick={() => openStatusModal(p, 'READY')}
                        >
                          <ShieldCheck className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title={t('kkk.actions.exportPdf')}
                          onClick={() => handleExportPdf(p)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <DetailModal
        teacherId={detailTeacherId}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
      <StatusModal
        profile={statusModalState.profile}
        newStatus={statusModalState.newStatus}
        open={statusModalState.profile !== null && statusModalState.newStatus !== null}
        onClose={() => setStatusModalState({ profile: null, newStatus: null })}
      />
    </div>
  );
};

function SummaryCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

export default KkkSubmissions;
