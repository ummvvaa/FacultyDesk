import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, ChevronUp, Plus, ExternalLink, FileText, BookOpen, Upload, Trash2, Pencil, Send, Sparkles, X, Wand2, Loader2 } from 'lucide-react';
import PinButton from '../components/dashboard/PinButton';
import PageHeader from '../components/layout/PageHeader';
import EmptyState from '../components/EmptyState';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import { Skeleton } from '../components/ui/skeleton';
import { Separator } from '../components/ui/separator';
import { Label } from '../components/ui/label';

import {
  useMyPublications,
  useCreatePublication,
  useUpdatePublication,
  useDeletePublication,
  useSubmitPublication,
  usePublicationFiles,
  useAddPublicationFile,
  useDeletePublicationFile,
} from '../hooks/usePublications';
import { publicationsApi } from '../api/publications';
import { aiApi } from '../api/ai';
import {
  Publication,
  PublicationFieldSuggestions,
  PublicationType,
  DatabaseType,
  Quartile,
  PubFileType,
  PublicationStatus,
  PublicationDto,
  PublicationMetadata,
} from '../types';

const CURRENT_YEAR = new Date().getFullYear();

const pubSchema = z.object({
  title: z.string().min(5, 'Min 5 characters'),
  authors: z.string().min(1, 'Required'),
  publicationYear: z
    .string()
    .optional()
    .refine(
      (v) => !v || (/^\d+$/.test(v) && Number(v) >= 1900 && Number(v) <= CURRENT_YEAR + 1),
      { message: `Year must be 1900–${CURRENT_YEAR + 1}` }
    ),
  journalName: z.string().optional(),
  publicationType: z.string().min(1, 'Required'),
  databaseType: z.string().min(1, 'Required'),
  doi: z
    .string()
    .optional()
    .refine((v) => !v || /^10\.\d{4,9}\/\S+$/.test(v), { message: 'Invalid DOI format' }),
  url: z
    .string()
    .optional()
    .refine((v) => !v || /^https?:\/\/.+/.test(v), { message: 'Invalid URL' }),
  quartile: z.string().optional(),
  percentile: z
    .string()
    .optional()
    .refine(
      (v) => !v || (/^\d+$/.test(v) && Number(v) >= 0 && Number(v) <= 100),
      { message: 'Percentile must be 0–100' }
    ),
  indexingStatus: z.string().optional(),
});

type PubFormValues = z.infer<typeof pubSchema>;

const PUB_TYPES: { value: PublicationType; labelKey: string }[] = [
  { value: 'SCOPUS_JOURNAL', labelKey: 'scopusJournal' },
  { value: 'SCOPUS_CONFERENCE', labelKey: 'scopusConference' },
  { value: 'WOS_ARTICLE', labelKey: 'wosArticle' },
  { value: 'KOKSON_ARTICLE', labelKey: 'koksonArticle' },
  { value: 'LOCAL_JOURNAL', labelKey: 'localJournal' },
  { value: 'CONFERENCE_PAPER', labelKey: 'conferencePaper' },
  { value: 'PATENT', labelKey: 'patent' },
  { value: 'CERTIFICATE', labelKey: 'certificate' },
  { value: 'OTHER', labelKey: 'other' },
];

const DB_TYPES: { value: DatabaseType; labelKey: string }[] = [
  { value: 'SCOPUS', labelKey: 'scopus' },
  { value: 'WEB_OF_SCIENCE', labelKey: 'webOfScience' },
  { value: 'KOKSON', labelKey: 'kokson' },
  { value: 'OTHER', labelKey: 'other' },
];

const QUARTILES: Quartile[] = ['Q1', 'Q2', 'Q3', 'Q4', 'NONE'];

const FILE_TYPES: { value: PubFileType; labelKey: string }[] = [
  { value: 'PDF_ARTICLE', labelKey: 'pdfArticle' },
  { value: 'OTTISK', labelKey: 'ottisk' },
  { value: 'CERTIFICATE', labelKey: 'certificate' },
  { value: 'JOURNAL_PAGE_SCAN', labelKey: 'journalPageScan' },
  { value: 'DOI_CONFIRMATION', labelKey: 'doiConfirmation' },
  { value: 'OTHER', labelKey: 'other' },
];

