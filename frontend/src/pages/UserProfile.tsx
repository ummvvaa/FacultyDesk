import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { usersApi } from '../api/users';
import { recordsApi } from '../api/records';
import { friendsApi } from '../api/friends';
import { educationApi } from '../api/education';
import { workExperienceApi } from '../api/workExperience';
import { qualificationCoursesApi } from '../api/qualificationCourses';
import { awardsApi } from '../api/awards';
import { patentsApi } from '../api/patents';
import { publicationsApi } from '../api/publications';
import { kkkApi } from '../api/kkk';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import {
  UserPlus, Check, MessageSquare, Download, ExternalLink,
  Award, Sparkles, GraduationCap, Briefcase, FlaskConical, BookOpen,
} from 'lucide-react';
import { getInitials } from '../lib/utils';
import { Record as UserRecord, User as UserType, Publication } from '../types';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';

const ENGLISH_LEVEL_LABELS: Record<string, string> = {
  A1: 'A1 – Beginner', A2: 'A2 – Elementary',
  B1: 'B1 – Intermediate', B2: 'B2 – Upper-Intermediate',
  C1: 'C1 – Advanced', C2: 'C2 – Proficiency',
  NATIVE: 'Native', NONE: '—',
};

const UserProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? ru : enUS;
  const queryClient = useQueryClient();

  const userNumberId = userId ? parseInt(userId, 10) : 0;

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user', userNumberId],
    queryFn: () => usersApi.getById(userNumberId),
    enabled: !!userNumberId,
  });

  const { data: userRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ['records', 'user', userNumberId],
    queryFn: () => recordsApi.getByUserId(userNumberId),
    enabled: !!userNumberId,
  });

  const { data: friendshipStatus } = useQuery({
    queryKey: ['friendship', 'status', userNumberId],
    queryFn: () => friendsApi.getFriendshipStatus(userNumberId),
    enabled: !!userNumberId && userNumberId !== currentUser?.id,
  });

  const { data: friendship } = useQuery({
    queryKey: ['friendship', userNumberId],
    queryFn: () => friendsApi.getFriendship(userNumberId),
    enabled: !!userNumberId && userNumberId !== currentUser?.id,
  });

  // Academic Activities
  const { data: educations = [] } = useQuery({
    queryKey: ['education', 'user', userNumberId],
    queryFn: () => educationApi.getByUser(userNumberId),
    enabled: !!userNumberId,
  });
  const { data: workExperiences = [] } = useQuery({
    queryKey: ['work-experience', 'user', userNumberId],
    queryFn: () => workExperienceApi.getByUser(userNumberId),
    enabled: !!userNumberId,
  });
  const { data: qualCourses = [] } = useQuery({
    queryKey: ['qualification-courses', 'user', userNumberId],
    queryFn: () => qualificationCoursesApi.getByUser(userNumberId),
    enabled: !!userNumberId,
  });
  const { data: awards = [] } = useQuery({
    queryKey: ['awards', 'user', userNumberId],
    queryFn: () => awardsApi.getByUser(userNumberId),
    enabled: !!userNumberId,
  });
  const { data: patents = [] } = useQuery({
    queryKey: ['patents', 'user', userNumberId],
    queryFn: () => patentsApi.getByUser(userNumberId),
    enabled: !!userNumberId,
  });

  const { data: allPublications = [] } = useQuery({
    queryKey: ['publications', 'user', userNumberId],
    queryFn: () => publicationsApi.getByUser(userNumberId),
    enabled: !!userNumberId,
  });
  const verifiedPublications: Publication[] = allPublications.filter((p: Publication) => p.status === 'VERIFIED');

  const { data: kkkCompletion } = useQuery({
    queryKey: ['kkk', 'completion', userNumberId],
    queryFn: () => kkkApi.getUserCompletion(userNumberId),
    enabled: !!userNumberId,
  });

  const sendRequestMutation = useMutation({
    mutationFn: () => friendsApi.sendRequest(userNumberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendship', 'status', userNumberId] });
      queryClient.invalidateQueries({ queryKey: ['friendship', userNumberId] });
      toast({ title: t('common.success'), description: 'Заявка отправлена', variant: 'success' });
    },
    onError: (error: any) => {
      toast({ title: t('common.error'), description: error.response?.data?.message || 'Не удалось отправить заявку', variant: 'destructive' });
    },
  });

  const acceptRequestMutation = useMutation({
    mutationFn: (friendshipId: number) => friendsApi.acceptRequest(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendship', 'status', userNumberId] });
      queryClient.invalidateQueries({ queryKey: ['friendship', userNumberId] });
      toast({ title: t('common.success'), description: 'Заявка принята', variant: 'success' });
    },
  });

  const handleDownload = async (filename: string) => {
    try {
      const blob = await recordsApi.downloadPdf(filename);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: t('common.error'), description: 'Не удалось скачать файл', variant: 'destructive' });
    }
  };

  const getStatusBadge = (status?: string) => {
    const map: Record<string, string> = {
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      RETURNED: 'bg-yellow-100 text-yellow-800',
    };
    const label: Record<string, string> = {
      APPROVED: 'Принят', REJECTED: 'Отклонён', RETURNED: 'На исправлении',
    };
    const cls = map[status || ''] || 'bg-gray-100 text-gray-800';
    return <span className={`px-2 py-1 rounded text-xs ${cls}`}>{label[status || ''] || 'На проверке'}</span>;
  };

  if (userLoading) return <div className="text-center py-8">{t('common.loading')}</div>;
  if (!user) return <div className="text-center py-8">Пользователь не найден</div>;

  const isOwnProfile = currentUser?.id === user.id;

  const activityCards = [
    {
      key: 'education',
      label: t('kkk.tabs.education'),
      icon: <GraduationCap className="w-4 h-4" />,
      count: educations.length,
      preview: educations.slice(0, 2).map((e: any) =>
        [e.degree, e.institution, e.year].filter(Boolean).join(' · ')
      ),
    },
    {
      key: 'workExperience',
      label: t('kkk.tabs.workExperience'),
      icon: <Briefcase className="w-4 h-4" />,
      count: workExperiences.length,
      preview: workExperiences.slice(0, 2).map((w: any) =>
        [w.position, w.organization].filter(Boolean).join(' · ')
      ),
    },
    {
      key: 'qualificationCourses',
      label: t('kkk.tabs.qualificationCourses'),
      icon: <FlaskConical className="w-4 h-4" />,
      count: qualCourses.length,
      preview: qualCourses.slice(0, 2).map((q: any) => q.name || '').filter(Boolean),
    },
    {
      key: 'awards',
      label: t('kkk.tabs.awards'),
      icon: <Award className="w-4 h-4" />,
      count: awards.length,
      preview: awards.slice(0, 2).map((a: any) => a.name || '').filter(Boolean),
    },
    {
      key: 'patents',
      label: t('kkk.tabs.patents'),
      icon: <FlaskConical className="w-4 h-4" />,
      count: patents.length,
      preview: patents.slice(0, 2).map((p: any) => p.title || '').filter(Boolean),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-primary text-2xl font-semibold">
                  {getInitials(undefined, undefined, user.username)}
                </span>
              </div>
              <div>
                <h1 className="text-3xl font-bold">{user.username}</h1>
                {user.email && <p className="text-muted-foreground">{user.email}</p>}
                {(user.position || user.academicTitle) && (
                  <p className="text-muted-foreground">
                    {[user.academicTitle, user.position].filter(Boolean).join(' · ')}
                  </p>
                )}
                {user.academicDegree && <p className="text-muted-foreground">{user.academicDegree}</p>}
                {user.englishLevel && user.englishLevel !== 'NONE' && (
                  <p className="text-sm text-muted-foreground">
                    {t('profile.fields.englishLevel')}: {ENGLISH_LEVEL_LABELS[user.englishLevel] || user.englishLevel}
                  </p>
                )}
                {user.employmentRate != null && (
                  <p className="text-sm text-muted-foreground">
                    {t('profile.fields.employmentRate')}: {user.employmentRate}
                  </p>
                )}
              </div>
            </div>
            {!isOwnProfile && (
              <div className="flex gap-2 flex-wrap">
                {friendshipStatus === 'NONE' && (
                  <Button onClick={() => sendRequestMutation.mutate()} disabled={sendRequestMutation.isPending}>
                    <UserPlus className="w-4 h-4 mr-2" />Подписаться
                  </Button>
                )}
                {friendshipStatus === 'PENDING' && (
                  <Button variant="outline" disabled>
                    <Check className="w-4 h-4 mr-2" />Заявка отправлена
                  </Button>
                )}
                {friendshipStatus === 'PENDING_INCOMING' && friendship && (
                  <Button onClick={() => acceptRequestMutation.mutate(friendship.id)} disabled={acceptRequestMutation.isPending}>
                    <Check className="w-4 h-4 mr-2" />Принять заявку
                  </Button>
                )}
                {friendshipStatus === 'ACCEPTED' && (
                  <Button variant="outline" disabled>
                    <Check className="w-4 h-4 mr-2" />В друзьях
                  </Button>
                )}
                <Button variant="outline" onClick={() => navigate(`/messages?userId=${userNumberId}`)}>
                  <MessageSquare className="w-4 h-4 mr-2" />Написать
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── About (AI Summary) ── */}
      {user.aiSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              {t('userProfile.about')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{user.aiSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* ── Online Profiles ── */}
      {(user.scopusAuthorId || user.orcid || user.googleScholarUrl) && (
        <Card>
          <CardHeader>
            <CardTitle>{t('profile.sections.onlineProfiles')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {user.scopusAuthorId && (
              <a
                href={`https://www.scopus.com/authid/detail.uri?authorId=${user.scopusAuthorId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Scopus ({user.scopusAuthorId})
                </Button>
              </a>
            )}
            {user.orcid && (
              <a href={`https://orcid.org/${user.orcid}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  ORCID ({user.orcid})
                </Button>
              </a>
            )}
            {user.googleScholarUrl && (
              <a href={user.googleScholarUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Google Scholar
                </Button>
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Academic Activities ── */}
      {(educations.length > 0 || workExperiences.length > 0 || qualCourses.length > 0 || awards.length > 0 || patents.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              {t('profile.sections.academicActivities')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {activityCards.map(card => (
                <div key={card.key} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-sm font-semibold">
                      {card.icon}{card.label}
                    </div>
                    <span className="text-lg font-bold text-primary">{card.count}</span>
                  </div>
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
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Publications ── */}
      {verifiedPublications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Публикации
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {verifiedPublications.map((p: Publication) => (
                <li key={p.id} className="border-l-2 border-primary pl-3">
                  <div className="font-medium text-sm leading-snug">{p.title}</div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    {p.journalName && <span className="text-xs text-muted-foreground">{p.journalName}</span>}
                    {p.publicationYear && <span className="text-xs text-muted-foreground">· {p.publicationYear}</span>}
                    {p.databaseType && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.databaseType}</Badge>}
                    {p.quartile && p.quartile !== 'NONE' && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{p.quartile}</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* ── KKK Readiness ── */}
      {kkkCompletion != null && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Готовность к ККК
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={kkkCompletion.completionPercentage} className="flex-1" />
              <span className="font-bold tabular-nums w-12 text-right">{kkkCompletion.completionPercentage}%</span>
              {kkkCompletion.status && (
                <Badge variant="outline" className="text-xs">{kkkCompletion.status}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Records ── */}
      <Card>
        <CardHeader>
          <CardTitle>Отчёты пользователя</CardTitle>
        </CardHeader>
        <CardContent>
          {recordsLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : userRecords && userRecords.length > 0 ? (
            <div className="space-y-4">
              {userRecords.map((record: UserRecord) => (
                <motion.div
                  key={record.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{record.title}</h3>
                        {getStatusBadge(record.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{record.description}</p>
                      {record.category && (
                        <p className="text-xs text-muted-foreground mb-2">Категория: {record.category.name}</p>
                      )}
                      {record.createdAt && (
                        <p className="text-xs text-muted-foreground">
                          Создан: {format(new Date(record.createdAt), 'PP', { locale })}
                        </p>
                      )}
                      {record.comments && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-xs font-medium text-yellow-800">Комментарий:</p>
                          <p className="text-xs text-yellow-700">{record.comments}</p>
                        </div>
                      )}
                    </div>
                    {record.pdf && (
                      <Button variant="outline" size="icon" onClick={() => handleDownload(record.pdf!)} title="Скачать">
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              У пользователя пока нет отчётов
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserProfile;
