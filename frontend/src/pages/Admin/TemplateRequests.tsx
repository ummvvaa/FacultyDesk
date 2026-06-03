import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import {
  FileText, Clock, CheckCircle, XCircle, AlertCircle, Loader2, Eye, ChevronRight, Send
} from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { templateRequestsApi } from '../../api/templateRequests';
import { templatesApi } from '../../api/templates';
import { TemplateRequest, RequestStatus, Template } from '../../types';
import { useToast } from '../../hooks/useToast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const TABS: RequestStatus[] = ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'];

const REQUEST_STATUS_STYLE: Record<RequestStatus, { cls: string; icon: React.ReactNode; label: string }> = {
  PENDING: { cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3 h-3" />, label: 'PENDING' },
  IN_PROGRESS: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Loader2 className="w-3 h-3" />, label: 'IN_PROGRESS' },
  COMPLETED: { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" />, label: 'COMPLETED' },
  REJECTED: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3 h-3" />, label: 'REJECTED' },
  CANCELLED: { cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: <AlertCircle className="w-3 h-3" />, label: 'CANCELLED' },
};

const SELECT_CLS = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function toCamel(val: string): string {
  return val.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

const AdminTemplateRequests: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const locale = i18n.language === 'ru' ? ru : undefined;

  const [activeTab, setActiveTab] = useState<RequestStatus | ''>('PENDING');
  const [page, setPage] = useState(0);

  // Detail modal
  const [detailReq, setDetailReq] = useState<TemplateRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Update status modal
  const [updateReq, setUpdateReq] = useState<TemplateRequest | null>(null);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<RequestStatus>('IN_PROGRESS');
  const [updateResponse, setUpdateResponse] = useState('');
  const [updateTemplateId, setUpdateTemplateId] = useState<string>('');
  const [updateSubmitting, setUpdateSubmitting] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-template-requests', activeTab, page],
    queryFn: () => templateRequestsApi.getAdminAll({ page, size: 20, status: activeTab as RequestStatus | '' || undefined }),
  });

  const { data: allTemplates } = useQuery({
    queryKey: ['templates-all'],
    queryFn: () => templatesApi.getAll(),
  });

  const handleOpenUpdate = (req: TemplateRequest) => {
    setUpdateReq(req);
    setUpdateStatus(req.status === 'PENDING' ? 'IN_PROGRESS' : req.status);
    setUpdateResponse(req.adminResponse || '');
    setUpdateTemplateId(req.createdTemplate?.id?.toString() || '');
    setUpdateOpen(true);
  };

  const handleSubmitUpdate = async () => {
    if (!updateReq) return;
    setUpdateSubmitting(true);
    try {
      await templateRequestsApi.adminUpdate(updateReq.id, {
        status: updateStatus,
        adminResponse: updateResponse || undefined,
        linkToTemplateId: updateTemplateId ? parseInt(updateTemplateId) : undefined,
      });
      toast({ title: t('templateRequests.admin.actions.updateSuccess'), variant: 'success' });
      setUpdateOpen(false);
      qc.invalidateQueries({ queryKey: ['admin-template-requests'] });
      qc.invalidateQueries({ queryKey: ['template-requests-pending-count'] });
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setUpdateSubmitting(false);
    }
  };

  const handleCreateFromRequest = (req: TemplateRequest) => {
    navigate('/templates', { state: { prefill: { name: req.title, description: req.description, templateCategory: req.suggestedCategory } } });
  };

  const requests = data?.content || [];
  const total = data?.totalElements || 0;
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('templateRequests.admin.title')}
        description={t('templateRequests.admin.subtitle')}
        icon={FileText}
      />

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        <button
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === '' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
          onClick={() => { setActiveTab(''); setPage(0); }}
        >
          {t('common.filter')} (all)
        </button>
        {TABS.map((tab) => {
          const st = REQUEST_STATUS_STYLE[tab];
          return (
            <button
              key={tab}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${activeTab === tab ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
              onClick={() => { setActiveTab(tab); setPage(0); }}
            >
              {st.icon}
              {t(`templateRequests.statuses.${toCamel(tab)}`)}
            </button>
          );
        })}
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">{t('common.total')}: {total}</p>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl border border-border bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{t('templateRequests.admin.empty')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const st = REQUEST_STATUS_STYLE[req.status] || REQUEST_STATUS_STYLE.PENDING;
            return (
              <Card key={req.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4 flex-wrap">
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{req.title}</span>
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${st.cls}`}>
                          {st.icon}
                          {t(`templateRequests.statuses.${toCamel(req.status)}`)}
                        </span>
                      </div>
                      {req.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1">{req.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span>{req.requestedBy.username}</span>
                        {req.requestedBy.email && <span>{req.requestedBy.email}</span>}
                        {req.suggestedCategory && (
                          <span className="px-1.5 py-0.5 rounded bg-muted">{req.suggestedCategory}</span>
                        )}
                        <span>{format(new Date(req.createdAt), 'dd MMM yyyy', { locale })}</span>
                      </div>
                      {req.adminResponse && (
                        <p className="text-xs text-muted-foreground italic">
                          {t('templateRequests.admin.columns.adminResponse')}: {req.adminResponse}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setDetailReq(req); setDetailOpen(true); }}
                        title={t('templateRequests.admin.actions.viewDetails')}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenUpdate(req)}
                      >
                        {t('templateRequests.admin.actions.updateStatus')}
                      </Button>
                      {req.status === 'PENDING' && (
                        <Button
                          size="sm"
                          onClick={() => handleCreateFromRequest(req)}
                          title={t('templateRequests.admin.actions.createFromRequest')}
                        >
                          <ChevronRight className="w-4 h-4 mr-1" />
                          {t('templateRequests.admin.actions.create')}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            {t('common.previous')}
          </Button>
          <span className="text-sm text-muted-foreground">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
            {t('common.next')}
          </Button>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={detailOpen} onOpenChange={(v) => { if (!v) setDetailOpen(false); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('templateRequests.admin.actions.viewDetails')}</DialogTitle>
          </DialogHeader>
          {detailReq && (
            <div className="space-y-4 pt-2">
              <div>
                <p className="text-xs text-muted-foreground mb-1">{t('templateRequests.admin.columns.title')}</p>
                <p className="font-medium">{detailReq.title}</p>
              </div>
              {detailReq.description && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('templateRequests.admin.columns.description')}</p>
                  <p className="text-sm whitespace-pre-wrap">{detailReq.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('templateRequests.admin.columns.requestedBy')}</p>
                  <p className="text-sm">{detailReq.requestedBy.username}</p>
                  {detailReq.requestedBy.email && <p className="text-xs text-muted-foreground">{detailReq.requestedBy.email}</p>}
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('templateRequests.admin.columns.status')}</p>
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${REQUEST_STATUS_STYLE[detailReq.status]?.cls}`}>
                    {REQUEST_STATUS_STYLE[detailReq.status]?.icon}
                    {t(`templateRequests.statuses.${toCamel(detailReq.status)}`)}
                  </span>
                </div>
                {detailReq.suggestedCategory && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('templateRequests.admin.columns.category')}</p>
                    <p className="text-sm">{detailReq.suggestedCategory}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('templateRequests.admin.columns.createdAt')}</p>
                  <p className="text-sm">{format(new Date(detailReq.createdAt), 'dd MMM yyyy HH:mm', { locale })}</p>
                </div>
              </div>
              {detailReq.adminResponse && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('templateRequests.admin.columns.adminResponse')}</p>
                  <p className="text-sm italic text-muted-foreground">{detailReq.adminResponse}</p>
                </div>
              )}
              {detailReq.createdTemplate && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">{t('templateRequests.admin.statusUpdate.linkLabel')}</p>
                  <p className="text-sm text-green-600 font-medium">{detailReq.createdTemplate.name}</p>
                </div>
              )}
              <div className="flex justify-end pt-2">
                <Button variant="outline" onClick={() => setDetailOpen(false)}>{t('common.close')}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Status Modal */}
      <Dialog open={updateOpen} onOpenChange={(v) => { if (!v) setUpdateOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('templateRequests.admin.statusUpdate.dialog')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('templateRequests.admin.statusUpdate.statusLabel')}</label>
              <select
                value={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.value as RequestStatus)}
                className={SELECT_CLS}
              >
                {(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'] as RequestStatus[]).map((s) => (
                  <option key={s} value={s}>{t(`templateRequests.statuses.${toCamel(s)}`)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('templateRequests.admin.statusUpdate.responseLabel')}</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder={t('templateRequests.admin.statusUpdate.responsePlaceholder')}
                value={updateResponse}
                onChange={(e) => setUpdateResponse(e.target.value)}
                rows={3}
              />
            </div>
            {updateStatus === 'COMPLETED' && (
              <div className="space-y-1">
                <label className="text-sm font-medium">{t('templateRequests.admin.statusUpdate.linkLabel')}</label>
                <select
                  value={updateTemplateId}
                  onChange={(e) => setUpdateTemplateId(e.target.value)}
                  className={SELECT_CLS}
                >
                  <option value="">{t('templateRequests.admin.statusUpdate.linkPlaceholder')}</option>
                  {allTemplates?.map((tmpl) => (
                    <option key={tmpl.id} value={String(tmpl.id)}>{tmpl.name}</option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setUpdateOpen(false)} disabled={updateSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSubmitUpdate} disabled={updateSubmitting}>
                {updateSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {t('templateRequests.admin.statusUpdate.submit')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminTemplateRequests;
