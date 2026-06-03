import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar, Bell, AlertCircle, FileText, GraduationCap, Link, Sparkles,
} from 'lucide-react';
import { dashboardApi } from '../../api/dashboard';
import { TodayFocusPriorityAction } from '../../types';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  Calendar: <Calendar className="h-3.5 w-3.5" />,
  Bell: <Bell className="h-3.5 w-3.5" />,
  AlertCircle: <AlertCircle className="h-3.5 w-3.5" />,
  FileText: <FileText className="h-3.5 w-3.5" />,
  GraduationCap: <GraduationCap className="h-3.5 w-3.5" />,
  Link: <Link className="h-3.5 w-3.5" />,
};

const URGENCY_COLORS: Record<string, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/15',
  medium: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/15',
  low: 'bg-muted text-muted-foreground border-border hover:bg-accent',
};

function TodayFocusSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 space-y-3">
          <div className="h-7 w-48 bg-muted rounded" />
          <div className="h-4 w-full bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="flex gap-2 mt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-7 w-28 bg-muted rounded-full" />
            ))}
          </div>
        </div>
        <div className="md:w-48 space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 w-full bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TodayFocusCard() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const locale = i18n.language === 'ru' ? 'ru' : 'en';

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-today-focus', locale],
    queryFn: () => dashboardApi.getTodayFocus(locale),
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
  });

  if (isLoading) return <TodayFocusSkeleton />;
  if (!data) return null;

  const hasIssues = data.deadlinesToday > 0 || data.returnedReports > 0 || data.unreadNotifications > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-6 mb-6"
    >
      <div className="flex flex-col md:flex-row gap-6">
        {/* Left — greeting + AI message + actions */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold tracking-tight">
              {data.greeting} 👋
            </h2>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            {data.aiMessage}
            <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] font-medium text-primary/60 align-middle">
              <Sparkles className="h-3 w-3" />
              {t('todayFocus.aiBadge')}
            </span>
          </p>

          {/* Priority action chips */}
          <div className="flex flex-wrap gap-2">
            {data.priorityActions.map((action: TodayFocusPriorityAction, i: number) => (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${URGENCY_COLORS[action.urgency] || URGENCY_COLORS.low}`}
              >
                {ACTION_ICONS[action.icon]}
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right — mini stats */}
        <div className="md:w-52 flex flex-col gap-2 shrink-0">
          <StatChip
            icon={<Calendar className="h-4 w-4" />}
            value={data.deadlinesToday}
            label={t('todayFocus.stats.deadlinesToday')}
            color={data.deadlinesToday > 0 ? 'text-destructive' : 'text-muted-foreground'}
            bg={data.deadlinesToday > 0 ? 'bg-destructive/8' : 'bg-muted/50'}
          />
          <StatChip
            icon={<Bell className="h-4 w-4" />}
            value={data.unreadNotifications}
            label={t('todayFocus.stats.notifications')}
            color={data.unreadNotifications > 0 ? 'text-warning' : 'text-muted-foreground'}
            bg={data.unreadNotifications > 0 ? 'bg-warning/8' : 'bg-muted/50'}
          />
          <StatChip
            icon={<AlertCircle className="h-4 w-4" />}
            value={data.returnedReports}
            label={t('todayFocus.stats.returnedReports')}
            color={data.returnedReports > 0 ? 'text-destructive' : 'text-muted-foreground'}
            bg={data.returnedReports > 0 ? 'bg-destructive/8' : 'bg-muted/50'}
          />
        </div>
      </div>
    </motion.div>
  );
}

function StatChip({
  icon,
  value,
  label,
  color,
  bg,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg ${bg}`}>
      <span className={color}>{icon}</span>
      <div>
        <div className={`text-base font-bold tabular-nums leading-none ${color}`}>{value}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
      </div>
    </div>
  );
}
