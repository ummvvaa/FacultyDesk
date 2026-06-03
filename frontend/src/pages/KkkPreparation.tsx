import React, { useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Send,
  Download,
  Pencil,
  Trash2,
  Plus,
  Upload,
  ExternalLink,
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import KkkTutorPanel from '../components/kkk/KkkTutorPanel';

import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Skeleton } from '../components/ui/skeleton';
import { Separator } from '../components/ui/separator';
import { Label } from '../components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';

import { kkkApi } from '../api/kkk';
import { educationApi } from '../api/education';
import { workExperienceApi } from '../api/workExperience';
import { qualificationCoursesApi } from '../api/qualificationCourses';
import { awardsApi } from '../api/awards';
import { patentsApi } from '../api/patents';
import { aiApi } from '../api/ai';

import {
  Education,
  WorkExperience,
  QualificationCourse,
  Award,
  Patent,
  KkkStatus,
  KkkGapMissingItem,
  KkkGapPriority,
} from '../types';
import { useAuth } from '../contexts/AuthContext';

// ---------- Status / Checklist helpers ----------

function kkkStatusBadgeVariant(s: KkkStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
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

function kkkStatusKey(s: KkkStatus): string {
  return s.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

// ---------- Top progress block ----------

function ProgressOverview({
  completion,
  status,
}: {
  completion: number;
  status: KkkStatus;
}) {
  const { t } = useTranslation();
  const size = 180;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(Math.max(completion, 0), 100);
  const offset = circumference - (pct / 100) * circumference;

  const progressColor =
    pct >= 80 ? 'hsl(var(--success))' :
    pct >= 50 ? 'hsl(var(--warning))' :
    'hsl(var(--destructive))';

  return (
    <div className="flex items-center gap-8">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="hsl(var(--muted))"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={progressColor}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-4xl font-bold tabular-nums tracking-tight" style={{ color: progressColor }}>
            {pct}%
          </span>
          <span className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
            {t('kkk.completion')}
          </span>
        </div>
      </div>
      <div className="flex-1">
        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">
          {t('kkk.status.label')}
        </p>
        <Badge variant={kkkStatusBadgeVariant(status)} className="text-sm py-1 px-3">
          {t(`kkk.status.${kkkStatusKey(status)}`)}
        </Badge>
        <p className="text-xs text-muted-foreground mt-3 max-w-sm leading-relaxed">
          {pct >= 80
            ? t('kkk.alerts.readyToSubmit')
            : t('kkk.alerts.minRequiredHint', { defaultValue: 'Reach at least 80% completion to submit.' })}
        </p>
      </div>
    </div>
  );
}

// ---------- Checklist item ----------

interface ChecklistItemConfig {
  key: string;
  done: boolean;
  i18nKey: string;
  descriptionKey: string;
  goTo?: () => void;
  externalLink?: string;
}

function ChecklistItem({ item }: { item: ChecklistItemConfig }) {
  const { t } = useTranslation();
  return (
    <div
      className={`group flex items-start gap-3 p-4 rounded-lg border transition-all duration-200 ${
        item.done
          ? 'bg-success/5 border-success/20 hover:border-success/40'
          : 'bg-card border-border hover:border-muted-foreground/30 hover:shadow-sm'
      }`}
    >
      {item.done ? (
        <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
      ) : (
        <XCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{t(`kkk.checklist.${item.i18nKey}`)}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
          {t(`kkk.checklistDescription.${item.descriptionKey}`)}
        </p>
      </div>
      {item.externalLink ? (
        <Button asChild size="sm" variant="ghost" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">
          <Link to={item.externalLink}>{t('kkk.actions.goToSection')}</Link>
        </Button>
      ) : item.goTo ? (
        <Button size="sm" variant="ghost" className="text-xs opacity-0 group-hover:opacity-100 transition-opacity" onClick={item.goTo}>
          {t('kkk.actions.goToSection')}
        </Button>
      ) : null}
    </div>
  );
}

// ---------- Generic CRUD section ----------

type FieldType = 'text' | 'number' | 'textarea' | 'checkbox';

interface FieldDef<T> {
  name: keyof T;
  labelKey: string;
  type: FieldType;
  required?: boolean;
}

interface CrudSectionProps<T extends { id: number }> {
  items: T[];
  fields: FieldDef<T>[];
  titleKey: string;
  emptyKey: string;
  isLoading: boolean;
  onCreate: (payload: Partial<T>) => Promise<unknown>;
  onUpdate: (id: number, payload: Partial<T>) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
  renderExtra?: (item: T) => React.ReactNode;
  renderCardTitle: (item: T) => React.ReactNode;
  renderCardSubtitle?: (item: T) => React.ReactNode;
}

function CrudSection<T extends { id: number }>({
  items,
  fields,
  titleKey,
  emptyKey,
  isLoading,
  onCreate,
  onUpdate,
  onDelete,
  renderExtra,
  renderCardTitle,
  renderCardSubtitle,
}: CrudSectionProps<T>) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<T | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('kkk.alerts.confirmDelete'))) return;
    setBusy(true);
    try {
      await onDelete(id);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{t(titleKey)}</h3>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="w-4 h-4 mr-1" />
          {t('kkk.actions.addNew')}
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">{t(emptyKey)}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="border rounded-lg p-3 bg-card flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{renderCardTitle(item)}</div>
                {renderCardSubtitle && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {renderCardSubtitle(item)}
                  </div>
                )}
                {renderExtra && <div className="mt-2">{renderExtra(item)}</div>}
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" onClick={() => setEditing(item)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(item.id)}
                  disabled={busy}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <EntityDialog
        open={showAdd}
        onClose={() => setShowAdd(false)}
        fields={fields}
        titleKey={`${titleKey}`}
        actionKey="kkk.actions.addNew"
        onSubmit={async (payload) => {
          await onCreate(payload);
          setShowAdd(false);
        }}
      />
      <EntityDialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        fields={fields}
        initial={editing ?? undefined}
        titleKey={titleKey}
        actionKey="common.save"
        onSubmit={async (payload) => {
          if (editing) await onUpdate(editing.id, payload);
          setEditing(null);
        }}
      />
    </div>
  );
}

