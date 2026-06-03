import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Bell, Check, Trash2, GraduationCap, Clock, FileText, Bot,
  RefreshCw, CheckCircle, XCircle, BookOpen, AlertTriangle,
  MessageSquare, UserPlus, Filter, ChevronDown
} from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { notificationsApi } from '../api/notifications';
import { useToast } from '../hooks/useToast';
import EmptyState from '../components/EmptyState';
import ListSkeleton from '../components/skeletons/ListSkeleton';
import { useNavigate } from 'react-router-dom';
import { Notification, NotificationType } from '../types';

// ── Icon + color map ────────────────────────────────────────────────────────

type IconMeta = { icon: React.ReactNode; bg: string; border: string };

const TYPE_META: Record<string, IconMeta> = {
  // KKK
  KKK_COLLECTION_STARTED:       { icon: <GraduationCap className="w-5 h-5 text-purple-500" />, bg: 'bg-purple-50 dark:bg-purple-950', border: 'border-purple-200 dark:border-purple-800' },
  KKK_STATUS_CHANGED:           { icon: <GraduationCap className="w-5 h-5 text-purple-500" />, bg: 'bg-purple-50 dark:bg-purple-950', border: 'border-purple-200 dark:border-purple-800' },
  // Deadlines
  QUARTERLY_DEADLINE:           { icon: <Clock className="w-5 h-5 text-orange-500" />, bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-200 dark:border-orange-800' },
  SEMESTER_DEADLINE:            { icon: <Clock className="w-5 h-5 text-orange-500" />, bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-200 dark:border-orange-800' },
  DEADLINE_REMINDER:            { icon: <Clock className="w-5 h-5 text-orange-500" />, bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-200 dark:border-orange-800' },
  DEADLINE_APPROACHING_WEEK:    { icon: <Clock className="w-5 h-5 text-orange-400" />, bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-200 dark:border-orange-800' },
  DEADLINE_APPROACHING_3DAYS:   { icon: <Clock className="w-5 h-5 text-orange-600" />, bg: 'bg-orange-50 dark:bg-orange-950', border: 'border-orange-300 dark:border-orange-700' },
  DEADLINE_TOMORROW:            { icon: <AlertTriangle className="w-5 h-5 text-orange-700" />, bg: 'bg-orange-100 dark:bg-orange-900', border: 'border-orange-400 dark:border-orange-600' },
  DEADLINE_OVERDUE:             { icon: <AlertTriangle className="w-5 h-5 text-red-600" />, bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-300 dark:border-red-700' },
  // Templates
  TEMPLATE_NEW:                 { icon: <FileText className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800' },
  TEMPLATE_UPDATED:             { icon: <FileText className="w-5 h-5 text-blue-400" />, bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800' },
  // Generated docs
  GENERATED_DOCUMENT_UPLOADED:  { icon: <Bot className="w-5 h-5 text-green-500" />, bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-200 dark:border-green-800' },
  // Reports
  REPORT_RETURNED:              { icon: <RefreshCw className="w-5 h-5 text-yellow-500" />, bg: 'bg-yellow-50 dark:bg-yellow-950', border: 'border-yellow-200 dark:border-yellow-800' },
  REPORT_ACCEPTED:              { icon: <CheckCircle className="w-5 h-5 text-green-500" />, bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-200 dark:border-green-800' },
  REPORT_REJECTED:              { icon: <XCircle className="w-5 h-5 text-red-500" />, bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-200 dark:border-red-800' },
  REPORT_APPROVED:              { icon: <CheckCircle className="w-5 h-5 text-green-500" />, bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-200 dark:border-green-800' },
  NEW_ADMIN_COMMENT:            { icon: <MessageSquare className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800' },
  // Robot
  ROBOT_COMPLETED:              { icon: <Bot className="w-5 h-5 text-green-600" />, bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-200 dark:border-green-800' },
  ROBOT_FAILED:                 { icon: <AlertTriangle className="w-5 h-5 text-red-600" />, bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-300 dark:border-red-700' },
  // Publications
  PUBLICATION_VERIFIED:         { icon: <BookOpen className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800' },
  PUBLICATION_REJECTED:         { icon: <BookOpen className="w-5 h-5 text-red-500" />, bg: 'bg-red-50 dark:bg-red-950', border: 'border-red-200 dark:border-red-800' },
  PUBLICATION_NEEDS_CORRECTION: { icon: <BookOpen className="w-5 h-5 text-yellow-500" />, bg: 'bg-yellow-50 dark:bg-yellow-950', border: 'border-yellow-200 dark:border-yellow-800' },
  SCOPUS_UPDATE_REQUIRED:       { icon: <BookOpen className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800' },
  // Messages / social
  NEW_MESSAGE:                  { icon: <MessageSquare className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800' },
  MESSAGE:                      { icon: <MessageSquare className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800' },
  FRIENDSHIP_REQUEST:           { icon: <UserPlus className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800' },
  FRIENDSHIP_ACCEPTED:          { icon: <UserPlus className="w-5 h-5 text-green-500" />, bg: 'bg-green-50 dark:bg-green-950', border: 'border-green-200 dark:border-green-800' },
  FRIEND_REQUEST:               { icon: <UserPlus className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-950', border: 'border-blue-200 dark:border-blue-800' },
};

const DEFAULT_META: IconMeta = {
  icon: <Bell className="w-5 h-5 text-blue-500" />,
  bg: 'bg-blue-50 dark:bg-blue-950',
  border: 'border-blue-200 dark:border-blue-800',
};

function getTypeMeta(type: string): IconMeta {
  return TYPE_META[type] ?? DEFAULT_META;
}

// ── Navigation map ──────────────────────────────────────────────────────────

function getNavigationPath(n: Notification): string | null {
  const t = n.type;
  if (t === 'GENERATED_DOCUMENT_UPLOADED') return '/generated-documents';
  if (t === 'REPORT_RETURNED' || t === 'REPORT_ACCEPTED' || t === 'REPORT_REJECTED' || t === 'REPORT_APPROVED' || t === 'NEW_ADMIN_COMMENT') {
    return n.relatedId ? `/documents?recordId=${n.relatedId}` : '/documents';
  }
  if (t === 'PUBLICATION_VERIFIED' || t === 'PUBLICATION_REJECTED' || t === 'PUBLICATION_NEEDS_CORRECTION' || t === 'SCOPUS_UPDATE_REQUIRED') return '/publications';
  if (t.startsWith('DEADLINE')) return '/deadlines';
  if (t === 'TEMPLATE_NEW' || t === 'TEMPLATE_UPDATED') return '/templates-library';
  if (t.startsWith('KKK')) return '/kkk';
  if (t === 'ROBOT_COMPLETED' || t === 'ROBOT_FAILED') return '/admin/robot-runs';
  if (t === 'NEW_MESSAGE' || t === 'MESSAGE') return '/messages';
  if (t === 'FRIENDSHIP_REQUEST' || t === 'FRIENDSHIP_ACCEPTED' || t === 'FRIEND_REQUEST') return '/profile';
  return null;
}

// ── Date grouping ───────────────────────────────────────────────────────────

type DateGroup = 'today' | 'yesterday' | 'thisWeek' | 'earlier';

function getDateGroup(dateStr: string): DateGroup {
  const d = new Date(dateStr);
  if (isToday(d)) return 'today';
  if (isYesterday(d)) return 'yesterday';
  if (isThisWeek(d, { weekStartsOn: 1 })) return 'thisWeek';
  return 'earlier';
}

// ── Component ───────────────────────────────────────────────────────────────

const ALL_TYPES: NotificationType[] = [
  'KKK_COLLECTION_STARTED', 'KKK_STATUS_CHANGED',
  'DEADLINE_APPROACHING_WEEK', 'DEADLINE_APPROACHING_3DAYS', 'DEADLINE_TOMORROW', 'DEADLINE_OVERDUE',
  'TEMPLATE_NEW', 'TEMPLATE_UPDATED',
  'GENERATED_DOCUMENT_UPLOADED',
  'REPORT_RETURNED', 'REPORT_ACCEPTED', 'REPORT_REJECTED', 'NEW_ADMIN_COMMENT',
  'ROBOT_COMPLETED', 'ROBOT_FAILED',
  'PUBLICATION_VERIFIED', 'PUBLICATION_REJECTED', 'PUBLICATION_NEEDS_CORRECTION',
  'NEW_MESSAGE', 'FRIENDSHIP_REQUEST', 'FRIENDSHIP_ACCEPTED',
];

const Notifications: React.FC = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const navigate = useNavigate();
  const locale = i18n.language === 'ru' ? ru : enUS;

  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeDropdownOpen, setTypeDropdownOpen] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.getAll(),
    refetchInterval: 30_000,
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30_000,
  });

  const markAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      toast({ title: t('notifications.markedAllRead'), variant: 'success' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: notificationsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
      toast({ title: t('notifications.deleted'), variant: 'success' });
    },
  });

  // Filter
  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (readFilter === 'unread' && n.read) return false;
      if (readFilter === 'read' && !n.read) return false;
      if (selectedTypes.size > 0 && !selectedTypes.has(n.type)) return false;
      return true;
    });
  }, [notifications, readFilter, selectedTypes]);

  // Group
  const grouped = useMemo(() => {
    const groups: Record<DateGroup, Notification[]> = { today: [], yesterday: [], thisWeek: [], earlier: [] };
    for (const n of filtered) {
      groups[getDateGroup(n.createdAt)].push(n);
    }
    return groups;
  }, [filtered]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id);
    }
    const path = getNavigationPath(notification);
    if (path) navigate(path);
  };

  const toggleType = (type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const GROUP_ORDER: DateGroup[] = ['today', 'yesterday', 'thisWeek', 'earlier'];

  const renderGroup = (group: DateGroup) => {
    const items = grouped[group];
    if (!items.length) return null;
    return (
      <div key={group} className="space-y-1.5">
        <div className="sticky top-0 z-10 -mx-6 px-6 py-2 bg-card/95 backdrop-blur text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          {t(`notifications.groups.${group}`)} · {items.length}
        </div>
        {items.map((n) => {
          const meta = getTypeMeta(n.type);
          return (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`group relative flex items-start gap-3 p-3 pl-4 border rounded-md cursor-pointer transition-all duration-150 ${
                !n.read
                  ? 'border-border bg-accent/30 hover:bg-accent/50'
                  : 'border-border bg-card hover:bg-accent/30'
              }`}
            >
              {/* Left color stripe (by type) */}
              <span className={`absolute left-0 top-2 bottom-2 w-0.5 rounded-full ${meta.border.replace('border-', 'bg-')}`} />
              <div className="mt-0.5 shrink-0">{meta.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`font-semibold text-sm leading-tight ${!n.read ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {n.title}
                      </p>
                      {n.priority === 'HIGH' && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          {t('notifications.priorityHigh')}
                        </Badge>
                      )}
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{n.message}</p>
                    <span className="text-xs text-muted-foreground mt-1.5 inline-block tabular-nums">
                      {format(new Date(n.createdAt), 'PPp', { locale })}
                    </span>
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!n.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        title={t('notifications.markRead')}
                        onClick={(e) => { e.stopPropagation(); markAsReadMutation.mutate(n.id); }}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      title={t('notifications.delete')}
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(n.id); }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <ListSkeleton rows={5} />
      </div>
    );
  }

  const hasActive = GROUP_ORDER.some((g) => grouped[g].length > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.notifications')}
        description={unreadCount > 0 ? t('notifications.unreadCount', { count: unreadCount }) : t('notifications.noUnread')}
        icon={Bell}
        actions={unreadCount > 0 ? (
          <Button
            variant="outline"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending}
          >
            <Check className="w-4 h-4 mr-2" />
            {t('notifications.markAllRead')}
          </Button>
        ) : undefined}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Read/Unread pills */}
        {(['all', 'unread', 'read'] as const).map((f) => (
          <Button
            key={f}
            variant={readFilter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setReadFilter(f)}
          >
            {t(`notifications.filters.${f}`)}
          </Button>
        ))}

        {/* Type filter dropdown */}
        <div className="relative">
          <Button
            variant={selectedTypes.size > 0 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeDropdownOpen((v) => !v)}
          >
            <Filter className="w-4 h-4 mr-1" />
            {t('notifications.filters.type')}
            {selectedTypes.size > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{selectedTypes.size}</Badge>
            )}
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
          {typeDropdownOpen && (
            <div className="absolute top-9 left-0 z-50 bg-background border rounded-lg shadow-lg p-2 w-72 max-h-80 overflow-y-auto space-y-1">
              <div className="flex justify-between mb-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">{t('notifications.filters.type')}</span>
                {selectedTypes.size > 0 && (
                  <button className="text-xs text-blue-500 hover:underline" onClick={() => setSelectedTypes(new Set())}>
                    {t('notifications.filters.clearAll')}
                  </button>
                )}
              </div>
              {ALL_TYPES.map((type) => {
                const meta = getTypeMeta(type);
                return (
                  <label key={type} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTypes.has(type)}
                      onChange={() => toggleType(type)}
                      className="accent-primary"
                    />
                    {meta.icon}
                    <span className="text-sm">{t(`notifications.types.${type}`, { defaultValue: type })}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Close dropdown on outside click */}
        {typeDropdownOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setTypeDropdownOpen(false)} />
        )}
      </div>

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            {t('nav.notifications')}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">{unreadCount}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasActive ? (
            <div className="space-y-4">
              {GROUP_ORDER.map(renderGroup)}
            </div>
          ) : (
            <EmptyState
              icon={Bell}
              title={t('emptyStates.notifications.title')}
              description={t('emptyStates.notifications.description')}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
