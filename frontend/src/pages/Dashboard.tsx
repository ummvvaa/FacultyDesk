import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import {
  FileText, FolderOpen, TrendingUp, BookOpen, Bot, Bell, Clock,
  GraduationCap, ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import NumberTicker from '../components/ui/NumberTicker';
import { Skeleton } from '../components/ui/skeleton';
import { dashboardApi } from '../api/dashboard';
import { cn } from '../lib/utils';
import TodayFocusCard from '../components/dashboard/TodayFocusCard';
import PinnedItemsWidget from '../components/dashboard/PinnedItemsWidget';

function kkkColor(pct: number) {
  if (pct >= 80) return 'hsl(var(--success))';
  if (pct >= 50) return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

function deadlineUrgency(dateStr: string): 'overdue' | 'critical' | 'warning' | 'normal' {
  const diff = (new Date(dateStr).getTime() - Date.now()) / 86400000;
  if (diff < 0) return 'overdue';
  if (diff < 3) return 'critical';
  if (diff < 7) return 'warning';
  return 'normal';
}

const URGENCY_STYLES: Record<string, string> = {
  overdue: 'border-l-destructive bg-destructive/5',
  critical: 'border-l-destructive bg-destructive/5',
  warning: 'border-l-warning bg-warning/5',
  normal: 'border-l-success bg-success/5',
};

function greetingKey(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

const Dashboard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const locale = i18n.language === 'ru' ? ru : enUS;

  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard', 'teacher'],
    queryFn: dashboardApi.getTeacherDashboard,
    staleTime: 60_000,
  });

  const pubsByYearData = dash
    ? Object.entries(dash.publicationsByYear).map(([year, count]) => ({ year, count }))
    : [];
  const reportsByMonthData = dash
    ? Object.entries(dash.reportsByMonth).map(([month, count]) => ({ month, count }))
    : [];

  const totalReports = dash
    ? Object.values(dash.reportsByStatus).reduce((a, b) => a + b, 0)
    : 0;

  const greeting = t(`dashboard.greeting.${greetingKey()}`);

  return (
    <div className="space-y-8">
      {/* Today's Focus — AI-generated daily briefing for teachers */}
      {user?.role === 'ROLE_TEACHER' && <TodayFocusCard />}

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
          {format(new Date(), 'EEEE, d MMMM yyyy', { locale })}
        </p>
      </motion.div>

      {/* Row 1 — 4 Stat cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          delay={0}
          title={t('dashboard.kkkReadiness')}
          icon={<GraduationCap className="w-5 h-5" />}
          iconBg="bg-primary/10 text-primary"
          isLoading={isLoading}
        >
          <div className="flex items-end gap-3">
            <div className="text-3xl font-bold tabular-nums" style={{ color: kkkColor(dash?.kkkCompletion ?? 0) }}>
              <NumberTicker value={dash?.kkkCompletion ?? 0} />
              <span className="text-xl">%</span>
            </div>
          </div>
          <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${dash?.kkkCompletion ?? 0}%`,
                backgroundColor: kkkColor(dash?.kkkCompletion ?? 0),
              }}
            />
          </div>
        </StatCard>

        <StatCard
          delay={0.05}
          title={t('dashboard.myPublications')}
          icon={<BookOpen className="w-5 h-5" />}
          iconBg="bg-blue-500/10 text-blue-500"
          isLoading={isLoading}
        >
          <div className="text-3xl font-bold tabular-nums">
            <NumberTicker value={dash?.publicationsTotal ?? 0} />
          </div>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              Scopus {dash?.publicationsScopus ?? 0}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              KOKSON {dash?.publicationsKokson ?? 0}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {t('dashboard.other')} {dash?.publicationsOther ?? 0}
            </Badge>
          </div>
        </StatCard>

        <StatCard
          delay={0.1}
          title={t('dashboard.myGenDocs')}
          icon={<Bot className="w-5 h-5" />}
          iconBg="bg-purple-500/10 text-purple-500"
          isLoading={isLoading}
        >
          <div className="text-3xl font-bold tabular-nums">
            <NumberTicker value={dash?.generatedDocsCount ?? 0} />
          </div>
          <div className="text-xs text-muted-foreground mt-3 truncate">
            {dash?.lastGeneratedDocDate
              ? `${t('dashboard.lastUpload')}: ${format(new Date(dash.lastGeneratedDocDate), 'd MMM', { locale })}`
              : t('dashboard.noUploadsYet')}
          </div>
        </StatCard>

        <StatCard
          delay={0.15}
          title={t('dashboard.myReports')}
          icon={<FileText className="w-5 h-5" />}
          iconBg="bg-orange-500/10 text-orange-500"
          isLoading={isLoading}
        >
          <div className="text-3xl font-bold tabular-nums">
            <NumberTicker value={totalReports} />
          </div>
          <div className="flex gap-1.5 mt-3 flex-wrap">
            {dash && Object.entries(dash.reportsByStatus).slice(0, 3).map(([status, count]) => (
              <Badge key={status} variant="outline" className="text-[10px] px-1.5 py-0">
                {status} {count}
              </Badge>
            ))}
          </div>
        </StatCard>
      </div>

      {/* Row 2 — 2 charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ChartCard
          delay={0.2}
          title={t('dashboard.pubsByYear')}
          description={t('dashboard.last5Years')}
          icon={<TrendingUp className="w-4 h-4" />}
          isEmpty={pubsByYearData.length === 0}
          emptyText={t('dashboard.noData')}
        >
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={pubsByYearData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                cursor={{ fill: 'hsl(var(--accent) / 0.4)' }}
              />
              <Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          delay={0.25}
          title={t('dashboard.reportsActivity')}
          description={t('dashboard.last6Months')}
          icon={<FileText className="w-4 h-4" />}
          isEmpty={reportsByMonthData.length === 0}
          emptyText={t('dashboard.noData')}
        >
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={reportsByMonthData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3 — 3 list widgets */}
      <div className="grid gap-4 md:grid-cols-3">
        <ListCard
          delay={0.3}
          title={t('dashboard.upcomingDeadlines')}
          icon={<Clock className="w-4 h-4" />}
          linkTo="/deadlines"
        >
          {dash?.upcomingDeadlines && dash.upcomingDeadlines.length > 0 ? (
            dash.upcomingDeadlines.slice(0, 3).map(d => (
              <div
                key={d.id}
                className={cn(
                  'px-3 py-2.5 rounded-md text-sm border-l-2 transition-colors',
                  URGENCY_STYLES[deadlineUrgency(d.deadlineDate)],
                )}
              >
                <div className="font-medium text-foreground truncate">{d.title}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {format(new Date(d.deadlineDate), 'd MMM yyyy', { locale })}
                </div>
              </div>
            ))
          ) : (
            <EmptyListMsg icon={<Clock className="w-5 h-5" />} text={t('dashboard.noDeadlines')} />
          )}
        </ListCard>

        <ListCard
          delay={0.35}
          title={t('dashboard.recentNotifications')}
          icon={<Bell className="w-4 h-4" />}
          linkTo="/notifications"
        >
          {dash?.recentNotifications && dash.recentNotifications.length > 0 ? (
            dash.recentNotifications.slice(0, 3).map(n => (
              <div
                key={n.id}
                className={cn(
                  'px-3 py-2.5 rounded-md text-sm transition-colors',
                  n.read ? 'bg-muted/40' : 'bg-primary/5 border-l-2 border-l-primary',
                )}
              >
                <div className="font-medium text-foreground truncate">{n.title}</div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">{n.message}</div>
              </div>
            ))
          ) : (
            <EmptyListMsg icon={<Bell className="w-5 h-5" />} text={t('dashboard.noNotifications')} />
          )}
        </ListCard>

        <ListCard
          delay={0.4}
          title={t('dashboard.templateUpdates')}
          icon={<FolderOpen className="w-4 h-4" />}
          linkTo="/templates-library"
        >
          {dash?.templateUpdates && dash.templateUpdates.length > 0 ? (
            dash.templateUpdates.slice(0, 3).map(tpl => (
              <div key={tpl.id} className="px-3 py-2.5 rounded-md bg-muted/40 text-sm">
                <div className="font-medium text-foreground truncate">{tpl.name}</div>
                {tpl.category && (
                  <div className="text-xs text-muted-foreground mt-0.5">{tpl.category}</div>
                )}
              </div>
            ))
          ) : (
            <EmptyListMsg icon={<FolderOpen className="w-5 h-5" />} text={t('dashboard.noTemplateUpdates')} />
          )}
        </ListCard>
      </div>

      {/* Pinned Items widget */}
      {user?.role === 'ROLE_TEACHER' && (
        <div className="max-w-sm">
          <PinnedItemsWidget />
        </div>
      )}
    </div>
  );
};

