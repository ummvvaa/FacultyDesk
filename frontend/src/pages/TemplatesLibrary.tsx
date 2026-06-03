import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  FileText, FileSpreadsheet, File, Download, ExternalLink, Sparkles, X, Loader2,
  Library, Eye, Plus, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from '../components/ui/dialog';
import PinButton from '../components/dashboard/PinButton';
import PageHeader from '../components/layout/PageHeader';
import TemplatePreviewModal from '../components/templates/TemplatePreviewModal';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow, format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { templatesApi } from '../api/templates';
import { templateRequestsApi } from '../api/templateRequests';
import { aiApi } from '../api/ai';
import { useAuth } from '../contexts/AuthContext';
import {
  TemplateFilters, TemplateFileType, TemplateStatus, TemplateCategory, Template,
  TemplateRecommendation, TemplateRequest, RequestStatus
} from '../types';
import { useToast } from '../hooks/useToast';

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function generateAcademicYears(): string[] {
  const current = new Date().getFullYear();
  const years: string[] = [];
  for (let y = 2020; y <= current + 1; y++) {
    years.push(`${y}-${y + 1}`);
  }
  return years.reverse();
}

const FILE_TYPE_ICON: Record<string, React.ReactNode> = {
  DOCX: <FileText className="w-8 h-8 text-blue-500" />,
  PDF: <File className="w-8 h-8 text-red-500" />,
  XLSX: <FileSpreadsheet className="w-8 h-8 text-green-600" />,
  OTHER: <File className="w-8 h-8 text-gray-400" />,
};

const STATUS_BADGE: Record<TemplateStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  DRAFT: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ARCHIVED: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

