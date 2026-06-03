import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import {
  Users, BookOpen, FileText, Bot, AlertCircle, CheckCircle,
  Plus, ClipboardCheck, GraduationCap, Library, Zap, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import NumberTicker from '../../components/ui/NumberTicker';
import { useAuth } from '../../contexts/AuthContext';
import { dashboardApi } from '../../api/dashboard';
import { cn } from '../../lib/utils';

function robotStatusStyle(status: string) {
  if (status === 'SUCCESS') return 'bg-success/15 text-success border-success/30';
  if (status === 'FAILED') return 'bg-destructive/15 text-destructive border-destructive/30';
  if (status === 'PARTIAL') return 'bg-warning/15 text-warning border-warning/30';
  if (status === 'RUNNING') return 'bg-primary/15 text-primary border-primary/30';
  return 'bg-muted text-muted-foreground border-border';
}

function greetingKey(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

const AdminDashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const locale = i18n.language === 'ru' ? ru : enUS;

  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: dashboardApi.getAdminDashboard,
    staleTime: 60_000,
  });

  const greeting = t(`dashboard.greeting.${greetingKey()}`);
  const pendingTotal = (dash?.pendingPublications ?? 0) + (dash?.pendingReports ?? 0);
  const kkkData = dash?.kkkReadinessByTeacher ?? [];
  const kkkIncomplete = kkkData.filter(k => k.completionPercentage < 80).length;

  type AlertSeverity = 'high' | 'medium' | 'low';
  interface AlertItem {
    icon: React.ElementType;
    label: string;
    count: number;
    severity: AlertSeverity;
    path?: string;
  }
  const alerts: AlertItem[] = ([
    { icon: AlertCircle, label: t('adminDashboard.alerts.incompleteProfiles'), count: dash?.incompleteProfiles ?? 0, severity: 'medium' as AlertSeverity, path: '/teachers' },
    { icon: BookOpen, label: t('adminDashboard.alerts.pendingPublications'), count: dash?.pendingPublications ?? 0, severity: 'medium' as AlertSeverity, path: '/admin/publications-review' },
    { icon: FileText, label: t('adminDashboard.alerts.pendingReports'), count: dash?.pendingReports ?? 0, severity: 'high' as AlertSeverity, path: '/documents' },
    { icon: GraduationCap, label: t('adminDashboard.alerts.kkkIncomplete'), count: kkkIncomplete, severity: 'low' as AlertSeverity, path: '/admin/kkk-submissions' },
  ] as AlertItem[]).filter(a => a.count > 0).slice(0, 3);

  const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; text: string }> = {
    high: { bg: 'bg-destructive/10 border-l-destructive', text: 'text-destructive' },
    medium: { bg: 'bg-warning/10 border-l-warning', text: 'text-warning' },
    low: { bg: 'bg-primary/5 border-l-primary', text: 'text-primary' },
  };

  const quickActions = [
    { label: t('adminDashboard.quickActions.publicationsReview'), icon: ClipboardCheck, path: '/admin/publications-review' },
    { label: t('adminDashboard.quickActions.kkkSubmissions'), icon: GraduationCap, path: '/admin/kkk-submissions' },
    { label: t('adminDashboard.quickActions.teachers'), icon: Users, path: '/teachers' },
    { label: t('adminDashboard.quickActions.templates'), icon: Library, path: '/templates' },
    { label: t('adminDashboard.quickActions.robotRuns'), icon: Bot, path: '/admin/robot-runs' },
    { label: t('adminDashboard.quickActions.statistics'), icon: Zap, path: '/admin/statistics' },
  ];

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <Skeleton className="h-9 w-72 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 mb-4" />
                <Skeleton className="h-10 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-3xl font-bold tracking-tight">
          {greeting}, {user?.username}
        </h1>
        <p className="text-sm text-muted-foreground mt-1.5">
          {t('adminDashboard.subtitle')} · {format(new Date(), 'EEEE, d MMMM yyyy', { locale })}
        </p>
      </motion.div>

      {/* Row 1 — 4 Key stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <AdminStat
          delay={0}
          title={t('adminDashboard.stats.totalTeachers')}
          value={dash?.totalTeachers ?? 0}
          subtitle={`${t('adminDashboard.stats.incompleteProfiles')}: ${dash?.incompleteProfiles ?? 0}`}
          icon={<Users className="w-5 h-5" />}
          iconBg="bg-success/10 text-success"
        />
        <AdminStat
          delay={0.05}
          title={t('adminDashboard.stats.pendingPublications')}
          value={dash?.pendingPublications ?? 0}
          subtitle={`${t('adminDashboard.stats.totalPublications')}: ${dash?.totalPublications ?? 0}`}
          icon={<BookOpen className="w-5 h-5" />}
          iconBg="bg-blue-500/10 text-blue-500"
        />
        <AdminStat
          delay={0.1}
          title={t('adminDashboard.stats.pendingReports')}
          value={dash?.pendingReports ?? 0}
          subtitle={`${t('adminDashboard.stats.totalReports')}: ${dash?.totalReports ?? 0}`}
          icon={<FileText className="w-5 h-5" />}
          iconBg="bg-purple-500/10 text-purple-500"
        />
        <AdminStat
          delay={0.15}
          title={t('adminDashboard.stats.generatedDocsMonth')}
          value={dash?.generatedDocsThisMonth ?? 0}
          subtitle={
            dash?.lastRobotRunStatus && dash.lastRobotRunStatus !== 'NONE' ? (
              <span className="inline-flex items-center gap-1">
                {t('adminDashboard.stats.robot')}:
                <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium border', robotStatusStyle(dash.lastRobotRunStatus))}>
                  {dash.lastRobotRunStatus}
                </span>
              </span>
            ) : `${t('adminDashboard.stats.robot')}: —`
          }
          icon={<Bot className="w-5 h-5" />}
          iconBg="bg-primary/10 text-primary"
        />
      </div>

      {/* Row 2 — Robot run + Alerts */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.3 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Bot className="w-4 h-4 text-muted-foreground" />
                {t('adminDashboard.latestRobot.title')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{t('adminDashboard.latestRobot.description')}</p>
            </CardHeader>
            <CardContent>
              {dash?.lastRobotRun ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className={cn('px-2 py-1 rounded-md border text-xs font-medium', robotStatusStyle(dash.lastRobotRun.status))}>
                      {dash.lastRobotRun.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {dash.lastRobotRun.startedAt
                        ? format(new Date(dash.lastRobotRun.startedAt), 'd MMM, HH:mm', { locale })
                        : '—'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <RobotStat label={t('adminDashboard.latestRobot.processed')} value={dash.lastRobotRun.processedCount} />
                    <RobotStat label={t('adminDashboard.latestRobot.generated')} value={dash.lastRobotRun.generatedCount} accent="text-success" />
                    <RobotStat label={t('adminDashboard.latestRobot.errors')} value={dash.lastRobotRun.errorCount} accent="text-destructive" />
                  </div>
                  <Button variant="outline" size="sm" className="gap-1" onClick={() => navigate('/admin/robot-runs')}>
                    {t('adminDashboard.latestRobot.viewAll')}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('adminDashboard.latestRobot.none')}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, duration: 0.3 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <AlertCircle className="w-4 h-4 text-warning" />
                {t('adminDashboard.alerts.title')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{t('adminDashboard.alerts.description')}</p>
            </CardHeader>
            <CardContent>
              {alerts.length > 0 ? (
                <div className="space-y-2">
                  {alerts.map((alert, i) => {
                    const Icon = alert.icon;
                    const styles = SEVERITY_STYLES[alert.severity];
                    return (
                      <button
                        key={i}
                        onClick={() => alert.path && navigate(alert.path)}
                        className={cn(
                          'flex items-center justify-between w-full p-3 rounded-md border-l-2 text-left transition-all hover:translate-x-0.5',
                          styles.bg,
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={cn('h-4 w-4', styles.text)} />
                          <span className="text-sm text-foreground">{alert.label}</span>
                        </div>
                        <span className={cn('text-sm font-bold tabular-nums', styles.text)}>{alert.count}</span>
                      </button>
                    );
                  })}
                  {pendingTotal === 0 && (dash?.incompleteProfiles ?? 0) === 0 && (
                    <div className="flex items-center gap-2 text-success p-3">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">{t('adminDashboard.alerts.allClear')}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-success p-3">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">{t('adminDashboard.alerts.allClear')}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Row 3 — Top teachers + Quick actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.3 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Users className="w-4 h-4 text-muted-foreground" />
                {t('adminDashboard.topTeachers.title')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{t('adminDashboard.topTeachers.description')}</p>
            </CardHeader>
            <CardContent className="pt-0">
              {dash?.topActiveTeachers && dash.topActiveTeachers.length > 0 ? (
                <div className="space-y-1">
                  {dash.topActiveTeachers.map((teacher, i) => (
                    <div
                      key={teacher.userId}
                      className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-accent transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-muted-foreground tabular-nums w-5">
                          {i + 1}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {teacher.username?.[0]?.toUpperCase()}
                        </div>
                        <span className="text-sm font-medium">{teacher.username}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] tabular-nums">
                        {teacher.activityCount} {t('adminDashboard.topTeachers.actions')}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('adminDashboard.topTeachers.empty')}</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35, duration: 0.3 }}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Plus className="w-4 h-4 text-muted-foreground" />
                {t('adminDashboard.quickActions.title')}
              </CardTitle>
              <p className="text-xs text-muted-foreground">{t('adminDashboard.quickActions.description')}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.path}
                      onClick={() => navigate(action.path)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-md border border-border bg-card hover:bg-accent hover:border-muted-foreground/30 transition-all text-left"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="text-xs font-medium">{action.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

interface AdminStatProps {
  title: string;
  value: number;
  subtitle: React.ReactNode;
  icon: React.ReactNode;
  iconBg: string;
  delay?: number;
}

const AdminStat: React.FC<AdminStatProps> = ({ title, value, subtitle, icon, iconBg, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay }}>
    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
          <div className={cn('w-8 h-8 rounded-md flex items-center justify-center', iconBg)}>{icon}</div>
        </div>
        <div className="text-3xl font-bold tabular-nums">
          <NumberTicker value={value} />
        </div>
        <div className="text-xs text-muted-foreground mt-2">{subtitle}</div>
      </CardContent>
    </Card>
  </motion.div>
);

const RobotStat: React.FC<{ label: string; value: number; accent?: string }> = ({ label, value, accent }) => (
  <div className="text-center p-3 bg-muted/40 rounded-md">
    <div className={cn('font-bold text-xl tabular-nums', accent)}>{value}</div>
    <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{label}</div>
  </div>
);

export default AdminDashboard;
