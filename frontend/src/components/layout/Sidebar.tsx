import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, FileText, FileCog, Library, GraduationCap, BookOpen,
  CalendarDays, MessageSquare, Bell, Sparkles, Search, User, History,
  BarChart3, FileCheck, FolderOpen, ClipboardCheck, Inbox, CalendarClock,
  Settings, Bot, LogOut, X, KeyRound, ClipboardList,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useQuery } from '@tanstack/react-query';
import { notificationsApi } from '../../api/notifications';
import { passwordResetsApi } from '../../api/auth';
import { templateRequestsApi } from '../../api/templateRequests';

interface SidebarProps {
  isMobileOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  path: string;
  icon: React.ElementType;
  labelKey: string;
  badge?: 'unread' | 'passwordResets' | 'templateRequests';
}

interface NavGroup {
  groupKey: string;
  items: NavItem[];
}

const TEACHER_GROUPS: NavGroup[] = [
  {
    groupKey: 'sidebar.groups.workspace',
    items: [
      { path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
      { path: '/documents', icon: FileText, labelKey: 'nav.myDocuments' },
      { path: '/generated-documents', icon: FileCog, labelKey: 'nav.generatedDocuments' },
      { path: '/templates-library', icon: Library, labelKey: 'nav.templatesLibrary' },
    ],
  },
  {
    groupKey: 'sidebar.groups.academic',
    items: [
      { path: '/kkk', icon: GraduationCap, labelKey: 'nav.kkkPreparation' },
      { path: '/publications', icon: BookOpen, labelKey: 'nav.publications' },
      { path: '/deadlines', icon: CalendarDays, labelKey: 'nav.deadlines' },
    ],
  },
  {
    groupKey: 'sidebar.groups.peopleMessages',
    items: [
      { path: '/messages', icon: MessageSquare, labelKey: 'nav.messages' },
      { path: '/notifications', icon: Bell, labelKey: 'nav.notifications', badge: 'unread' },
      { path: '/find-supervisor', icon: Sparkles, labelKey: 'nav.findSupervisor' },
      { path: '/users', icon: Search, labelKey: 'nav.users' },
    ],
  },
  {
    groupKey: 'sidebar.groups.personal',
    items: [
      { path: '/profile', icon: User, labelKey: 'nav.profile' },
      { path: '/activity', icon: History, labelKey: 'nav.activity' },
    ],
  },
];

const ADMIN_GROUPS: NavGroup[] = [
  {
    groupKey: 'sidebar.groups.overview',
    items: [
      { path: '/admin/dashboard', icon: LayoutDashboard, labelKey: 'nav.adminDashboard' },
      { path: '/admin/statistics', icon: BarChart3, labelKey: 'nav.statistics' },
    ],
  },
  {
    groupKey: 'sidebar.groups.contentManagement',
    items: [
      { path: '/documents', icon: FileText, labelKey: 'nav.allReports' },
      { path: '/admin/all-generated-documents', icon: FileCog, labelKey: 'nav.allGeneratedDocuments' },
      { path: '/templates', icon: FileCheck, labelKey: 'nav.templates' },
      { path: '/admin/template-requests', icon: ClipboardList, labelKey: 'nav.templateRequests', badge: 'templateRequests' },
      { path: '/categories', icon: FolderOpen, labelKey: 'nav.categories' },
    ],
  },
  {
    groupKey: 'sidebar.groups.academicReview',
    items: [
      { path: '/admin/publications-review', icon: ClipboardCheck, labelKey: 'nav.publicationsReview' },
      { path: '/admin/kkk-submissions', icon: Inbox, labelKey: 'nav.kkkSubmissions' },
      { path: '/admin/deadlines-management', icon: CalendarClock, labelKey: 'nav.deadlinesManagement' },
    ],
  },
  {
    groupKey: 'sidebar.groups.usersAccess',
    items: [
      { path: '/teachers', icon: User, labelKey: 'nav.teachers' },
      { path: '/admin/password-resets', icon: KeyRound, labelKey: 'nav.passwordResets', badge: 'passwordResets' },
      { path: '/settings', icon: Settings, labelKey: 'nav.settings' },
    ],
  },
  {
    groupKey: 'sidebar.groups.automation',
    items: [
      { path: '/admin/robot-runs', icon: Bot, labelKey: 'nav.robotRuns' },
      { path: '/activity', icon: History, labelKey: 'nav.activity' },
    ],
  },
];

const SidebarContent: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const groups = isAdmin() ? ADMIN_GROUPS : TEACHER_GROUPS;
  const portalLabel = isAdmin() ? t('sidebar.adminPanel') : t('sidebar.teacherPortal');
  const portalClass = isAdmin()
    ? 'bg-destructive/10 text-destructive border border-destructive/20'
    : 'bg-primary/10 text-primary border border-primary/20';

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30_000,
  });

  const { data: pendingResets } = useQuery({
    queryKey: ['passwordResets', 'pending-count'],
    queryFn: () => passwordResetsApi.pendingCount(),
    refetchInterval: 60_000,
    enabled: isAdmin(),
  });
  const passwordResetCount = pendingResets?.count ?? 0;

  const { data: pendingTemplateRequests = 0 } = useQuery({
    queryKey: ['template-requests-pending-count'],
    queryFn: () => templateRequestsApi.getPendingCount(),
    refetchInterval: 60_000,
    enabled: isAdmin(),
  });

  return (
    <>
      {/* Header — logo + role badge, not scrolled */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold leading-tight tracking-tight truncate">
              {t('sidebar.departmentName')}
            </h2>
            <span className={cn(
              'mt-0.5 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full leading-tight',
              portalClass,
            )}>
              {portalLabel}
            </span>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="md:hidden p-1 rounded hover:bg-accent transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation — scrollable */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin px-3 py-4">
        {groups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-6' : ''}>
            <p className="uppercase text-[10px] text-muted-foreground tracking-wider px-3 mb-2 font-semibold">
              {t(group.groupKey)}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive =
                  item.path === '/dashboard'
                    ? location.pathname === '/dashboard'
                    : location.pathname === item.path ||
                      (item.path !== '/' && location.pathname.startsWith(item.path));
                const showBadge =
                  (item.badge === 'unread' && unreadCount > 0) ||
                  (item.badge === 'passwordResets' && passwordResetCount > 0) ||
                  (item.badge === 'templateRequests' && pendingTemplateRequests > 0);
                const badgeValue =
                  item.badge === 'unread' ? unreadCount
                  : item.badge === 'passwordResets' ? passwordResetCount
                  : item.badge === 'templateRequests' ? pendingTemplateRequests
                  : 0;

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={onClose}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-all duration-150 relative',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground/70 hover:bg-accent hover:text-foreground'
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-primary" />
                    )}
                    <Icon className={cn(
                      'w-[18px] h-[18px] shrink-0 transition-colors',
                      isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                    )} />
                    <span className="flex-1 truncate">{t(item.labelKey)}</span>
                    {showBadge && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 min-w-[16px]">
                        {badgeValue > 99 ? '99+' : badgeValue}
                      </Badge>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User card — sticky bottom */}
      <div className="shrink-0 border-t border-border p-3">
        <div className="flex items-center gap-2.5 rounded-md p-2 hover:bg-accent transition-colors">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate leading-tight">{user?.username}</p>
            <p className="text-xs text-muted-foreground truncate leading-tight mt-0.5">
              {isAdmin() ? 'Administrator' : 'Teacher'}
            </p>
          </div>
          <button
            onClick={logout}
            title={t('common.logout')}
            className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onClose }) => {
  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 md:hidden transition-opacity duration-300',
          isMobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
      />

      {/* Sidebar — fixed on mobile, sticky on desktop */}
      <aside
        className={cn(
          'w-64 bg-card border-r border-border flex flex-col',
          'fixed md:sticky top-0 h-screen',
          'z-50 md:z-auto',
          'transition-transform duration-300 md:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <SidebarContent onClose={onClose} />
      </aside>
    </>
  );
};

export default Sidebar;
