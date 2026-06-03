import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Skeleton } from '../../components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog';
import { passwordResetsApi, PasswordResetRequest, PasswordResetStatus } from '../../api/auth';
import { useToast } from '../../hooks/useToast';

type Mode = 'generate' | 'custom';

const PasswordResetRequests: React.FC = () => {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const [status, setStatus] = useState<PasswordResetStatus>('PENDING');
  const [page, setPage] = useState(0);

  const [approveReq, setApproveReq] = useState<PasswordResetRequest | null>(null);
  const [approveMode, setApproveMode] = useState<Mode>('generate');
  const [approveCustom, setApproveCustom] = useState('');
  const [resultPassword, setResultPassword] = useState<{ password: string; username: string } | null>(null);

  const [rejectReq, setRejectReq] = useState<PasswordResetRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const listQuery = useQuery({
    queryKey: ['passwordResets', status, page],
    queryFn: () => passwordResetsApi.list(status, page, 20),
  });

  const pendingCountQuery = useQuery({
    queryKey: ['passwordResets', 'pending-count'],
    queryFn: () => passwordResetsApi.pendingCount(),
    refetchInterval: 60_000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, password }: { id: number; password?: string }) =>
      passwordResetsApi.approve(id, password),
    onSuccess: (data, variables) => {
      const username = approveReq?.user.username ?? '';
      setApproveReq(null);
      setApproveCustom('');
      setResultPassword({ password: data.newPassword, username });
      toast({
        title: t('admin.passwordResets.success.requestApproved'),
        description: t('admin.passwordResets.warning.shareSecurely'),
        variant: 'success',
      });
      qc.invalidateQueries({ queryKey: ['passwordResets'] });
    },
    onError: (err: any) => {
      toast({
        title: t('common.error'),
        description: err.response?.data?.message || err.message,
        variant: 'destructive',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      passwordResetsApi.reject(id, reason),
    onSuccess: () => {
      setRejectReq(null);
      setRejectReason('');
      toast({ title: t('admin.passwordResets.success.requestRejected'), variant: 'success' });
      qc.invalidateQueries({ queryKey: ['passwordResets'] });
    },
    onError: (err: any) => {
      toast({
        title: t('common.error'),
        description: err.response?.data?.message || err.message,
        variant: 'destructive',
      });
    },
  });

  const handleApproveSubmit = () => {
    if (!approveReq) return;
    if (approveMode === 'custom' && approveCustom.trim().length < 6) {
      toast({ title: t('common.error'), description: 'Password too short', variant: 'destructive' });
      return;
    }
    approveMutation.mutate({
      id: approveReq.id,
      password: approveMode === 'custom' ? approveCustom.trim() : undefined,
    });
  };

  const handleRejectSubmit = () => {
    if (!rejectReq) return;
    rejectMutation.mutate({ id: rejectReq.id, reason: rejectReason.trim() });
  };

  const copyPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    toast({ title: t('admin.passwordResets.success.passwordCopied'), variant: 'success' });
  };

  const statusBadge = (s: PasswordResetStatus) => {
    const variant: 'default' | 'secondary' | 'destructive' | 'outline' =
      s === 'APPROVED' ? 'default' : s === 'REJECTED' ? 'destructive' : s === 'PENDING' ? 'secondary' : 'outline';
    return <Badge variant={variant}>{t(`admin.passwordResets.statuses.${s.toLowerCase()}`)}</Badge>;
  };

  const requests = listQuery.data?.content ?? [];
  const totalPages = listQuery.data?.totalPages ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('admin.passwordResets.title')}
        icon={KeyRound}
        actions={
          pendingCountQuery.data && pendingCountQuery.data.count > 0 ? (
            <Badge variant="secondary">
              {pendingCountQuery.data.count} {t('admin.passwordResets.tabs.pending')}
            </Badge>
          ) : null
        }
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {(['PENDING', 'APPROVED', 'REJECTED'] as PasswordResetStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(0);
            }}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              status === s
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`admin.passwordResets.tabs.${s.toLowerCase()}`)}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="border rounded-lg bg-card overflow-hidden">
        {listQuery.isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {t('admin.passwordResets.empty', { defaultValue: 'No requests' })}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr className="text-left">
                <th className="px-4 py-2 font-medium">{t('admin.passwordResets.columns.user')}</th>
                <th className="px-4 py-2 font-medium">{t('admin.passwordResets.columns.reason')}</th>
                <th className="px-4 py-2 font-medium">{t('admin.passwordResets.columns.requested')}</th>
                <th className="px-4 py-2 font-medium">{t('admin.passwordResets.columns.status')}</th>
                <th className="px-4 py-2 font-medium text-right">{t('admin.passwordResets.columns.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="border-b last:border-b-0 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{req.user.username}</div>
                    {req.user.email && (
                      <div className="text-xs text-muted-foreground">{req.user.email}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    <div className="truncate" title={req.reason}>
                      {req.reason}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(req.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">{statusBadge(req.status)}</td>
                  <td className="px-4 py-3 text-right">
                    {req.status === 'PENDING' && (
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          onClick={() => {
                            setApproveReq(req);
                            setApproveMode('generate');
                            setApproveCustom('');
                          }}
                        >
                          {t('admin.passwordResets.actions.approve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setRejectReq(req);
                            setRejectReason('');
                          }}
                        >
                          {t('admin.passwordResets.actions.reject')}
                        </Button>
                      </div>
                    )}
                    {req.status !== 'PENDING' && req.adminNote && (
                      <span className="text-xs text-muted-foreground">{req.adminNote}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
            {t('common.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">
            {page + 1} / {totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            {t('common.next')}
          </Button>
        </div>
      )}

      {/* Approve dialog */}
      <Dialog open={!!approveReq} onOpenChange={(v) => { if (!v) setApproveReq(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.passwordResets.approveDialog.title')}</DialogTitle>
            <DialogDescription>{t('admin.passwordResets.approveDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="generate"
                checked={approveMode === 'generate'}
                onChange={() => setApproveMode('generate')}
              />
              <span className="text-sm">{t('admin.passwordResets.approveDialog.generateRadio')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="custom"
                checked={approveMode === 'custom'}
                onChange={() => setApproveMode('custom')}
              />
              <span className="text-sm">{t('admin.passwordResets.approveDialog.customRadio')}</span>
            </label>
            {approveMode === 'custom' && (
              <div className="space-y-1">
                <Label htmlFor="custom-pwd">{t('admin.passwordResets.approveDialog.passwordLabel')}</Label>
                <Input
                  id="custom-pwd"
                  type="text"
                  value={approveCustom}
                  onChange={(e) => setApproveCustom(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveReq(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleApproveSubmit} disabled={approveMutation.isPending}>
              {t('admin.passwordResets.approveDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectReq} onOpenChange={(v) => { if (!v) setRejectReq(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.passwordResets.rejectDialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <Label htmlFor="reject-reason">{t('admin.passwordResets.rejectDialog.reasonLabel')}</Label>
            <Textarea
              id="reject-reason"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectReq(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleRejectSubmit} disabled={rejectMutation.isPending}>
              {t('admin.passwordResets.rejectDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result dialog */}
      <Dialog open={!!resultPassword} onOpenChange={(v) => { if (!v) setResultPassword(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              {t('admin.passwordResets.success.requestApproved')}
            </DialogTitle>
          </DialogHeader>
          {resultPassword && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('admin.passwordResets.warning.shareSecurely')}
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded font-mono text-sm tabular-nums">
                  {resultPassword.password}
                </code>
                <Button size="sm" variant="outline" onClick={() => copyPassword(resultPassword.password)}>
                  <Copy className="w-4 h-4 mr-1" />
                  {t('common.copy')}
                </Button>
              </div>
              <div className="flex items-start gap-2 p-3 text-sm text-warning bg-warning/10 border border-warning/20 rounded-md">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{t('admin.passwordResets.warning.shareSecurely')}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResultPassword(null)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PasswordResetRequests;