const REQUEST_STATUS_STYLE: Record<RequestStatus, { cls: string; icon: React.ReactNode }> = {
  PENDING: { cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3 h-3" /> },
  IN_PROGRESS: { cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: <Loader2 className="w-3 h-3" /> },
  COMPLETED: { cls: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
  REJECTED: { cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3 h-3" /> },
  CANCELLED: { cls: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400', icon: <AlertCircle className="w-3 h-3" /> },
};

function TemplateSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card animate-pulse p-5 space-y-3">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="h-3 bg-muted rounded w-full" />
      <div className="h-3 bg-muted rounded w-2/3" />
      <div className="h-8 bg-muted rounded w-full mt-2" />
    </div>
  );
}

const SELECT_CLS = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const TemplatesLibrary: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [searchInput, setSearchInput] = useState('');
  const [year, setYear] = useState('');
  const [category, setCategory] = useState<TemplateCategory | ''>('');
  const [fileType, setFileType] = useState<TemplateFileType | ''>('');
  const [status, setStatus] = useState<TemplateStatus | ''>('');

  const [aiQuery, setAiQuery] = useState('');
  const [aiResults, setAiResults] = useState<TemplateRecommendation[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Preview state
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Request a template dialog
  const [requestOpen, setRequestOpen] = useState(false);
  const [reqTitle, setReqTitle] = useState('');
  const [reqDescription, setReqDescription] = useState('');
  const [reqCategory, setReqCategory] = useState<TemplateCategory | ''>('');
  const [reqSubmitting, setReqSubmitting] = useState(false);

  // My requests collapsible
  const [myRequestsOpen, setMyRequestsOpen] = useState(false);

  const { data: myRequests, refetch: refetchMyRequests } = useQuery({
    queryKey: ['template-requests', 'me'],
    queryFn: () => templateRequestsApi.getMyRequests(),
    enabled: !isAdmin(),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => templateRequestsApi.cancel(id),
    onSuccess: () => {
      refetchMyRequests();
      toast({ title: t('templateRequests.myList.cancelSuccess'), variant: 'success' });
    },
    onError: () => {
      toast({ title: t('common.error'), variant: 'destructive' });
    },
  });

  const handleAiSearch = async () => {
    const q = aiQuery.trim();
    if (!q) return;
    setAiLoading(true);
    try {
      const data = await aiApi.recommendTemplates(q, 5);
      setAiResults(data);
    } catch {
      toast({ title: t('common.error'), description: t('aiSearch.error'), variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  const clearAiResults = () => {
    setAiResults(null);
    setAiQuery('');
  };

  const maxAiScore = aiResults && aiResults.length > 0 ? aiResults[0].score : 1;
  const matchPct = (score: number) => Math.min(100, Math.round((score / Math.max(maxAiScore, 1)) * 100));

  const debouncedSearch = useDebounce(searchInput, 300);

  const filters: TemplateFilters = {
    search: debouncedSearch || undefined,
    year: year || undefined,
    category: (category as TemplateCategory) || undefined,
    type: (fileType as TemplateFileType) || undefined,
    status: (status as TemplateStatus) || undefined,
  };

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates-library', filters],
    queryFn: () => templatesApi.getAll(filters),
  });

  const handleDownload = async (template: Template) => {
    try {
      const blob = await templatesApi.download(template.id);
      const filename = template.filePath || `template-${template.id}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({ title: t('common.success'), description: t('templatesLibrary.downloadSuccess'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), description: t('templatesLibrary.downloadError'), variant: 'destructive' });
    }
  };

  const handlePreview = (template: Template) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
  };

  const handleSubmitRequest = async () => {
    if (!reqTitle.trim()) return;
    setReqSubmitting(true);
    try {
      await templateRequestsApi.create({
        title: reqTitle.trim(),
        description: reqDescription.trim() || undefined,
        suggestedCategory: (reqCategory as TemplateCategory) || undefined,
      });
      toast({ title: t('templateRequests.dialog.success'), variant: 'success' });
      setRequestOpen(false);
      setReqTitle('');
      setReqDescription('');
      setReqCategory('');
      refetchMyRequests();
      setMyRequestsOpen(true);
    } catch {
      toast({ title: t('common.error'), variant: 'destructive' });
    } finally {
      setReqSubmitting(false);
    }
  };

  const academicYears = generateAcademicYears();

  const categories: { value: TemplateCategory; label: string }[] = [
    { value: 'TEACHING_WORKLOAD', label: t('templatesLibrary.category.teachingWorkload') },
    { value: 'KKK_DOCUMENTS', label: t('templatesLibrary.category.kkkDocuments') },
    { value: 'SCIENTIFIC_REPORTS', label: t('templatesLibrary.category.scientificReports') },
    { value: 'SERVICE_NOTES', label: t('templatesLibrary.category.serviceNotes') },
    { value: 'PROTOCOLS', label: t('templatesLibrary.category.protocols') },
    { value: 'PRACTICE_DOCUMENTS', label: t('templatesLibrary.category.practiceDocuments') },
    { value: 'DIPLOMA_SUPERVISION', label: t('templatesLibrary.category.diplomaSupervision') },
    { value: 'QUALIFICATION_DOCUMENTS', label: t('templatesLibrary.category.qualificationDocuments') },
    { value: 'DEPARTMENT_FORMS', label: t('templatesLibrary.category.departmentForms') },
    { value: 'OTHER', label: t('templatesLibrary.category.other') },
  ];

  const locale = i18n.language === 'ru' ? ru : undefined;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('templatesLibrary.title')}
        description={t('templatesLibrary.subtitle')}
        icon={Library}
        actions={
          <div className="flex gap-2">
            {!isAdmin() && (
              <Button variant="outline" onClick={() => setRequestOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('templateRequests.requestButton')}
              </Button>
            )}
            {isAdmin() && (
              <Button onClick={() => navigate('/templates')}>
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('templatesLibrary.uploadButton')}
              </Button>
            )}
          </div>
        }
      />

      {/* AI Search block */}
      <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-purple-500/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h2 className="font-semibold">{t('aiSearch.title')}</h2>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row">
          <Input
            placeholder={t('aiSearch.placeholder')}
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAiSearch(); }}
            className="flex-1"
          />
          <Button onClick={handleAiSearch} disabled={aiLoading || !aiQuery.trim()}>
            {aiLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
            {t('aiSearch.search')}
          </Button>
        </div>
      </div>

      {/* AI results */}
      {aiResults !== null && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border-2 border-purple-500/40 p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              {t('aiSearch.suggestions')} ({aiResults.length})
            </h3>
            <Button variant="ghost" size="sm" onClick={clearAiResults}>
              <X className="w-4 h-4 mr-1" />
              {t('aiSearch.clear')}
            </Button>
          </div>
          {aiResults.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('aiSearch.noResults')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {aiResults.map((rec, i) => (
                <motion.div
                  key={rec.template.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                >
                  <Card className="h-full flex flex-col border-purple-500/30">
                    <CardContent className="p-5 flex flex-col flex-1 gap-3">
                      <div className="flex items-start gap-3">
                        <div className="shrink-0 mt-0.5">
                          {FILE_TYPE_ICON[rec.template.fileType || 'OTHER']}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm leading-tight truncate">{rec.template.name}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                              title={`${t('aiSearch.matchedKeywords')}: ${rec.matchedKeywords.join(', ')}`}
                            >
                              {matchPct(rec.score)}% {t('aiSearch.match')}
                            </span>
                          </div>
                        </div>
                      </div>
                      {rec.template.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{rec.template.description}</p>
                      )}
                      <div className="flex gap-2 mt-auto">
                        <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePreview(rec.template)}>
                          <Eye className="w-4 h-4 mr-1" />
                          {t('templatesLibrary.preview.button')}
                        </Button>
                        <Button size="sm" className="flex-1" onClick={() => handleDownload(rec.template)}>
                          <Download className="w-4 h-4 mr-1" />
                          {t('templatesLibrary.download')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Filters */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border border-border rounded-xl p-4 space-y-3 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <Input
            placeholder={t('templatesLibrary.search')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="lg:col-span-1"
          />
          <select value={year} onChange={(e) => setYear(e.target.value)} className={SELECT_CLS}>
            <option value="">{t('templatesLibrary.filters.year')}</option>
            {academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={category} onChange={(e) => setCategory(e.target.value as TemplateCategory | '')} className={SELECT_CLS}>
            <option value="">{t('templatesLibrary.filters.category')}</option>
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select value={fileType} onChange={(e) => setFileType(e.target.value as TemplateFileType | '')} className={SELECT_CLS}>
            <option value="">{t('templatesLibrary.filters.fileType')}</option>
            <option value="DOCX">DOCX</option>
            <option value="PDF">PDF</option>
            <option value="XLSX">XLSX</option>
            <option value="OTHER">{t('templatesLibrary.category.other')}</option>
          </select>
          {isAdmin() && (
            <select value={status} onChange={(e) => setStatus(e.target.value as TemplateStatus | '')} className={SELECT_CLS}>
              <option value="">{t('templatesLibrary.filters.status')}</option>
              <option value="ACTIVE">{t('templatesLibrary.status.active')}</option>
              <option value="DRAFT">{t('templatesLibrary.status.draft')}</option>
              <option value="ARCHIVED">{t('templatesLibrary.status.archived')}</option>
            </select>
          )}
        </div>
      </div>

      {/* Template grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <TemplateSkeleton key={i} />)}
        </div>
      ) : templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template, i) => (
            <motion.div
              key={template.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: i * 0.04 }}
            >
              <Card className="group h-full flex flex-col hover:shadow-md transition-shadow">
                <CardContent className="p-5 flex flex-col flex-1 gap-3">
                  {/* Top row */}
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {FILE_TYPE_ICON[template.fileType || 'OTHER']}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-sm leading-tight truncate flex-1">{template.name}</h3>
                        <PinButton type="TEMPLATE" itemId={template.id} customTitle={template.name} />
                        {template.version && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                            v{template.version}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {template.status && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[template.status]}`}>
                            {t(`templatesLibrary.status.${template.status.toLowerCase()}`)}
                          </span>
                        )}
                        {template.templateCategory && (
                          <span className="text-xs text-muted-foreground truncate">
                            {t(`templatesLibrary.category.${toCamel(template.templateCategory)}`)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {template.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
                  )}

                  {/* Meta */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-auto">
                    {template.academicYear && (
                      <span>{template.academicYear}{template.semester ? ` · ${t(`templatesLibrary.semester.${template.semester.toLowerCase()}`)}` : ''}</span>
                    )}
                    {template.downloadCount !== undefined && template.downloadCount !== null && (
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />{template.downloadCount}
                      </span>
                    )}
                    {(template.lastUpdateDate || template.updatedAt) && (
                      <span>
                        {formatDistanceToNow(
                          new Date(template.lastUpdateDate || template.updatedAt!),
                          { addSuffix: true, locale }
                        )}
                      </span>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handlePreview(template)}>
                      <Eye className="w-4 h-4 mr-1" />
                      {t('templatesLibrary.preview.button')}
                    </Button>
                    <Button size="sm" className="flex-1" onClick={() => handleDownload(template)}>
                      <Download className="w-4 h-4 mr-1" />
                      {t('templatesLibrary.download')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-1">{t('templatesLibrary.noResults')}</h3>
          <p className="text-muted-foreground text-sm">{t('templatesLibrary.noResultsHint')}</p>
        </div>
      )}

      {/* My Template Requests (teachers only) */}
      {!isAdmin() && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors"
            onClick={() => setMyRequestsOpen((v) => !v)}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">{t('templateRequests.myList.title')}</span>
              {myRequests && myRequests.length > 0 && (
                <span className="text-xs bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                  {myRequests.length}
                </span>
              )}
            </div>
            {myRequestsOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          <AnimatePresence>
            {myRequestsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="px-5 pb-5 space-y-3 border-t border-border pt-4">
                  {!myRequests || myRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">{t('templateRequests.myList.empty')}</p>
                  ) : (
                    myRequests.map((req) => {
                      const st = REQUEST_STATUS_STYLE[req.status] || REQUEST_STATUS_STYLE.PENDING;
                      return (
                        <div key={req.id} className="rounded-lg border border-border bg-background p-4 space-y-2">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{req.title}</p>
                              {req.description && (
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{req.description}</p>
                              )}
                            </div>
                            <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${st.cls}`}>
                              {st.icon}
                              {t(`templateRequests.statuses.${toCamel(req.status)}`)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(req.createdAt), 'dd MMM yyyy', { locale })}
                            </span>
                            <div className="flex items-center gap-2">
                              {req.adminResponse && (
                                <span className="text-xs text-muted-foreground italic truncate max-w-[200px]" title={req.adminResponse}>
                                  {t('templateRequests.myList.adminSays')}: {req.adminResponse}
                                </span>
                              )}
                              {req.createdTemplate && (
                                <span className="text-xs text-green-600 font-medium">
                                  → {req.createdTemplate.name}
                                </span>
                              )}
                              {req.status === 'PENDING' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-xs text-destructive hover:text-destructive h-6 px-2"
                                  onClick={() => cancelMutation.mutate(req.id)}
                                  disabled={cancelMutation.isPending}
                                >
                                  {t('templateRequests.myList.cancel')}
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Preview Modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onDownload={handleDownload}
      />

      {/* Request a Template Dialog */}
      <Dialog open={requestOpen} onOpenChange={(v) => { if (!v) setRequestOpen(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('templateRequests.dialog.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('templateRequests.dialog.titleLabel')} *</label>
              <Input
                placeholder={t('templateRequests.dialog.titlePlaceholder')}
                value={reqTitle}
                onChange={(e) => setReqTitle(e.target.value.slice(0, 200))}
                maxLength={200}
              />
              <span className="text-xs text-muted-foreground">{reqTitle.length}/200</span>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('templateRequests.dialog.descLabel')}</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder={t('templateRequests.dialog.descPlaceholder')}
                value={reqDescription}
                onChange={(e) => setReqDescription(e.target.value.slice(0, 2000))}
                rows={4}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">{t('templateRequests.dialog.categoryLabel')}</label>
              <select
                value={reqCategory}
                onChange={(e) => setReqCategory(e.target.value as TemplateCategory | '')}
                className={SELECT_CLS}
              >
                <option value="">{t('templateRequests.dialog.categoryPlaceholder')}</option>
                {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setRequestOpen(false)} disabled={reqSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button onClick={handleSubmitRequest} disabled={reqSubmitting || !reqTitle.trim()}>
                {reqSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                {t('templateRequests.dialog.submit')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

function toCamel(val: string): string {
  return val.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

export default TemplatesLibrary;