// ---------- Entity Dialog (form) ----------

interface EntityDialogProps<T> {
  open: boolean;
  onClose: () => void;
  fields: FieldDef<T>[];
  initial?: Partial<T>;
  titleKey: string;
  actionKey: string;
  onSubmit: (payload: Partial<T>) => Promise<void> | void;
}

function EntityDialog<T extends { id?: number }>({
  open,
  onClose,
  fields,
  initial,
  titleKey,
  actionKey,
  onSubmit,
}: EntityDialogProps<T>) {
  const { t } = useTranslation();
  const [state, setState] = useState<Record<string, unknown>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when initial changes
  React.useEffect(() => {
    if (open) {
      const seed: Record<string, unknown> = {};
      fields.forEach((f) => {
        const v = initial ? (initial as Record<string, unknown>)[f.name as string] : undefined;
        seed[f.name as string] = v ?? (f.type === 'checkbox' ? false : '');
      });
      setState(seed);
      setError(null);
    }
  }, [open, initial, fields]);

  const handleChange = (name: string, value: unknown) => {
    setState((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate required
    for (const f of fields) {
      if (f.required) {
        const v = state[f.name as string];
        if (v === undefined || v === null || v === '' || (f.type === 'number' && Number.isNaN(Number(v)))) {
          setError(t('kkk.alerts.fieldRequired', { field: t(f.labelKey) }));
          return;
        }
      }
    }
    // Coerce numbers
    const payload: Record<string, unknown> = {};
    fields.forEach((f) => {
      const v = state[f.name as string];
      if (f.type === 'number') {
        payload[f.name as string] = v === '' || v === null || v === undefined ? null : Number(v);
      } else if (f.type === 'checkbox') {
        payload[f.name as string] = Boolean(v);
      } else {
        payload[f.name as string] = v === '' ? null : v;
      }
    });
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(payload as Partial<T>);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map((f) => {
            const name = f.name as string;
            const v = state[name];
            const label = t(f.labelKey);
            if (f.type === 'textarea') {
              return (
                <div key={name} className="space-y-1">
                  <Label htmlFor={name}>{label}{f.required ? ' *' : ''}</Label>
                  <Textarea
                    id={name}
                    value={typeof v === 'string' ? v : ''}
                    onChange={(e) => handleChange(name, e.target.value)}
                    rows={3}
                  />
                </div>
              );
            }
            if (f.type === 'checkbox') {
              return (
                <label key={name} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(v)}
                    onChange={(e) => handleChange(name, e.target.checked)}
                  />
                  <span className="text-sm">{label}</span>
                </label>
              );
            }
            return (
              <div key={name} className="space-y-1">
                <Label htmlFor={name}>{label}{f.required ? ' *' : ''}</Label>
                <Input
                  id={name}
                  type={f.type === 'number' ? 'number' : 'text'}
                  value={
                    v === undefined || v === null
                      ? ''
                      : typeof v === 'number' || typeof v === 'string'
                      ? v
                      : ''
                  }
                  onChange={(e) => handleChange(name, e.target.value)}
                />
              </div>
            );
          })}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={submitting}>
              {t(actionKey)}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Qualification certificate uploader ----------

function CertificateUploader({
  course,
  onUploaded,
}: {
  course: QualificationCourse;
  onUploaded: () => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await qualificationCoursesApi.uploadCertificate(course.id, file);
      if (inputRef.current) inputRef.current.value = '';
      onUploaded();
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = () => {
    qualificationCoursesApi.downloadCertificate(
      course.id,
      course.certificateOriginalName ?? 'certificate'
    );
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {course.certificateFilePath ? (
        <>
          <Badge variant="secondary" className="text-xs">
            {course.certificateOriginalName ?? t('kkk.forms.qualificationCourses.certificate')}
          </Badge>
          <Button size="sm" variant="ghost" onClick={handleDownload}>
            <Download className="w-3 h-3 mr-1" />
            {t('kkk.actions.downloadCertificate')}
          </Button>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">
          {t('kkk.forms.qualificationCourses.noCertificate')}
        </span>
      )}
      <input ref={inputRef} type="file" className="text-xs" />
      <Button size="sm" onClick={handleUpload} disabled={uploading}>
        <Upload className="w-3 h-3 mr-1" />
        {t('kkk.actions.uploadCertificate')}
      </Button>
    </div>
  );
}

// ---------- AI Recommendations panel ----------

const PRIORITY_ICON: Record<KkkGapPriority, string> = {
  critical: '🔴',
  important: '🟡',
  niceToHave: '🟢',
};

const PRIORITY_CLASS: Record<KkkGapPriority, string> = {
  critical: 'border-red-300 bg-red-50 dark:bg-red-950/20 dark:border-red-900',
  important: 'border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-900',
  niceToHave: 'border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-900',
};

function AiRecommendationsPanel({ locale }: { locale: string }) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  const gapQuery = useQuery({
    queryKey: ['ai', 'profile', 'check', locale],
    queryFn: () => aiApi.analyzeKkkGaps(locale),
  });

  const handleRefresh = () => {
    gapQuery.refetch();
  };

  const renderItem = (item: KkkGapMissingItem, idx: number) => (
    <div
      key={`${item.key}-${idx}`}
      className={`flex items-start gap-3 p-3 rounded-lg border ${PRIORITY_CLASS[item.priority] ?? ''}`}
    >
      <span className="text-lg shrink-0" aria-hidden>
        {PRIORITY_ICON[item.priority] ?? '•'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t(`ai.recommendations.priority.${item.priority}`)}
        </p>
        <p className="text-sm">{item.recommendation}</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          {t('ai.recommendations.title')}
        </h3>
        <Button size="sm" variant="outline" onClick={handleRefresh} disabled={gapQuery.isFetching}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1 ${gapQuery.isFetching ? 'animate-spin' : ''}`} />
          {t('ai.recommendations.refresh')}
        </Button>
      </div>

      {gapQuery.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : gapQuery.isError ? (
        <p className="text-sm text-destructive">{t('ai.recommendations.error')}</p>
      ) : gapQuery.data ? (
        gapQuery.data.missingItems.length === 0 ? (
          <div className="p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900 text-sm">
            {t('ai.recommendations.allComplete')}
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {gapQuery.data.topRecommendations.map(renderItem)}
            </div>

            {gapQuery.data.missingItems.length > gapQuery.data.topRecommendations.length && (
              <div className="mt-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowAll((v) => !v)}
                  className="text-xs"
                >
                  {showAll ? (
                    <ChevronUp className="w-3.5 h-3.5 mr-1" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 mr-1" />
                  )}
                  {t('ai.recommendations.allRecommendations')} ({gapQuery.data.missingItems.length})
                </Button>
                {showAll && (
                  <div className="space-y-2 mt-2">
                    {gapQuery.data.missingItems.map(renderItem)}
                  </div>
                )}
              </div>
            )}
          </>
        )
      ) : null}
    </div>
  );
}

// ---------- Getting Started hero ----------

interface NextSection {
  id: string;
  nameKey: string;
  action: () => void;
}

interface GettingStartedCardProps {
  mode: 'start' | 'continue';
  nextSection: NextSection;
}

function GettingStartedCard({ mode, nextSection }: GettingStartedCardProps) {
  const { t } = useTranslation();
  const sectionName = t(`kkk.gettingStarted.sections.${nextSection.id}`);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="grid md:grid-cols-3 gap-6 p-8 rounded-xl border bg-gradient-to-br from-primary/5 to-card"
    >
      <div className="md:col-span-2">
        <p className="text-xs uppercase tracking-wider font-medium text-primary">
          {t(`kkk.gettingStarted.${mode}.eyebrow`)}
        </p>
        <h2 className="text-2xl font-bold mt-2">
          {mode === 'start'
            ? t('kkk.gettingStarted.start.title')
            : t('kkk.gettingStarted.continue.title', { sectionName })}
        </h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-lg leading-relaxed">
          {mode === 'start'
            ? t('kkk.gettingStarted.start.description')
            : t('kkk.gettingStarted.continue.description', { sectionName })}
        </p>
        <Button className="mt-4" onClick={nextSection.action}>
          {t(`kkk.gettingStarted.${mode}.buttonPrefix`, { sectionName })}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
      <div className="hidden md:flex md:col-span-1 items-center justify-center">
        <GraduationCap className="text-primary/20" style={{ width: 96, height: 96 }} strokeWidth={1.5} />
      </div>
    </motion.div>
  );
}

// ---------- Main page ----------

const KkkPreparation: React.FC = () => {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('education');

  const scrollToSections = () => {
    setTimeout(() => {
      document.getElementById('kkk-sections')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const locale = i18n.language === 'en' ? 'en' : 'ru';

  const kkkQuery = useQuery({
    queryKey: ['kkk', 'me', locale],
    queryFn: () => kkkApi.getMy(locale),
  });

  const educationQuery = useQuery({
    queryKey: ['education', 'me'],
    queryFn: () => educationApi.getMy(),
  });
  const workQuery = useQuery({
    queryKey: ['workExperience', 'me'],
    queryFn: () => workExperienceApi.getMy(),
  });
  const coursesQuery = useQuery({
    queryKey: ['qualificationCourses', 'me'],
    queryFn: () => qualificationCoursesApi.getMy(),
  });
  const awardsQuery = useQuery({
    queryKey: ['awards', 'me'],
    queryFn: () => awardsApi.getMy(),
  });
  const patentsQuery = useQuery({
    queryKey: ['patents', 'me'],
    queryFn: () => patentsApi.getMy(),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['kkk'] });
  };

  const submitMutation = useMutation({
    mutationFn: () => kkkApi.submit(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kkk'] });
      window.alert(t('kkk.alerts.submittedSuccess'));
    },
    onError: (err: unknown) => {
      const detail = (err as { response?: { data?: { message?: string } } }).response?.data?.message ?? String(err);
      window.alert(detail);
    },
  });

  const handleExport = async () => {
    if (!user) return;
    const date = new Date().toISOString().slice(0, 10);
    const filename = `kkk_${user.username}_${date}.pdf`;
    try {
      await kkkApi.exportPdf(user.id, filename);
    } catch {
      window.alert(t('kkk.alerts.exportFailed'));
    }
  };

  const kkk = kkkQuery.data;

  const nextSection: NextSection | null = useMemo(() => {
    if (!kkkQuery.data) return null;
    const c = kkkQuery.data.checklist;
    const priority: Array<{ done: boolean; id: string; build: () => NextSection }> = [
      { done: c.profileCompleted, id: 'profile', build: () => ({ id: 'profile', nameKey: 'profile', action: () => navigate('/profile') }) },
      { done: c.educationAdded, id: 'education', build: () => ({ id: 'education', nameKey: 'education', action: () => { setActiveTab('education'); scrollToSections(); } }) },
      { done: c.workExperienceAdded, id: 'workExperience', build: () => ({ id: 'workExperience', nameKey: 'workExperience', action: () => { setActiveTab('work'); scrollToSections(); } }) },
      { done: c.qualificationCoursesLast3Years, id: 'qualificationCourses', build: () => ({ id: 'qualificationCourses', nameKey: 'qualificationCourses', action: () => { setActiveTab('courses'); scrollToSections(); } }) },
      { done: c.publicationsLast5Years, id: 'publications', build: () => ({ id: 'publications', nameKey: 'publications', action: () => navigate('/publications') }) },
      { done: c.doiLinksAdded, id: 'doiLinks', build: () => ({ id: 'doiLinks', nameKey: 'doiLinks', action: () => navigate('/publications') }) },
      { done: c.confirmationFilesUploaded, id: 'confirmationFiles', build: () => ({ id: 'confirmationFiles', nameKey: 'confirmationFiles', action: () => navigate('/publications') }) },
      { done: c.awardsPatentsAdded, id: 'awards', build: () => ({ id: 'awards', nameKey: 'awards', action: () => { setActiveTab('awards'); scrollToSections(); } }) },
      { done: c.englishLevelAdded, id: 'englishLevel', build: () => ({ id: 'englishLevel', nameKey: 'englishLevel', action: () => navigate('/profile') }) },
    ];
    const first = priority.find((p) => !p.done);
    return first ? first.build() : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kkkQuery.data, navigate]);

  const checklistItems: ChecklistItemConfig[] = useMemo(() => {
    if (!kkk) return [];
    const c = kkk.checklist;
    return [
      {
        key: 'profileCompleted',
        done: c.profileCompleted,
        i18nKey: 'profileCompleted',
        descriptionKey: 'profileCompleted',
        externalLink: '/profile',
      },
      {
        key: 'educationAdded',
        done: c.educationAdded,
        i18nKey: 'educationAdded',
        descriptionKey: 'educationAdded',
        goTo: () => setActiveTab('education'),
      },
      {
        key: 'workExperienceAdded',
        done: c.workExperienceAdded,
        i18nKey: 'workExperienceAdded',
        descriptionKey: 'workExperienceAdded',
        goTo: () => setActiveTab('work'),
      },
      {
        key: 'qualificationCoursesLast3Years',
        done: c.qualificationCoursesLast3Years,
        i18nKey: 'qualificationCoursesLast3Years',
        descriptionKey: 'qualificationCoursesLast3Years',
        goTo: () => setActiveTab('courses'),
      },
      {
        key: 'publicationsLast5Years',
        done: c.publicationsLast5Years,
        i18nKey: 'publicationsLast5Years',
        descriptionKey: 'publicationsLast5Years',
        externalLink: '/publications',
      },
      {
        key: 'doiLinksAdded',
        done: c.doiLinksAdded,
        i18nKey: 'doiLinksAdded',
        descriptionKey: 'doiLinksAdded',
        externalLink: '/publications',
      },
      {
        key: 'confirmationFilesUploaded',
        done: c.confirmationFilesUploaded,
        i18nKey: 'confirmationFilesUploaded',
        descriptionKey: 'confirmationFilesUploaded',
        externalLink: '/publications',
      },
      {
        key: 'awardsPatentsAdded',
        done: c.awardsPatentsAdded,
        i18nKey: 'awardsPatentsAdded',
        descriptionKey: 'awardsPatentsAdded',
        goTo: () => setActiveTab('awards'),
      },
      {
        key: 'englishLevelAdded',
        done: c.englishLevelAdded,
        i18nKey: 'englishLevelAdded',
        descriptionKey: 'englishLevelAdded',
        externalLink: '/profile',
      },
    ];
  }, [kkk]);

  // -------- Field definitions per entity --------

  const educationFields: FieldDef<Education>[] = [
    { name: 'degree', labelKey: 'kkk.forms.education.degree', type: 'text', required: true },
    { name: 'institution', labelKey: 'kkk.forms.education.institution', type: 'text', required: true },
    { name: 'specialty', labelKey: 'kkk.forms.education.specialty', type: 'text' },
    { name: 'year', labelKey: 'kkk.forms.education.year', type: 'number' },
  ];

  const workFields: FieldDef<WorkExperience>[] = [
    { name: 'position', labelKey: 'kkk.forms.workExperience.position', type: 'text', required: true },
    { name: 'organization', labelKey: 'kkk.forms.workExperience.organization', type: 'text', required: true },
    { name: 'startYear', labelKey: 'kkk.forms.workExperience.startYear', type: 'number' },
    { name: 'endYear', labelKey: 'kkk.forms.workExperience.endYear', type: 'number' },
    { name: 'current', labelKey: 'kkk.forms.workExperience.current', type: 'checkbox' },
    { name: 'description', labelKey: 'kkk.forms.workExperience.description', type: 'textarea' },
  ];

  const courseFields: FieldDef<QualificationCourse>[] = [
    { name: 'name', labelKey: 'kkk.forms.qualificationCourses.name', type: 'text', required: true },
    { name: 'organization', labelKey: 'kkk.forms.qualificationCourses.organization', type: 'text' },
    { name: 'year', labelKey: 'kkk.forms.qualificationCourses.year', type: 'number' },
    { name: 'hours', labelKey: 'kkk.forms.qualificationCourses.hours', type: 'number' },
  ];

  const awardFields: FieldDef<Award>[] = [
    { name: 'name', labelKey: 'kkk.forms.awards.name', type: 'text', required: true },
    { name: 'organization', labelKey: 'kkk.forms.awards.organization', type: 'text' },
    { name: 'year', labelKey: 'kkk.forms.awards.year', type: 'number' },
    { name: 'description', labelKey: 'kkk.forms.awards.description', type: 'textarea' },
  ];

  const patentFields: FieldDef<Patent>[] = [
    { name: 'title', labelKey: 'kkk.forms.patents.title', type: 'text', required: true },
    { name: 'patentNumber', labelKey: 'kkk.forms.patents.patentNumber', type: 'text' },
    { name: 'year', labelKey: 'kkk.forms.patents.year', type: 'number' },
    { name: 'country', labelKey: 'kkk.forms.patents.country', type: 'text' },
    { name: 'description', labelKey: 'kkk.forms.patents.description', type: 'textarea' },
  ];

  // -------- CRUD wrappers (invalidate kkk after every change) --------

  const wrap = <Args extends unknown[], R>(
    fn: (...args: Args) => Promise<R>,
    key: string[]
  ) => async (...args: Args) => {
    const result = await fn(...args);
    qc.invalidateQueries({ queryKey: key });
    invalidateAll();
    return result;
  };

  // -------- Render --------

  if (kkkQuery.isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-60 w-full" />
      </div>
    );
  }

  if (!kkk) {
    return <div className="p-6 text-destructive">{t('common.error')}</div>;
  }

  const completion = kkk.checklist.completionPercentage;
  const canSubmit = completion >= 80 && kkk.status !== 'SUBMITTED' && kkk.status !== 'READY';

  const gettingStartedMode: 'start' | 'continue' | null =
    completion >= 80
      ? null
      : kkk.status === 'NOT_STARTED' || completion < 20
        ? 'start'
        : 'continue';

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <PageHeader title={t('kkk.title')} icon={GraduationCap} />

        {/* Getting Started hero */}
        {gettingStartedMode && nextSection && (
          <GettingStartedCard mode={gettingStartedMode} nextSection={nextSection} />
        )}

        {/* Overview block */}
        <div className="border rounded-lg p-5 bg-card">
          <div className="flex flex-col md:flex-row items-start gap-6 justify-between">
            <ProgressOverview completion={completion} status={kkk.status} />
            <div className="flex flex-col gap-2">
              {canSubmit ? (
                <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending}>
                  <Send className="w-4 h-4 mr-2" />
                  {t('kkk.actions.submit')}
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button disabled>
                        <Send className="w-4 h-4 mr-2" />
                        {t('kkk.actions.submit')}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {completion < 80
                      ? t('kkk.alerts.lowCompletion', { value: completion })
                      : t('kkk.alerts.alreadySubmitted')}
                  </TooltipContent>
                </Tooltip>
              )}
              <Button variant="outline" onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                {t('kkk.actions.export')}
              </Button>
            </div>
          </div>

          {(kkk.status === 'RETURNED_FOR_CORRECTION' || kkk.status === 'CHECKED') && kkk.reviewerComment && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>{t('kkk.alerts.returnedForCorrection')}</AlertTitle>
              <AlertDescription className="whitespace-pre-wrap">{kkk.reviewerComment}</AlertDescription>
            </Alert>
          )}
        </div>

        {/* KKK Tutor */}
        <KkkTutorPanel />

        {/* Checklist */}
        <div className="border rounded-lg p-5 bg-card">
          <h2 className="font-semibold mb-3">{t('kkk.checklistTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {checklistItems.map((item) => (
              <ChecklistItem key={item.key} item={item} />
            ))}
          </div>

          {kkk.checklist.missingItems.length > 0 && (
            <div className="mt-5">
              <h3 className="font-medium text-sm mb-2">{t('kkk.missingInformation')}</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {kkk.checklist.missingItems.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <Separator className="my-4" />

          <AiRecommendationsPanel locale={locale} />
        </div>

        {/* Tabs */}
        <div id="kkk-sections" className="scroll-mt-20">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="education">{t('kkk.tabs.education')}</TabsTrigger>
            <TabsTrigger value="work">{t('kkk.tabs.workExperience')}</TabsTrigger>
            <TabsTrigger value="courses">{t('kkk.tabs.qualificationCourses')}</TabsTrigger>
            <TabsTrigger value="awards">{t('kkk.tabs.awards')}</TabsTrigger>
            <TabsTrigger value="patents">{t('kkk.tabs.patents')}</TabsTrigger>
            <TabsTrigger value="publications">{t('kkk.tabs.publications')}</TabsTrigger>
          </TabsList>

          <TabsContent value="education" className="border rounded-lg p-4 bg-card mt-3">
            <CrudSection<Education>
              items={educationQuery.data ?? []}
              isLoading={educationQuery.isLoading}
              fields={educationFields}
              titleKey="kkk.tabs.education"
              emptyKey="kkk.emptyStates.education"
              onCreate={wrap(educationApi.create, ['education', 'me'])}
              onUpdate={wrap(educationApi.update, ['education', 'me'])}
              onDelete={wrap(educationApi.delete, ['education', 'me'])}
              renderCardTitle={(e) => (
                <span>
                  {e.degree ?? '—'}{e.specialty ? ` · ${e.specialty}` : ''}
                </span>
              )}
              renderCardSubtitle={(e) => (
                <span>{e.institution ?? ''}{e.year ? ` · ${e.year}` : ''}</span>
              )}
            />
          </TabsContent>

          <TabsContent value="work" className="border rounded-lg p-4 bg-card mt-3">
            <CrudSection<WorkExperience>
              items={workQuery.data ?? []}
              isLoading={workQuery.isLoading}
              fields={workFields}
              titleKey="kkk.tabs.workExperience"
              emptyKey="kkk.emptyStates.workExperience"
              onCreate={wrap(workExperienceApi.create, ['workExperience', 'me'])}
              onUpdate={wrap(workExperienceApi.update, ['workExperience', 'me'])}
              onDelete={wrap(workExperienceApi.delete, ['workExperience', 'me'])}
              renderCardTitle={(w) => <span>{w.position ?? '—'}</span>}
              renderCardSubtitle={(w) => (
                <span>
                  {w.organization ?? ''} · {w.startYear ?? '—'}–{w.current ? t('kkk.forms.workExperience.present') : (w.endYear ?? '—')}
                </span>
              )}
              renderExtra={(w) =>
                w.description ? <p className="text-xs text-muted-foreground">{w.description}</p> : null
              }
            />
          </TabsContent>

          <TabsContent value="courses" className="border rounded-lg p-4 bg-card mt-3">
            <CrudSection<QualificationCourse>
              items={coursesQuery.data ?? []}
              isLoading={coursesQuery.isLoading}
              fields={courseFields}
              titleKey="kkk.tabs.qualificationCourses"
              emptyKey="kkk.emptyStates.qualificationCourses"
              onCreate={wrap(qualificationCoursesApi.create, ['qualificationCourses', 'me'])}
              onUpdate={wrap(qualificationCoursesApi.update, ['qualificationCourses', 'me'])}
              onDelete={wrap(qualificationCoursesApi.delete, ['qualificationCourses', 'me'])}
              renderCardTitle={(c) => <span>{c.name ?? '—'}</span>}
              renderCardSubtitle={(c) => (
                <span>
                  {c.organization ?? ''}{c.year ? ` · ${c.year}` : ''}{c.hours ? ` · ${c.hours} ${t('kkk.forms.qualificationCourses.hoursShort')}` : ''}
                </span>
              )}
              renderExtra={(c) => (
                <CertificateUploader
                  course={c}
                  onUploaded={() => {
                    qc.invalidateQueries({ queryKey: ['qualificationCourses', 'me'] });
                    invalidateAll();
                  }}
                />
              )}
            />
          </TabsContent>

          <TabsContent value="awards" className="border rounded-lg p-4 bg-card mt-3">
            <CrudSection<Award>
              items={awardsQuery.data ?? []}
              isLoading={awardsQuery.isLoading}
              fields={awardFields}
              titleKey="kkk.tabs.awards"
              emptyKey="kkk.emptyStates.awards"
              onCreate={wrap(awardsApi.create, ['awards', 'me'])}
              onUpdate={wrap(awardsApi.update, ['awards', 'me'])}
              onDelete={wrap(awardsApi.delete, ['awards', 'me'])}
              renderCardTitle={(a) => <span>{a.name ?? '—'}</span>}
              renderCardSubtitle={(a) => (
                <span>{a.organization ?? ''}{a.year ? ` · ${a.year}` : ''}</span>
              )}
              renderExtra={(a) =>
                a.description ? <p className="text-xs text-muted-foreground">{a.description}</p> : null
              }
            />
          </TabsContent>

          <TabsContent value="patents" className="border rounded-lg p-4 bg-card mt-3">
            <CrudSection<Patent>
              items={patentsQuery.data ?? []}
              isLoading={patentsQuery.isLoading}
              fields={patentFields}
              titleKey="kkk.tabs.patents"
              emptyKey="kkk.emptyStates.patents"
              onCreate={wrap(patentsApi.create, ['patents', 'me'])}
              onUpdate={wrap(patentsApi.update, ['patents', 'me'])}
              onDelete={wrap(patentsApi.delete, ['patents', 'me'])}
              renderCardTitle={(p) => <span>{p.title ?? '—'}</span>}
              renderCardSubtitle={(p) => (
                <span>
                  {p.patentNumber ?? ''}{p.year ? ` · ${p.year}` : ''}{p.country ? ` · ${p.country}` : ''}
                </span>
              )}
              renderExtra={(p) =>
                p.description ? <p className="text-xs text-muted-foreground">{p.description}</p> : null
              }
            />
          </TabsContent>

          <TabsContent value="publications" className="border rounded-lg p-4 bg-card mt-3">
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">
                {t('kkk.publicationsTabHint')}
              </p>
              <Button asChild>
                <Link to="/publications">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  {t('kkk.tabs.publications')}
                </Link>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default KkkPreparation;
