import React, { useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Moon, Sun, Globe, Bell, Check, ChevronRight, Menu, Monitor, Contrast, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../api/notifications';
import { openCommandPalette } from '../CommandPalette';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { Notification } from '../../types';
import { cn } from '../../lib/utils';

import {
  GraduationCap, Clock, FileText, Bot,
  RefreshCw, CheckCircle, XCircle, BookOpen, AlertTriangle,
  MessageSquare, UserPlus,
} from 'lucide-react';

function typeIcon(type: string): React.ReactNode {
  if (type.startsWith('KKK'))              return <GraduationCap className="w-4 h-4 text-purple-500" />;
  if (type.startsWith('DEADLINE'))         return <Clock className="w-4 h-4 text-orange-500" />;
  if (type === 'TEMPLATE_NEW' || type === 'TEMPLATE_UPDATED') return <FileText className="w-4 h-4 text-blue-500" />;
  if (type === 'GENERATED_DOCUMENT_UPLOADED') return <Bot className="w-4 h-4 text-green-500" />;
  if (type === 'REPORT_RETURNED')          return <RefreshCw className="w-4 h-4 text-yellow-500" />;
  if (type === 'REPORT_ACCEPTED' || type === 'REPORT_APPROVED') return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (type === 'REPORT_REJECTED')          return <XCircle className="w-4 h-4 text-red-500" />;
  if (type === 'ROBOT_COMPLETED')          return <Bot className="w-4 h-4 text-green-600" />;
  if (type === 'ROBOT_FAILED')             return <AlertTriangle className="w-4 h-4 text-red-600" />;
  if (type.startsWith('PUBLICATION'))      return <BookOpen className="w-4 h-4 text-blue-500" />;
  if (type === 'NEW_MESSAGE' || type === 'MESSAGE' || type === 'NEW_ADMIN_COMMENT') return <MessageSquare className="w-4 h-4 text-blue-500" />;
  if (type.includes('FRIEND') || type.includes('FRIENDSHIP')) return <UserPlus className="w-4 h-4 text-blue-500" />;
  return <Bell className="w-4 h-4 text-blue-500" />;
}

type Theme = 'light' | 'dark' | 'corporate' | 'high-contrast';

interface HeaderProps {
  onToggleSidebar: () => void;
}

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const locale = i18n.language === 'ru' ? ru : enUS;

  const [open, setOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30_000,
  });

  const { data: unreadItems = [] } = useQuery({
    queryKey: ['notifications', 'unread'],
    queryFn: () => notificationsApi.getUnread(),
    enabled: open,
  });

  const markAllMutation = useMutation({
    mutationFn: notificationsApi.markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const top5 = unreadItems.slice(0, 5) as Notification[];
  const toggleLanguage = () => i18n.changeLanguage(i18n.language === 'ru' ? 'en' : 'ru');

  const THEMES: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t('theme.light'), icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: t('theme.dark'), icon: <Moon className="w-4 h-4" /> },
    { value: 'corporate', label: t('theme.corporate'), icon: <Monitor className="w-4 h-4" /> },
    { value: 'high-contrast', label: t('theme.highContrast'), icon: <Contrast className="w-4 h-4" /> },
  ];

  const currentThemeIcon = theme === 'light' ? <Sun className="h-5 w-5" />
    : theme === 'dark' ? <Moon className="h-5 w-5" />
    : theme === 'corporate' ? <Monitor className="h-5 w-5" />
    : <Contrast className="h-5 w-5" />;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shrink-0">
      <div className="flex h-16 items-center justify-between px-4 md:px-6 gap-3">
        {/* Hamburger for mobile */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onToggleSidebar}
          title="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Cmd+K trigger — center on desktop */}
        <button
          onClick={openCommandPalette}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground border border-border rounded-md hover:bg-accent hover:text-foreground hover:border-muted-foreground/30 transition-all w-full max-w-sm"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="flex-1 text-left">Search...</span>
          <kbd className="text-[10px] border border-border rounded px-1.5 py-0.5 bg-muted font-mono tracking-wider">⌘K</kbd>
        </button>

        <div className="flex items-center gap-1 ml-auto">
          {/* Language */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLanguage}
            title={i18n.language === 'ru' ? 'Switch to English' : 'Переключить на русский'}
          >
            <Globe className="h-5 w-5" />
          </Button>

          {/* Theme dropdown */}
          <div className="relative" ref={themeRef}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setThemeOpen((v) => !v)}
              title={t('theme.light')}
            >
              {currentThemeIcon}
            </Button>
            {themeOpen && (
              <div className="absolute right-0 top-11 w-44 bg-background border rounded-lg shadow-lg z-50 overflow-hidden py-1">
                {THEMES.map((th) => (
                  <button
                    key={th.value}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors',
                      theme === th.value && 'bg-primary/10 text-primary font-medium'
                    )}
                    onClick={() => { setTheme(th.value); setThemeOpen(false); }}
                  >
                    {th.icon}
                    {th.label}
                    {theme === th.value && <Check className="w-3.5 h-3.5 ml-auto" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notification bell */}
          <div className="relative" ref={popoverRef}>
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => setOpen((v) => !v)}
              title={t('nav.notifications')}
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Button>

            {open && (
              <div className="absolute right-0 top-11 w-80 bg-background border rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b">
                  <span className="font-semibold text-sm">{t('nav.notifications')}</span>
                  {unreadCount > 0 && (
                    <button
                      className="text-xs text-blue-500 hover:underline"
                      onClick={() => { markAllMutation.mutate(); }}
                    >
                      <Check className="w-3 h-3 inline mr-1" />
                      {t('notifications.markAllRead')}
                    </button>
                  )}
                </div>
                <div className="divide-y max-h-80 overflow-y-auto">
                  {top5.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      {t('notifications.noUnread')}
                    </div>
                  ) : (
                    top5.map((n) => (
                      <div
                        key={n.id}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-accent cursor-pointer transition-colors"
                        onClick={() => { setOpen(false); navigate('/notifications'); }}
                      >
                        <div className="mt-0.5 shrink-0">{typeIcon(n.type)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{n.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{n.message}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(n.createdAt), 'PPp', { locale })}
                          </p>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                      </div>
                    ))
                  )}
                </div>
                <div className="border-t">
                  <button
                    className="w-full flex items-center justify-center gap-1 py-3 text-sm text-blue-500 hover:bg-accent transition-colors"
                    onClick={() => { setOpen(false); navigate('/notifications'); }}
                  >
                    {t('notifications.viewAll')}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