// ============== Helpers ==============

interface StatCardProps {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  delay?: number;
  isLoading?: boolean;
  children: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, icon, iconBg, delay = 0, isLoading, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
  >
    <Card className="hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
          <div className={cn('w-8 h-8 rounded-md flex items-center justify-center', iconBg)}>{icon}</div>
        </div>
        {isLoading ? <Skeleton className="h-12 w-24" /> : children}
      </CardContent>
    </Card>
  </motion.div>
);

interface ChartCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  delay?: number;
  isEmpty: boolean;
  emptyText: string;
  children: React.ReactNode;
}

const ChartCard: React.FC<ChartCardProps> = ({ title, description, icon, delay = 0, isEmpty, emptyText, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
  >
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="pb-4">
        {isEmpty ? (
          <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
            {emptyText}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  </motion.div>
);

interface ListCardProps {
  title: string;
  icon: React.ReactNode;
  delay?: number;
  linkTo: string;
  children: React.ReactNode;
}

const ListCard: React.FC<ListCardProps> = ({ title, icon, delay = 0, linkTo, children }) => {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <span className="text-muted-foreground">{icon}</span>
              {title}
            </CardTitle>
            <Link
              to={linkTo}
              className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-0.5"
            >
              {t('common.viewAll', 'View all')}
              <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">{children}</CardContent>
      </Card>
    </motion.div>
  );
};

const EmptyListMsg: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="text-center py-6">
    <div className="w-10 h-10 rounded-full bg-muted text-muted-foreground inline-flex items-center justify-center mb-2">
      {icon}
    </div>
    <p className="text-xs text-muted-foreground">{text}</p>
  </div>
);

export default Dashboard;
