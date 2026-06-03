import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRobotRuns, useLatestRobotRun } from '../../hooks/useRobotRuns';
import { robotRunsApi } from '../../api/robotRuns';
import { RobotRun, RobotRunStatus } from '../../types';
import { useQueryClient } from '@tanstack/react-query';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Bot, RefreshCw, ChevronLeft, ChevronRight, MoreHorizontal, RotateCcw, Eye, Loader2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import RobotUploadCard from '../../components/admin/RobotUploadCard';
import { useToast } from '../../hooks/useToast';

const STATUS_COLORS: Record<RobotRunStatus, string> = {
  RUNNING:     'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  SUCCESS:     'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  FAILED:      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  PARTIAL:     'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  ROLLED_BACK: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 line-through',
};

function StatusBadge({ status }: { status: RobotRunStatus }) {
  const { t } = useTranslation();
  const label: Record<RobotRunStatus, string> = {
    RUNNING:     t('robotRuns.status.running'),
    SUCCESS:     t('robotRuns.status.success'),
    FAILED:      t('robotRuns.status.failed'),
    PARTIAL:     t('robotRuns.status.partial'),
    ROLLED_BACK: t('admin.robot.statuses.rolledBack', 'Rolled Back'),
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? ''}`}>
      {status === 'RUNNING' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-1.5" />}
      {label[status] ?? status}
    </span>
  );
}

function formatDuration(start: string, end?: string): string {
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const diff = Math.floor((e - s) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ${diff % 60}s`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

const ROLLBACK_ALLOWED: RobotRunStatus[] = ['SUCCESS', 'PARTIAL', 'FAILED'];

export default function RobotRuns() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [page, setPage] = useState(0);
  const [selectedRun, setSelectedRun] = useState<RobotRun | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<RobotRun | null>(null);
  const [rollbacking, setRollbacking] = useState(false);

  const { data: latest } = useLatestRobotRun();
  const hasRunning = latest?.status === 'RUNNING';

  const { data, isLoading, refetch, isFetching } = useRobotRuns(page, 20, !!hasRunning);

  const runs = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;

  const handleRefetch = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ['robot-runs', 'latest'] });
  };

  const handleRollbackConfirm = async () => {
    if (!rollbackTarget) return;
    setRollbacking(true);
    try {
      await robotRunsApi.rollback(rollbackTarget.id);
      toast({ title: t('admin.robot.rollbackSuccess', 'Run rolled back successfully'), variant: 'success' });
      setRollbackTarget(null);
      handleRefetch();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Unknown error';
      toast({ title: t('admin.robot.rollbackError', 'Rollback failed') + ': ' + msg, variant: 'destructive' });
    } finally {
      setRollbacking(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t('robotRuns.title')}
        description={t('robotRuns.subtitle')}
        icon={Bot}
        actions={
          <Button variant="outline" size="sm" onClick={handleRefetch} disabled={isFetching}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            {t('common.refresh', 'Refresh')}
          </Button>
        }
      />

      {/* Upload card */}
      <RobotUploadCard onRunStarted={() => setTimeout(handleRefetch, 2000)} />

      {/* Latest run card */}
      {latest && (
        <div className="rounded-xl border border-border bg-card p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1 space-y-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              {t('robotRuns.latestRun')}
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <StatusBadge status={latest.status} />
              <span className="text-sm text-muted-foreground">{formatDate(latest.startedAt)}</span>
              {latest.sourceFile && (
                <code className="text-xs bg-muted px-2 py-0.5 rounded">{latest.sourceFile}</code>
              )}
            </div>
            <div className="flex gap-4 text-sm text-muted-foreground pt-1">
              <span>✅ {latest.generatedCount ?? 0} generated</span>
              <span>📋 {latest.processedCount ?? 0} processed</span>
              {latest.errorCount > 0 && <span className="text-red-500">❌ {latest.errorCount} errors</span>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setSelectedRun(latest)}>
            {t('robotRuns.viewDetails')}
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">{t('robotRuns.columns.id')}</TableHead>
              <TableHead>{t('robotRuns.columns.sourceFile')}</TableHead>
              <TableHead>{t('robotRuns.columns.startedAt')}</TableHead>
              <TableHead>{t('robotRuns.columns.duration')}</TableHead>
              <TableHead>{t('robotRuns.columns.status')}</TableHead>
              <TableHead className="text-center">{t('robotRuns.columns.processed')}</TableHead>
              <TableHead className="text-center">{t('robotRuns.columns.errors')}</TableHead>
              <TableHead className="text-center">{t('robotRuns.columns.generated')}</TableHead>
              <TableHead className="w-16">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                  <Bot className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  {t('robotRuns.noRuns')}
                </TableCell>
              </TableRow>
            ) : (
              runs.map((run) => (
                <TableRow key={run.id} className={`hover:bg-accent/50 transition-colors ${run.status === 'ROLLED_BACK' ? 'opacity-60' : ''}`}>
                  <TableCell className="font-mono text-sm text-muted-foreground">#{run.id}</TableCell>
                  <TableCell>
                    {run.sourceFile
                      ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{run.sourceFile}</code>
                      : <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-sm">{formatDate(run.startedAt)}</TableCell>
                  <TableCell className="text-sm font-mono">
                    {formatDuration(run.startedAt, run.finishedAt)}
                  </TableCell>
                  <TableCell><StatusBadge status={run.status} /></TableCell>
                  <TableCell className="text-center text-sm">{run.processedCount ?? 0}</TableCell>
                  <TableCell className="text-center text-sm">
                    <span className={run.errorCount > 0 ? 'text-red-500 font-medium' : ''}>
                      {run.errorCount ?? 0}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-sm text-green-600 font-medium">
                    {run.generatedCount ?? 0}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="w-8 h-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setSelectedRun(run)}>
                          <Eye className="w-4 h-4 mr-2" />
                          {t('admin.robot.actions.viewDetails', 'View Details')}
                        </DropdownMenuItem>
                        {ROLLBACK_ALLOWED.includes(run.status) && (
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => setRollbackTarget(run)}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            {t('admin.robot.actions.rollback', 'Rollback')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{t('common.page', 'Page')} {page + 1} / {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail modal */}
      <Dialog open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <Bot className="w-5 h-5" />
              {t('robotRuns.details.title')} #{selectedRun?.id}
              {selectedRun && <StatusBadge status={selectedRun.status} />}
            </DialogTitle>
          </DialogHeader>
          {selectedRun && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">{t('robotRuns.columns.startedAt')}</p>
                  <p>{formatDate(selectedRun.startedAt)}</p>
                </div>
                {selectedRun.finishedAt && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">{t('robotRuns.columns.finishedAt')}</p>
                    <p>{formatDate(selectedRun.finishedAt)}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">{t('robotRuns.columns.duration')}</p>
                  <p className="font-mono">{formatDuration(selectedRun.startedAt, selectedRun.finishedAt)}</p>
                </div>
                {selectedRun.triggeredBy && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">{t('robotRuns.triggeredBy')}</p>
                    <p>{selectedRun.triggeredBy}</p>
                  </div>
                )}
                {selectedRun.sourceFile && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">{t('robotRuns.columns.sourceFile')}</p>
                    <code className="text-sm bg-muted px-2 py-1 rounded block">{selectedRun.sourceFile}</code>
                  </div>
                )}
                {selectedRun.rolledBackAt && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">
                      {t('admin.robot.rolledBackAt', 'Rolled back')}
                    </p>
                    <p className="text-sm">
                      {formatDate(selectedRun.rolledBackAt)}
                      {selectedRun.rolledBackByName && ` by ${selectedRun.rolledBackByName}`}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-6 text-sm">
                <div className="text-center">
                  <p className="text-2xl font-bold">{selectedRun.processedCount ?? 0}</p>
                  <p className="text-muted-foreground text-xs">{t('robotRuns.columns.processed')}</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedRun.generatedCount ?? 0}</p>
                  <p className="text-muted-foreground text-xs">{t('robotRuns.columns.generated')}</p>
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${selectedRun.errorCount > 0 ? 'text-red-500' : ''}`}>
                    {selectedRun.errorCount ?? 0}
                  </p>
                  <p className="text-muted-foreground text-xs">{t('robotRuns.columns.errors')}</p>
                </div>
              </div>

              {selectedRun.summary && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t('robotRuns.details.summary')}</p>
                  <p className="text-sm bg-muted rounded-lg p-3 whitespace-pre-wrap">{selectedRun.summary}</p>
                </div>
              )}

              {selectedRun.errorLog ? (
                <div>
                  <p className="text-xs font-medium text-red-500 uppercase tracking-wide mb-2">{t('robotRuns.details.errorLog')}</p>
                  <pre className="text-xs bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-60">
                    {selectedRun.errorLog}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">{t('robotRuns.details.noErrors')}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rollback confirm dialog */}
      <Dialog open={!!rollbackTarget} onOpenChange={(open) => { if (!open && !rollbacking) setRollbackTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <RotateCcw className="w-5 h-5" />
              {t('admin.robot.rollbackConfirm.title', 'Confirm Rollback')}
            </DialogTitle>
            <DialogDescription>
              {t('admin.robot.rollbackConfirm.description',
                `This will soft-delete all documents generated by run #${rollbackTarget?.id} (${rollbackTarget?.generatedCount ?? 0} documents). Teachers will be notified. This action cannot be undone.`
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setRollbackTarget(null)} disabled={rollbacking}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleRollbackConfirm} disabled={rollbacking}>
              {rollbacking ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              {t('admin.robot.rollbackConfirm.confirm', 'Rollback')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
