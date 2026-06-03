import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../api/users';
import { Switch } from '../components/ui/switch';
import { educationApi } from '../api/education';
import { workExperienceApi } from '../api/workExperience';
import { qualificationCoursesApi } from '../api/qualificationCourses';
import { awardsApi } from '../api/awards';
import { patentsApi } from '../api/patents';
import { aiApi } from '../api/ai';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  User, Mail, Phone, GraduationCap, Briefcase, MapPin, BookOpen,
  Save, ExternalLink, Award, Sparkles, Pencil, X,
  Globe, FileDown, QrCode, Copy, Check, Link, Lock, Shield,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from '../components/ui/dialog';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '../hooks/useToast';
import { EnglishLevel } from '../types';
import { getInitials } from '../lib/utils';
import { ShimmerButton } from '../components/ui/ShimmerButton';

const ENGLISH_LEVELS: EnglishLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NATIVE', 'NONE'];

const profileSchema = z.object({
  email: z.string().refine(
    val => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
    { message: 'Invalid email' }
  ).optional(),
  academicDegree: z.string().optional(),
  position: z.string().optional(),
  phone: z.string().optional(),
  office: z.string().optional(),
  researchAreas: z.string().optional(),
  publications: z.string().optional(),
  // Academic Information
  academicTitle: z.string().optional(),
  employmentRate: z.string().refine(
    val => !val || (Number(val) >= 0.1 && Number(val) <= 2.0),
    { message: '0.1 – 2.0' }
  ).optional(),
  englishLevel: z.string().optional(),
  // Online Profiles
  scopusAuthorId: z.string().optional(),
  orcid: z.string().refine(
    val => !val || /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(val),
    { message: 'Format: XXXX-XXXX-XXXX-XXXX' }
  ).optional(),
  googleScholarUrl: z.string().refine(
    val => !val || (() => { try { new URL(val); return true; } catch { return false; } })(),
    { message: 'Invalid URL' }
  ).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const ChangePasswordDialog: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const mutation = useMutation({
    mutationFn: usersApi.changePassword,
    onSuccess: () => {
      toast({ title: t('common.success'), description: t('profile.security.passwordChanged'), variant: 'success' });
      setOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error?.response?.data?.message || t('profile.security.changeError'),
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (newPassword.length < 8) {
      toast({ title: t('common.error'), description: t('profile.security.passwordTooShort'), variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t('common.error'), description: t('profile.security.passwordsDontMatch'), variant: 'destructive' });
      return;
    }
    mutation.mutate({ currentPassword, newPassword });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Lock className="w-4 h-4 mr-2" />
          {t('profile.security.changePassword')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('profile.security.changePasswordTitle')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-1 block">{t('profile.security.currentPassword')}</label>
            <Input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('profile.security.newPassword')}</label>
            <Input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">{t('profile.security.passwordHint')}</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">{t('profile.security.confirmPassword')}</label>
            <Input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          <Button type="button" onClick={handleSubmit} disabled={mutation.isPending}>
            {mutation.isPending ? t('common.loading') : t('profile.security.changePassword')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Profile: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [aiSummaryText, setAiSummaryText] = useState('');
  const [aiSummaryEditing, setAiSummaryEditing] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  // Public profile state
  const [publicEnabled, setPublicEnabled] = useState(false);
  const [customSlug, setCustomSlug] = useState('');
  const [slugCopied, setSlugCopied] = useState(false);
  const [cvDownloading, setCvDownloading] = useState(false);
  const [slugSaving, setSlugSaving] = useState(false);

  const { data: userData, refetch: refetchUserData } = useQuery({
    queryKey: ['user', user?.id],
    queryFn: () => usersApi.getById(user!.id),
    enabled: !!user,
  });

  const { data: publicProfileStatus } = useQuery({
    queryKey: ['publicProfileStatus'],
    queryFn: () => usersApi.getPublicProfileStatus(),
    enabled: !!user,
  });

  useEffect(() => {
    if (publicProfileStatus) {
      setPublicEnabled(publicProfileStatus.enabled);
      setCustomSlug(publicProfileStatus.slug || '');
    }
  }, [publicProfileStatus]);

  // Academic Activities data
  const { data: educations = [] } = useQuery({
    queryKey: ['education', 'me'],
    queryFn: () => educationApi.getMy(),
    enabled: !!user,
  });
  const { data: workExperiences = [] } = useQuery({
    queryKey: ['work-experience', 'me'],
    queryFn: () => workExperienceApi.getMy(),
    enabled: !!user,
  });
  const { data: qualCourses = [] } = useQuery({
    queryKey: ['qualification-courses', 'me'],
    queryFn: () => qualificationCoursesApi.getMy(),
    enabled: !!user,
  });
  const { data: awards = [] } = useQuery({
    queryKey: ['awards', 'me'],
    queryFn: () => awardsApi.getMy(),
    enabled: !!user,
  });
  const { data: patents = [] } = useQuery({
    queryKey: ['patents', 'me'],
    queryFn: () => patentsApi.getMy(),
    enabled: !!user,
  });

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (userData) {
      reset({
        email: userData.email || '',
        academicDegree: userData.academicDegree || '',
        position: userData.position || '',
        phone: userData.phone || '',
        office: userData.office || '',
        researchAreas: userData.researchAreas || '',
        publications: userData.publications || '',
        academicTitle: userData.academicTitle || '',
        employmentRate: userData.employmentRate?.toString() || '',
        englishLevel: userData.englishLevel || 'NONE',
        scopusAuthorId: userData.scopusAuthorId || '',
        orcid: userData.orcid || '',
        googleScholarUrl: userData.googleScholarUrl || '',
      });
      setAiSummaryText(userData.aiSummary || '');
    }
  }, [userData, reset]);

  const updateMutation = useMutation({
    mutationFn: (data: Record<string, any>) => usersApi.updateProfile(data as any),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['user', user?.id] });
      toast({ title: t('common.success'), description: t('profile.saveSuccess'), variant: 'success' });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('profile.saveError'), variant: 'destructive' });
    },
  });

  const aiSummaryMutation = useMutation({
    mutationFn: (text: string) => aiApi.saveProfileSummary(text),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user', user?.id] });
      const refreshed = await refetchUserData();
      if (refreshed.data) updateUser(refreshed.data);
      setAiSummaryEditing(false);
      toast({ title: t('common.success'), description: t('ai.summary.saved'), variant: 'success' });
    },
    onError: () => {
      toast({ title: t('common.error'), description: t('profile.saveError'), variant: 'destructive' });
    },
  });

  const handleGenerateAiSummary = async () => {
    setAiGenerating(true);
    try {
      const locale = i18n.language === 'en' ? 'en' : 'ru';
      const result = await aiApi.generateProfileSummary(locale);
      setAiSummaryText(result.summary || '');
      setAiSummaryEditing(true);
    } catch {
      toast({ title: t('common.error'), description: t('ai.summary.error'), variant: 'destructive' });
    } finally {
      setAiGenerating(false);
    }
  };

  const onSubmit = (data: ProfileFormData) => {
    const payload: Record<string, any> = { ...data };
    payload.employmentRate = data.employmentRate && data.employmentRate !== ''
      ? Number(data.employmentRate)
      : null;
    updateMutation.mutate(payload);
  };

  const handlePublicProfileSave = async () => {
    setSlugSaving(true);
    try {
      const slug = customSlug.trim() || undefined;
      if (slug && !/^[a-z0-9-]{3,50}$/.test(slug)) {
        toast({ title: t('common.error'), description: t('profile.publicProfile.slugInvalid'), variant: 'destructive' });
        return;
      }
      await usersApi.togglePublicProfile(publicEnabled, slug);
      queryClient.invalidateQueries({ queryKey: ['publicProfileStatus'] });
      toast({ title: t('common.success'), description: publicEnabled ? t('profile.publicProfile.enabled') : t('profile.publicProfile.disabled'), variant: 'success' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || t('common.error');
      toast({ title: t('common.error'), description: msg, variant: 'destructive' });
    } finally {
      setSlugSaving(false);
    }
  };

  const handleCvDownload = async () => {
    setCvDownloading(true);
    try {
      const blob = await usersApi.exportCv(i18n.language === 'en' ? 'en' : 'ru');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CV_${userData?.username || 'profile'}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: t('profile.cv.success'), variant: 'success' });
    } catch {
      toast({ title: t('common.error'), description: t('profile.cv.error'), variant: 'destructive' });
    } finally {
      setCvDownloading(false);
    }
  };

  const handleCopyPublicUrl = async () => {
    const slug = publicProfileStatus?.slug;
    if (!slug) return;
    await navigator.clipboard.writeText(`${window.location.origin}/p/${slug}`);
    setSlugCopied(true);
    setTimeout(() => setSlugCopied(false), 2000);
  };

  const scopusId = userData?.scopusAuthorId;
  const orcidVal = userData?.orcid;
  const gsUrl = userData?.googleScholarUrl;

  const activityCards = [
    {
      key: 'education',
      label: t('kkk.tabs.education'),
      count: educations.length,
      preview: educations.slice(0, 2).map((e: any) =>
        [e.degree, e.institution, e.year].filter(Boolean).join(' · ')
      ),
    },
    {
      key: 'workExperience',
      label: t('kkk.tabs.workExperience'),
      count: workExperiences.length,
      preview: workExperiences.slice(0, 2).map((w: any) =>
        [w.position, w.organization].filter(Boolean).join(' · ')
      ),
    },
    {
      key: 'qualificationCourses',
      label: t('kkk.tabs.qualificationCourses'),
      count: qualCourses.length,
      preview: qualCourses.slice(0, 2).map((q: any) => q.name || '').filter(Boolean),
    },
    {
      key: 'awards',
      label: t('kkk.tabs.awards'),
      count: awards.length,
      preview: awards.slice(0, 2).map((a: any) => a.name || '').filter(Boolean),
    },
    {
      key: 'patents',
      label: t('kkk.tabs.patents'),
      count: patents.length,
      preview: patents.slice(0, 2).map((p: any) => p.title || '').filter(Boolean),
    },
  ];

  const inputClass =
    'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <div className="space-y-6">
      {/* ── Profile Header ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden">
          <div className="h-24 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-b border-border" />
          <CardContent className="p-6 -mt-12 relative">
            <div className="flex items-end gap-5">
              <div className="w-24 h-24 rounded-2xl bg-card border-4 border-card shadow-md flex items-center justify-center shrink-0 ring-1 ring-border">
                <div className="w-full h-full rounded-xl bg-primary/10 text-primary flex items-center justify-center text-2xl font-semibold">
                  {getInitials(undefined, undefined, userData?.username || user?.username)}
                </div>
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold tracking-tight truncate">
                    {userData?.username || user?.username}
                  </h1>
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    {user?.role === 'ROLE_ADMIN' ? t('sidebar.adminPanel') : t('sidebar.teacherPortal')}
                  </span>
                </div>
                {(userData?.academicTitle || userData?.position) && (
                  <p className="text-sm text-muted-foreground mt-1.5">
                    {[userData?.academicTitle, userData?.position].filter(Boolean).join(' · ')}
                  </p>
                )}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {userData?.employmentRate != null && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground tabular-nums">
                      {t('profile.fields.employmentRate')}: {userData.employmentRate}
                    </span>
                  )}
                  {userData?.englishLevel && userData.englishLevel !== 'NONE' && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground">
                      EN · {userData.englishLevel}
                    </span>
                  )}
                  {userData?.email && (
                    <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground inline-flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {userData.email}
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <Button type="button" variant="outline" size="sm" onClick={handleCvDownload} disabled={cvDownloading}>
                    <FileDown className="w-4 h-4 mr-1.5" />
                    {cvDownloading ? t('profile.cv.downloading') : t('profile.cv.exportButton')}
                  </Button>
                  {publicProfileStatus?.enabled && publicProfileStatus?.slug && (
                    <a href={`/p/${publicProfileStatus.slug}`} target="_blank" rel="noopener noreferrer">
                      <Button type="button" variant="outline" size="sm">
                        <Globe className="w-4 h-4 mr-1.5" />
                        {t('profile.publicProfile.view')}
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Personal Info ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4 text-muted-foreground" />
            {t('profile.personalInfo')}
          </CardTitle>
          <CardDescription>{t('profile.personalInfoDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 flex items-center gap-2">
                    <User className="w-4 h-4" />{t('auth.username')}
                  </label>
                  <Input value={userData?.username || ''} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 flex items-center gap-2">
                    <Mail className="w-4 h-4" />{t('auth.email')}
                  </label>
                  <Input {...register('email')} type="email" />
                  {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 flex items-center gap-2">
                      <Phone className="w-4 h-4" />{t('profile.fields.phone')}
                    </label>
                    <Input {...register('phone')} type="tel" />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 flex items-center gap-2">
                      <MapPin className="w-4 h-4" />{t('profile.fields.office')}
                    </label>
                    <Input {...register('office')} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />{t('profile.fields.researchAreas')}
                  </label>
                  <Input {...register('researchAreas')} placeholder={t('profile.fields.researchAreasHint')} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">{t('profile.fields.publications')}</label>
                  <textarea
                    {...register('publications')}
                    rows={3}
                    className={inputClass.replace('h-10', 'min-h-[80px]')}
                  />
                </div>
              </div>

              {/* ── Academic Information ── */}
              <div>
                <h3 className="text-base font-semibold mb-3 pb-1 border-b">{t('profile.sections.academicInfo')}</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />{t('profile.fields.academicDegree')}
                      </label>
                      <Input {...register('academicDegree')} placeholder={t('profile.fields.academicDegreePlaceholder')} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">{t('profile.fields.academicTitle')}</label>
                      <Input {...register('academicTitle')} placeholder={t('profile.fields.academicTitlePlaceholder')} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />{t('profile.fields.position')}
                      </label>
                      <Input {...register('position')} placeholder={t('profile.fields.positionPlaceholder')} />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1 block">{t('profile.fields.employmentRate')}</label>
                      <Input {...register('employmentRate')} type="number" step="0.25" min="0.1" max="2.0" placeholder="1.0" />
                      {errors.employmentRate && <p className="text-xs text-destructive mt-1">{errors.employmentRate.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('profile.fields.englishLevel')}</label>
                    <select {...register('englishLevel')} className={inputClass}>
                      {ENGLISH_LEVELS.map(lvl => (
                        <option key={lvl} value={lvl}>
                          {t(`profile.englishLevels.${lvl.toLowerCase()}`)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* ── Online Profiles ── */}
              <div>
                <h3 className="text-base font-semibold mb-3 pb-1 border-b">{t('profile.sections.onlineProfiles')}</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('profile.fields.scopusAuthorId')}</label>
                    <div className="flex gap-2">
                      <Input {...register('scopusAuthorId')} placeholder="e.g. 57212345678" className="flex-1" />
                      {scopusId && (
                        <a
                          href={`https://www.scopus.com/authid/detail.uri?authorId=${scopusId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button type="button" variant="outline" size="icon">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('profile.fields.orcid')}</label>
                    <div className="flex gap-2">
                      <Input {...register('orcid')} placeholder="0000-0000-0000-0000" className="flex-1" />
                      {orcidVal && (
                        <a href={`https://orcid.org/${orcidVal}`} target="_blank" rel="noopener noreferrer">
                          <Button type="button" variant="outline" size="icon">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                    {errors.orcid && <p className="text-xs text-destructive mt-1">{errors.orcid.message}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">{t('profile.fields.googleScholar')}</label>
                    <div className="flex gap-2">
                      <Input {...register('googleScholarUrl')} placeholder="https://scholar.google.com/..." className="flex-1" />
                      {gsUrl && (
                        <a href={gsUrl} target="_blank" rel="noopener noreferrer">
                          <Button type="button" variant="outline" size="icon">
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                    {errors.googleScholarUrl && <p className="text-xs text-destructive mt-1">{errors.googleScholarUrl.message}</p>}
                  </div>
                </div>
              </div>

              <Button type="submit" size="lg" disabled={updateMutation.isPending} className="w-full">
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? t('common.loading') : t('common.save')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Academic Activities (read-only preview) ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="w-4 h-4 text-muted-foreground" />
            {t('profile.sections.academicActivities')}
          </CardTitle>
          <CardDescription>{t('profile.sections.academicActivitiesDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {activityCards.map((card, idx) => (
              <motion.div
                key={card.key}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: 0.12 + idx * 0.04 }}
                className="border border-border rounded-lg p-4 space-y-3 hover:border-muted-foreground/30 hover:shadow-sm transition-all bg-card flex flex-col"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{card.label}</p>
                  <span className="text-2xl font-bold tabular-nums text-foreground">{card.count}</span>
                </div>
                <div className="flex-1 min-h-[2.5rem]">
                  {card.preview.length > 0 ? (
                    <ul className="space-y-1">
                      {card.preview.map((line, i) => (
                        <li key={i} className="text-xs text-muted-foreground truncate" title={line}>{line}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">{t('kkk.emptyStates.generic')}</p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full text-xs"
                  onClick={() => navigate('/kkk')}
                >
                  {t('profile.manageInKkk')}
                </Button>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* ── Public Profile ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.13 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="w-4 h-4 text-muted-foreground" />
            {t('profile.publicProfile.section')}
          </CardTitle>
          <CardDescription>{t('profile.publicProfile.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={publicEnabled}
              onCheckedChange={(val) => setPublicEnabled(val)}
            />
            <span className="text-sm">{t('profile.publicProfile.enableLabel')}</span>
          </div>

          {publicEnabled && (
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">{t('profile.publicProfile.customSlug')}</label>
                <Input
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  placeholder={t('profile.publicProfile.slugHelp')}
                  maxLength={50}
                />
                <p className="text-xs text-muted-foreground mt-1">{t('profile.publicProfile.slugHelp')}</p>
              </div>

              {publicProfileStatus?.enabled && publicProfileStatus?.slug && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
                  <Link className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm font-mono flex-1 truncate text-primary">
                    {window.location.origin}/p/{publicProfileStatus.slug}
                  </span>
                  <Button type="button" variant="ghost" size="sm" onClick={handleCopyPublicUrl}>
                    {slugCopied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              )}
            </div>
          )}

          <Button type="button" onClick={handlePublicProfileSave} disabled={slugSaving} size="sm">
            <Save className="w-4 h-4 mr-1.5" />
            {slugSaving ? t('common.loading') : t('common.save')}
          </Button>

          {publicProfileStatus?.enabled && publicProfileStatus?.slug && (
            <div className="flex flex-wrap gap-2 pt-1">
              <a href={`/p/${publicProfileStatus.slug}`} target="_blank" rel="noopener noreferrer">
                <Button type="button" variant="outline" size="sm">
                  <Globe className="w-4 h-4 mr-1.5" />
                  {t('profile.publicProfile.view')}
                </Button>
              </a>
              <a href={`/api/public/profiles/${publicProfileStatus.slug}/qr`} download={`qr-${publicProfileStatus.slug}.png`}>
                <Button type="button" variant="outline" size="sm">
                  <QrCode className="w-4 h-4 mr-1.5" />
                  {t('profile.publicProfile.downloadQr')}
                </Button>
              </a>
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {/* ── Security ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.14 }}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4 text-muted-foreground" />
            {t('profile.security.section')}
          </CardTitle>
          <CardDescription>{t('profile.security.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">{t('profile.security.passwordLabel')}</p>
                <p className="text-xs text-muted-foreground">{t('profile.security.passwordSubtitle')}</p>
              </div>
            </div>
            <ChangePasswordDialog />
          </div>
        </CardContent>
      </Card>
      </motion.div>

      {/* ── AI Summary ── */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="w-4 h-4 text-primary" />
                {t('profile.sections.aiSummary')}
              </CardTitle>
              <CardDescription>{t('profile.sections.aiSummaryDescription')}</CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <ShimmerButton
                onClick={handleGenerateAiSummary}
                disabled={aiGenerating}
                title={t('ai.summary.hint')}
                className="h-9 px-3 text-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {aiGenerating ? t('ai.summary.generating') : t('ai.summary.generate')}
              </ShimmerButton>
              {!aiSummaryEditing ? (
                <Button variant="outline" size="sm" onClick={() => setAiSummaryEditing(true)}>
                  <Pencil className="w-4 h-4 mr-1" />{t('common.edit')}
                </Button>
              ) : (
                <>
                  <Button variant="outline" size="sm" onClick={() => { setAiSummaryEditing(false); setAiSummaryText(userData?.aiSummary || ''); }}>
                    <X className="w-4 h-4 mr-1" />{t('common.cancel')}
                  </Button>
                  <Button size="sm" onClick={() => aiSummaryMutation.mutate(aiSummaryText)} disabled={aiSummaryMutation.isPending}>
                    <Save className="w-4 h-4 mr-1" />{t('ai.summary.save')}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">{t('ai.summary.hint')}</p>
          <textarea
            value={aiSummaryText}
            onChange={e => setAiSummaryText(e.target.value)}
            disabled={!aiSummaryEditing}
            rows={6}
            className={`${inputClass.replace('h-10', 'min-h-[120px]')} w-full resize-none`}
            placeholder={t('profile.fields.aiSummaryPlaceholder')}
          />
        </CardContent>
      </Card>
      </motion.div>
    </div>
  );
};

export default Profile;