function quartileBadgeClass(q: Quartile) {
  switch (q) {
    case 'Q1': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'Q2': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'Q3': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'Q4': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
    default: return 'bg-muted text-muted-foreground';
  }
}

function statusBadgeVariant(s: PublicationStatus): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (s) {
    case 'VERIFIED': return 'default';
    case 'REJECTED': return 'destructive';
    case 'DRAFT': return 'outline';
    default: return 'secondary';
  }
}

// --- FilesSection: per-card files panel ---
function FilesSection({ pub }: { pub: Publication }) {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadFileType, setUploadFileType] = useState<PubFileType>('PDF_ARTICLE');
  const [uploading, setUploading] = useState(false);

  const { data: files = [], isLoading } = usePublicationFiles(pub.id);
  const addFile = useAddPublicationFile();
  const deleteFile = useDeletePublicationFile();

  const handleUpload = async () => {
    const f = fileInputRef.current?.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      await addFile.mutateAsync({ pubId: pub.id, file: f, fileType: uploadFileType });
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (fileId: number, name: string) => {
    publicationsApi.downloadFile(fileId, name);
  };

  if (isLoading) return <Skeleton className="h-8 w-full" />;

  return (
    <div className="space-y-2">
      {files.length > 0 ? (
        <div className="space-y-1">
          {files.map((file) => (
            <div key={file.id} className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate">{file.originalName}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {t(`publications.fileTypes.${FILE_TYPES.find(ft => ft.value === file.fileType)?.labelKey ?? 'other'}`)}
                </Badge>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDownload(file.id, file.originalName)}
                >
                  {t('publications.actions.downloadFile')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => deleteFile.mutate({ fileId: file.id, pubId: pub.id })}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No files attached.</p>
      )}

      <div className="flex items-center gap-2 pt-1">
        <input ref={fileInputRef} type="file" className="text-sm flex-1 min-w-0" />
        <Select value={uploadFileType} onValueChange={(v) => setUploadFileType(v as PubFileType)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILE_TYPES.map((ft) => (
              <SelectItem key={ft.value} value={ft.value}>
                {t(`publications.fileTypes.${ft.labelKey}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={handleUpload} disabled={uploading}>
          <Upload className="w-4 h-4 mr-1" />
          {t('publications.actions.uploadFile')}
        </Button>
      </div>
    </div>
  );
}

// --- PublicationCard ---
interface PublicationCardProps {
  pub: Publication;
  onEdit: (pub: Publication) => void;
}

function PublicationCard({ pub, onEdit }: PublicationCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const deletePub = useDeletePublication();
  const submitPub = useSubmitPublication();

  const canSubmit =
    pub.status === 'DRAFT' || pub.status === 'REJECTED' || pub.status === 'NEEDS_CORRECTION';

  const pubTypeLabel =
    PUB_TYPES.find((pt) => pt.value === pub.publicationType)?.labelKey ?? 'other';
  const dbTypeLabel =
    DB_TYPES.find((dt) => dt.value === pub.databaseType)?.labelKey ?? 'other';

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="group border border-border rounded-lg bg-card overflow-hidden transition-all duration-200 hover:border-muted-foreground/30 hover:shadow-sm">
        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base leading-snug tracking-tight">{pub.title}</h3>
              <p className="text-sm text-muted-foreground mt-1 truncate">{pub.authors}</p>
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                {pub.publicationYear && (
                  <span className="text-xs text-muted-foreground tabular-nums font-medium">{pub.publicationYear}</span>
                )}
                {pub.journalName && (
                  <span className="text-xs text-muted-foreground">· {pub.journalName}</span>
                )}
                <span className="w-px h-3 bg-border mx-1" />
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {t(`publications.publicationTypes.${pubTypeLabel}`)}
                </Badge>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {t(`publications.databaseTypes.${dbTypeLabel}`)}
                </Badge>
                <Badge variant={statusBadgeVariant(pub.status)} className="text-[10px] px-1.5 py-0">
                  {t(`publications.statuses.${pub.status.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase())}`)}
                </Badge>
                {pub.quartile && pub.quartile !== 'NONE' && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${quartileBadgeClass(pub.quartile)}`}>
                    {t(`publications.quartiles.${pub.quartile.toLowerCase()}`)}
                  </span>
                )}
                {pub.doi && (
                  <a
                    href={`https://doi.org/${pub.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-medium"
                    onClick={(e) => e.stopPropagation()}
                  >
                    DOI <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <PinButton type="PUBLICATION" itemId={pub.id} customTitle={pub.title} />
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
        </div>

        <CollapsibleContent>
          <Separator />
          <div className="p-4 space-y-4">
            {pub.percentile !== undefined && pub.percentile !== null && (
              <p className="text-sm">
                <span className="text-muted-foreground">Percentile: </span>
                {pub.percentile}%
              </p>
            )}
            {pub.indexingStatus && (
              <p className="text-sm">
                <span className="text-muted-foreground">{t('publications.form.indexingStatus')}: </span>
                {pub.indexingStatus}
              </p>
            )}
            {pub.url && (
              <p className="text-sm">
                <span className="text-muted-foreground">URL: </span>
                <a href={pub.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  {pub.url}
                </a>
              </p>
            )}
            {(pub.status === 'REJECTED' || pub.status === 'NEEDS_CORRECTION') && pub.reviewerComment && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                <p className="text-xs font-medium text-destructive mb-1">Reviewer comment:</p>
                <p className="text-sm">{pub.reviewerComment}</p>
              </div>
            )}

            <div>
              <p className="text-sm font-medium mb-2">Files</p>
              <FilesSection pub={pub} />
            </div>

            <div className="flex gap-2 flex-wrap pt-1">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onEdit(pub)}
              >
                <Pencil className="w-4 h-4 mr-1" />
                {t('publications.actions.edit')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:text-destructive"
                onClick={() => {
                  if (window.confirm('Delete this publication?')) {
                    deletePub.mutate(pub.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {t('publications.actions.delete')}
              </Button>
              {canSubmit && (
                <Button
                  size="sm"
                  onClick={() => submitPub.mutate(pub.id)}
                  disabled={submitPub.isPending}
                >
                  <Send className="w-4 h-4 mr-1" />
                  {t('publications.actions.submit')}
                </Button>
              )}
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// --- Publication form dialog ---
interface PubFormDialogProps {
  open: boolean;
  onClose: () => void;
  editing: Publication | null;
}

function PubFormDialog({ open, onClose, editing }: PubFormDialogProps) {
  const { t, i18n } = useTranslation();
  const createPub = useCreatePublication();
  const updatePub = useUpdatePublication();
  const addFile = useAddPublicationFile();

  const toStr = (v?: number | string) => (v !== undefined && v !== null ? String(v) : '');

  // AI extraction state (only relevant for new publications)
  const aiInputRef = useRef<HTMLInputElement>(null);
  const [aiPdfFile, setAiPdfFile] = useState<File | null>(null);
  const [aiExtracting, setAiExtracting] = useState(false);
  const [aiExtracted, setAiExtracted] = useState<PublicationMetadata | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [savePdfAsFile, setSavePdfAsFile] = useState(true);

  // AI field suggestions state
  const [isSuggestingFields, setIsSuggestingFields] = useState(false);
  const [suggestionsData, setSuggestionsData] = useState<PublicationFieldSuggestions | null>(null);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestSelectedFields, setSuggestSelectedFields] = useState<Set<string>>(new Set());

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PubFormValues>({
    resolver: zodResolver(pubSchema),
    defaultValues: editing
      ? {
          title: editing.title,
          authors: editing.authors,
          publicationYear: toStr(editing.publicationYear),
          journalName: editing.journalName ?? '',
          publicationType: editing.publicationType,
          databaseType: editing.databaseType,
          doi: editing.doi ?? '',
          url: editing.url ?? '',
          quartile: editing.quartile ?? '',
          percentile: toStr(editing.percentile),
          indexingStatus: editing.indexingStatus ?? '',
        }
      : {
          title: '',
          authors: '',
          publicationYear: '',
          journalName: '',
          doi: '',
          url: '',
          quartile: '',
          percentile: '',
          indexingStatus: '',
        },
  });

  React.useEffect(() => {
    if (open) {
      // reset AI extraction state on every open
      setAiPdfFile(null);
      setAiExtracted(null);
      setAiError(null);
      setAiExtracting(false);
      setSavePdfAsFile(true);
      if (aiInputRef.current) aiInputRef.current.value = '';

      reset(
        editing
          ? {
              title: editing.title,
              authors: editing.authors,
              publicationYear: toStr(editing.publicationYear),
              journalName: editing.journalName ?? '',
              publicationType: editing.publicationType,
              databaseType: editing.databaseType,
              doi: editing.doi ?? '',
              url: editing.url ?? '',
              quartile: editing.quartile ?? '',
              percentile: toStr(editing.percentile),
              indexingStatus: editing.indexingStatus ?? '',
            }
          : {
              title: '',
              authors: '',
              publicationYear: '',
              journalName: '',
              doi: '',
              url: '',
              quartile: '',
              percentile: '',
              indexingStatus: '',
            }
      );
    }
  }, [open, editing, reset]);

  const onSubmit = async (values: PubFormValues) => {
    const dto: PublicationDto = {
      title: values.title,
      authors: values.authors,
      publicationYear: values.publicationYear ? Number(values.publicationYear) : undefined,
      journalName: values.journalName || undefined,
      publicationType: values.publicationType as PublicationType,
      databaseType: values.databaseType as DatabaseType,
      doi: values.doi || undefined,
      url: values.url || undefined,
      quartile: (values.quartile as Quartile) || undefined,
      percentile: values.percentile ? Number(values.percentile) : undefined,
      indexingStatus: values.indexingStatus || undefined,
    };
    if (editing) {
      await updatePub.mutateAsync({ id: editing.id, dto });
    } else {
      const created = await createPub.mutateAsync(dto);
      if (aiPdfFile && savePdfAsFile && created?.id) {
        try {
          await addFile.mutateAsync({ pubId: created.id, file: aiPdfFile, fileType: 'PDF_ARTICLE' });
        } catch {
          // Non-blocking: publication is created; user can upload manually if this fails.
        }
      }
    }
    onClose();
  };

  const handleAiExtract = async () => {
    setAiError(null);
    const file = aiInputRef.current?.files?.[0] ?? aiPdfFile;
    if (!file) {
      setAiError(t('publications.aiExtract.selectPdfFirst'));
      return;
    }
    setAiPdfFile(file);
    setAiExtracting(true);
    try {
      const meta = await aiApi.extractPublicationMetadata(file);
      setAiExtracted(meta);
      if (meta.title) setValue('title', meta.title, { shouldValidate: true });
      if (meta.authors) setValue('authors', meta.authors, { shouldValidate: true });
      if (meta.year) setValue('publicationYear', String(meta.year), { shouldValidate: true });
      if (meta.journalName) setValue('journalName', meta.journalName);
      if (meta.doi) setValue('doi', meta.doi, { shouldValidate: true });
      if (meta.publicationType) setValue('publicationType', meta.publicationType, { shouldValidate: true });
      if (meta.databaseType) setValue('databaseType', meta.databaseType, { shouldValidate: true });
    } catch {
      setAiError(t('publications.aiExtract.error'));
    } finally {
      setAiExtracting(false);
    }
  };

  const handleAiClear = () => {
    setAiPdfFile(null);
    setAiExtracted(null);
    setAiError(null);
    if (aiInputRef.current) aiInputRef.current.value = '';
    setValue('title', '');
    setValue('authors', '');
    setValue('publicationYear', '');
    setValue('journalName', '');
    setValue('doi', '');
    setValue('publicationType', '');
    setValue('databaseType', '');
  };

  const handleSuggestFields = async () => {
    const journalName = watch('journalName') ?? '';
    if (journalName.trim().length < 3) return;
    setIsSuggestingFields(true);
    try {
      const data = await aiApi.suggestPublicationFields(journalName.trim(), i18n.language);
      if ((data.confidence ?? 0) <= 0.3) {
        // toast shown via the modal low-confidence path — just show modal anyway
      }
      setSuggestionsData(data);
      // pre-select all fields with any data
      const preSelected = new Set<string>();
      if (data.publicationType) preSelected.add('publicationType');
      if (data.databaseType) preSelected.add('databaseType');
      if (data.quartile && data.quartile !== 'NONE') preSelected.add('quartile');
      if (data.issn) preSelected.add('issn');
      if (data.journalName) preSelected.add('journalName');
      setSuggestSelectedFields(preSelected);
      setShowSuggestModal(true);
    } catch {
      // silent — leave form as is
    } finally {
      setIsSuggestingFields(false);
    }
  };

  const handleApplySuggestions = () => {
    if (!suggestionsData) return;
    if (suggestSelectedFields.has('journalName') && suggestionsData.journalName) {
      setValue('journalName', suggestionsData.journalName);
    }
    if (suggestSelectedFields.has('publicationType') && suggestionsData.publicationType) {
      setValue('publicationType', suggestionsData.publicationType, { shouldValidate: true });
    }
    if (suggestSelectedFields.has('databaseType') && suggestionsData.databaseType) {
      setValue('databaseType', suggestionsData.databaseType, { shouldValidate: true });
    }
    if (suggestSelectedFields.has('quartile') && suggestionsData.quartile) {
      setValue('quartile', suggestionsData.quartile);
    }
    setShowSuggestModal(false);
    setSuggestionsData(null);
  };

  const field = (
    name: keyof PubFormValues,
    label: string,
    type: string = 'text',
    placeholder?: string
  ) => (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        {...register(name)}
        className={errors[name] ? 'border-destructive' : ''}
      />
      {errors[name] && (
        <p className="text-xs text-destructive">{errors[name]?.message as string}</p>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? t('publications.editPublication') : t('publications.addPublication')}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          {!editing && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">{t('publications.aiExtract.title')}</h3>
              </div>

              <label
                htmlFor="ai-pdf-input"
                className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-primary/30 rounded-md px-4 py-6 cursor-pointer hover:bg-primary/5 transition-colors text-center"
              >
                <Upload className="w-5 h-5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {aiPdfFile ? aiPdfFile.name : t('publications.aiExtract.dropZone')}
                </span>
                <input
                  ref={aiInputRef}
                  id="ai-pdf-input"
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setAiPdfFile(f);
                    setAiError(null);
                  }}
                />
              </label>

              <div className="flex flex-wrap gap-2 items-center">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAiExtract}
                  disabled={aiExtracting || !aiPdfFile}
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  {aiExtracting ? t('publications.aiExtract.extracting') : t('publications.aiExtract.extractButton')}
                </Button>
                {(aiExtracted || aiPdfFile) && (
                  <Button type="button" size="sm" variant="outline" onClick={handleAiClear}>
                    <X className="w-4 h-4 mr-1" />
                    {t('publications.aiExtract.clear')}
                  </Button>
                )}
              </div>

              {aiError && (
                <p className="text-xs text-destructive">{aiError}</p>
              )}

              {aiExtracted && (
                <div className="rounded-md bg-background border p-3 space-y-1.5 text-xs">
                  <p className="font-medium text-primary">
                    {t('publications.aiExtract.confidence', {
                      percent: Math.round((aiExtracted.confidence ?? 0) * 100),
                    })}
                  </p>
                  <p className="text-muted-foreground">{t('publications.aiExtract.extracted')}</p>
                </div>
              )}

              {aiPdfFile && (
                <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={savePdfAsFile}
                    onChange={(e) => setSavePdfAsFile(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>{t('publications.aiExtract.savePdfAsFile')}</span>
                </label>
              )}
            </div>
          )}

          {field('title', t('publications.form.title'), 'text', 'Article title...')}
          {field('authors', t('publications.form.authors'), 'text', 'Ivanov I.I., Petrov P.P.')}
          <div className="grid grid-cols-2 gap-4">
            {field('publicationYear', t('publications.form.year'), 'text', String(CURRENT_YEAR))}
            <div className="space-y-1">
              <Label htmlFor="journalName">{t('publications.form.journal')}</Label>
              <div className="flex gap-1">
                <Input
                  id="journalName"
                  type="text"
                  placeholder="Journal name..."
                  {...register('journalName')}
                  className={errors.journalName ? 'border-destructive' : ''}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  title={t('publications.aiSuggest.button')}
                  onClick={handleSuggestFields}
                  disabled={isSuggestingFields || (watch('journalName') ?? '').trim().length < 3}
                  className="shrink-0 h-10 w-10"
                >
                  {isSuggestingFields
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Wand2 className="w-4 h-4" />
                  }
                </Button>
              </div>
              {errors.journalName && (
                <p className="text-xs text-destructive">{errors.journalName.message as string}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t('publications.form.publicationType')}</Label>
              <Controller
                control={control}
                name="publicationType"
                render={({ field: f }) => (
                  <Select value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger className={errors.publicationType ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {PUB_TYPES.map((pt) => (
                        <SelectItem key={pt.value} value={pt.value}>
                          {t(`publications.publicationTypes.${pt.labelKey}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.publicationType && (
                <p className="text-xs text-destructive">{errors.publicationType.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <Label>{t('publications.form.databaseType')}</Label>
              <Controller
                control={control}
                name="databaseType"
                render={({ field: f }) => (
                  <Select value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger className={errors.databaseType ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Select database..." />
                    </SelectTrigger>
                    <SelectContent>
                      {DB_TYPES.map((dt) => (
                        <SelectItem key={dt.value} value={dt.value}>
                          {t(`publications.databaseTypes.${dt.labelKey}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.databaseType && (
                <p className="text-xs text-destructive">{errors.databaseType.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {field('doi', t('publications.form.doi'), 'text', '10.1234/example')}
            {field('url', t('publications.form.url'), 'text', 'https://...')}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>{t('publications.form.quartile')}</Label>
              <Controller
                control={control}
                name="quartile"
                render={({ field: f }) => (
                  <Select value={f.value ?? ''} onValueChange={f.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {QUARTILES.map((q) => (
                        <SelectItem key={q} value={q}>
                          {t(`publications.quartiles.${q.toLowerCase()}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            {field('percentile', t('publications.form.percentile'), 'text', '0–100')}
          </div>

          {field('indexingStatus', t('publications.form.indexingStatus'), 'text', 'e.g. Indexed since 2020')}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* AI Field Suggestions Modal */}
      <Dialog open={showSuggestModal} onOpenChange={(v) => { if (!v) setShowSuggestModal(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t('publications.aiSuggest.dialogTitle', { journal: suggestionsData?.journalName ?? watch('journalName') ?? '' })}
            </DialogTitle>
          </DialogHeader>
          {suggestionsData && (suggestionsData.confidence ?? 0) <= 0.3 ? (
            <p className="text-sm text-muted-foreground py-2">{t('publications.aiSuggest.lowConfidence')}</p>
          ) : (
            <div className="space-y-3 py-2">
              <p className="text-xs text-muted-foreground">
                {t('publications.aiSuggest.confidence', { percent: Math.round((suggestionsData?.confidence ?? 0) * 100) })}
              </p>
              <div className="space-y-2">
                {suggestionsData?.journalName && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={suggestSelectedFields.has('journalName')} onChange={(e) => {
                      const s = new Set(suggestSelectedFields);
                      e.target.checked ? s.add('journalName') : s.delete('journalName');
                      setSuggestSelectedFields(s);
                    }} />
                    <span className="text-muted-foreground">Название журнала:</span>
                    <span className="font-medium">{suggestionsData.journalName}</span>
                  </label>
                )}
                {suggestionsData?.publicationType && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={suggestSelectedFields.has('publicationType')} onChange={(e) => {
                      const s = new Set(suggestSelectedFields);
                      e.target.checked ? s.add('publicationType') : s.delete('publicationType');
                      setSuggestSelectedFields(s);
                    }} />
                    <span className="text-muted-foreground">Тип публикации:</span>
                    <span className="font-medium">{suggestionsData.publicationType}</span>
                  </label>
                )}
                {suggestionsData?.databaseType && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={suggestSelectedFields.has('databaseType')} onChange={(e) => {
                      const s = new Set(suggestSelectedFields);
                      e.target.checked ? s.add('databaseType') : s.delete('databaseType');
                      setSuggestSelectedFields(s);
                    }} />
                    <span className="text-muted-foreground">База данных:</span>
                    <span className="font-medium">{suggestionsData.databaseType}</span>
                  </label>
                )}
                {suggestionsData?.quartile && suggestionsData.quartile !== 'NONE' && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={suggestSelectedFields.has('quartile')} onChange={(e) => {
                      const s = new Set(suggestSelectedFields);
                      e.target.checked ? s.add('quartile') : s.delete('quartile');
                      setSuggestSelectedFields(s);
                    }} />
                    <span className="text-muted-foreground">Квартиль:</span>
                    <span className="font-medium">{suggestionsData.quartile}</span>
                  </label>
                )}
                {suggestionsData?.issn && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">ISSN:</span>
                    <span className="font-medium">{suggestionsData.issn}</span>
                  </div>
                )}
                {suggestionsData?.publisher && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Издатель:</span>
                    <span className="font-medium">{suggestionsData.publisher}</span>
                  </div>
                )}
                {suggestionsData?.indexedDatabases && suggestionsData.indexedDatabases.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Индексируется в:</span>
                    <span className="font-medium">{suggestionsData.indexedDatabases.join(', ')}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={handleApplySuggestions}>
                  {t('publications.aiSuggest.applySelected')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setShowSuggestModal(false)}>
                  {t('publications.aiSuggest.dismiss')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

// --- Sub-filter pill ---
interface FilterPillProps {
  label: string;
  active: boolean;
  onClick: () => void;
}
function FilterPill({ label, active, onClick }: FilterPillProps) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-background text-muted-foreground border-border hover:bg-accent'
      }`}
    >
      {label}
    </button>
  );
}

// --- Main page ---
export default function Publications() {
  const { t } = useTranslation();
  const { data: pubs = [], isLoading } = useMyPublications();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Publication | null>(null);

  // Scopus sub-filters
  const [scopusTypes, setScopusTypes] = useState<Set<string>>(new Set());
  const [scopusQuartiles, setScopusQuartiles] = useState<Set<string>>(new Set());
  const [scopusDoi, setScopusDoi] = useState<string | null>(null);
  const [scopusNeedVerif, setScopusNeedVerif] = useState(false);

  // KOKSON sub-filters
  const [koksonFilter, setKoksonFilter] = useState<string | null>(null);

  const toggle = <T extends string>(set: Set<T>, val: T): Set<T> => {
    const next = new Set(set);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    return next;
  };

  const handleEdit = (pub: Publication) => {
    setEditing(pub);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const filterByTab = (list: Publication[], tab: string): Publication[] => {
    switch (tab) {
      case 'scopus':
        return list.filter((p) => p.databaseType === 'SCOPUS');
      case 'wos':
        return list.filter((p) => p.databaseType === 'WEB_OF_SCIENCE');
      case 'kokson':
        return list.filter((p) => p.databaseType === 'KOKSON');
      case 'other':
        return list.filter(
          (p) => !['SCOPUS', 'WEB_OF_SCIENCE', 'KOKSON'].includes(p.databaseType)
        );
      default:
        return list;
    }
  };

  const applyScopusFilters = (list: Publication[]): Publication[] => {
    let result = list;
    if (scopusTypes.size > 0) {
      const allowed = new Set<string>();
      if (scopusTypes.has('journal')) allowed.add('SCOPUS_JOURNAL');
      if (scopusTypes.has('conference')) allowed.add('SCOPUS_CONFERENCE');
      result = result.filter((p) => allowed.has(p.publicationType));
    }
    if (scopusQuartiles.size > 0) {
      result = result.filter((p) => scopusQuartiles.has(p.quartile));
    }
    if (scopusDoi === 'with') result = result.filter((p) => !!p.doi);
    if (scopusDoi === 'without') result = result.filter((p) => !p.doi);
    if (scopusNeedVerif) result = result.filter((p) => p.status !== 'VERIFIED');
    return result;
  };

  const applyKoksonFilters = (list: Publication[]): Publication[] => {
    if (!koksonFilter) return list;
    switch (koksonFilter) {
      case 'verified':
        return list.filter((p) => p.status === 'VERIFIED');
      case 'needVerification':
        return list.filter((p) => p.status !== 'VERIFIED');
      default:
        return list;
    }
  };

  const renderList = (list: Publication[]) => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      );
    }
    if (list.length === 0) {
      return (
        <EmptyState
          icon={BookOpen}
          title={t('emptyStates.publications.title')}
          description={t('emptyStates.publications.description')}
          actionLabel={t('emptyStates.publications.action')}
          onAction={handleAddNew}
        />
      );
    }
    return (
      <div className="space-y-3">
        {list.map((pub) => (
          <PublicationCard key={pub.id} pub={pub} onEdit={handleEdit} />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <PageHeader
        title={t('publications.title')}
        icon={BookOpen}
        actions={
          <Button onClick={handleAddNew}>
            <Plus className="w-4 h-4 mr-2" />
            {t('publications.addPublication')}
          </Button>
        }
      />

      <Tabs defaultValue="all">
        <TabsList className="mb-4">
          {(['all', 'scopus', 'wos', 'kokson', 'other'] as const).map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {t(`publications.tabs.${tab}`)}
              {tab !== 'all' && (
                <span className="ml-1.5 text-xs opacity-60">
                  ({filterByTab(pubs, tab).length})
                </span>
              )}
              {tab === 'all' && (
                <span className="ml-1.5 text-xs opacity-60">({pubs.length})</span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* All */}
        <TabsContent value="all">
          {renderList(pubs)}
        </TabsContent>

        {/* Scopus */}
        <TabsContent value="scopus">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs text-muted-foreground self-center">{t('publications.filters.type')}:</span>
            <FilterPill
              label={t('publications.publicationTypes.scopusJournal')}
              active={scopusTypes.has('journal')}
              onClick={() => setScopusTypes(toggle(scopusTypes, 'journal'))}
            />
            <FilterPill
              label={t('publications.publicationTypes.scopusConference')}
              active={scopusTypes.has('conference')}
              onClick={() => setScopusTypes(toggle(scopusTypes, 'conference'))}
            />
            <Separator orientation="vertical" className="h-5" />
            <span className="text-xs text-muted-foreground self-center">{t('publications.filters.quartile')}:</span>
            {(['Q1', 'Q2', 'Q3', 'Q4'] as Quartile[]).map((q) => (
              <FilterPill
                key={q}
                label={q}
                active={scopusQuartiles.has(q)}
                onClick={() => setScopusQuartiles(toggle(scopusQuartiles, q))}
              />
            ))}
            <Separator orientation="vertical" className="h-5" />
            <span className="text-xs text-muted-foreground self-center">{t('publications.filters.doi')}:</span>
            <FilterPill
              label={t('publications.filters.withDoi')}
              active={scopusDoi === 'with'}
              onClick={() => setScopusDoi(scopusDoi === 'with' ? null : 'with')}
            />
            <FilterPill
              label={t('publications.filters.withoutDoi')}
              active={scopusDoi === 'without'}
              onClick={() => setScopusDoi(scopusDoi === 'without' ? null : 'without')}
            />
            <Separator orientation="vertical" className="h-5" />
            <FilterPill
              label={t('publications.filters.needVerification')}
              active={scopusNeedVerif}
              onClick={() => setScopusNeedVerif(!scopusNeedVerif)}
            />
          </div>
          {renderList(applyScopusFilters(filterByTab(pubs, 'scopus')))}
        </TabsContent>

        {/* WoS */}
        <TabsContent value="wos">
          {renderList(filterByTab(pubs, 'wos'))}
        </TabsContent>

        {/* KOKSON */}
        <TabsContent value="kokson">
          <div className="flex flex-wrap gap-2 mb-4">
            {(['verified', 'needVerification'] as const).map((f) => (
              <FilterPill
                key={f}
                label={t(`publications.filters.${f}`)}
                active={koksonFilter === f}
                onClick={() => setKoksonFilter(koksonFilter === f ? null : f)}
              />
            ))}
          </div>
          {renderList(applyKoksonFilters(filterByTab(pubs, 'kokson')))}
        </TabsContent>

        {/* Other */}
        <TabsContent value="other">
          {renderList(filterByTab(pubs, 'other'))}
        </TabsContent>
      </Tabs>

      <PubFormDialog
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setEditing(null); }}
        editing={editing}
      />
    </div>
  );
}
