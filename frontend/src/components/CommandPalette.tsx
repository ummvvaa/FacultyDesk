import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard, FileText, FileCog, Library, GraduationCap, BookOpen,
  CalendarDays, MessageSquare, Bell, Sparkles, Search, User, History,
  BarChart3, FileCheck, FolderOpen, ClipboardCheck, Inbox, CalendarClock,
  Settings, Bot, X,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { usersApi } from '../api/users';
import { templatesApi } from '../api/templates';
import { cn } from '../lib/utils';

interface PageItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

const TEACHER_PAGES: PageItem[] = [
  { id: 'dashboard',            label: 'Dashboard',           icon: LayoutDashboard, path: '/dashboard' },
  { id: 'documents',            label: 'My Documents',        icon: FileText,        path: '/documents' },
  { id: 'generated-documents',  label: 'Generated Documents', icon: FileCog,         path: '/generated-documents' },
  { id: 'templates-library',    label: 'Templates Library',   icon: Library,         path: '/templates-library' },
  { id: 'kkk',                  label: 'KKK Preparation',     icon: GraduationCap,   path: '/kkk' },
  { id: 'publications',         label: 'Publications',        icon: BookOpen,        path: '/publications' },
  { id: 'deadlines',            label: 'Deadlines',           icon: CalendarDays,    path: '/deadlines' },
  { id: 'messages',             label: 'Messages',            icon: MessageSquare,   path: '/messages' },
  { id: 'notifications',        label: 'Notifications',       icon: Bell,            path: '/notifications' },
  { id: 'find-supervisor',      label: 'Find Supervisor',     icon: Sparkles,        path: '/find-supervisor' },
  { id: 'users',                label: 'Users',               icon: Search,          path: '/users' },
  { id: 'profile',              label: 'Profile',             icon: User,            path: '/profile' },
  { id: 'activity',             label: 'Activity Log',        icon: History,         path: '/activity' },
];

const ADMIN_PAGES: PageItem[] = [
  { id: 'admin-dashboard',           label: 'Admin Dashboard',          icon: LayoutDashboard, path: '/admin/dashboard' },
  { id: 'statistics',                label: 'Statistics',               icon: BarChart3,       path: '/statistics' },
  { id: 'all-reports',               label: 'All Reports',              icon: FileText,        path: '/documents' },
  { id: 'all-generated-documents',   label: 'All Generated Documents',  icon: FileCog,         path: '/admin/all-generated-documents' },
  { id: 'templates',                 label: 'Templates',                icon: FileCheck,       path: '/templates' },
  { id: 'categories',                label: 'Categories',               icon: FolderOpen,      path: '/categories' },
  { id: 'publications-review',       label: 'Publications Review',      icon: ClipboardCheck,  path: '/admin/publications-review' },
  { id: 'kkk-submissions',           label: 'KKK Submissions',          icon: Inbox,           path: '/admin/kkk-submissions' },
  { id: 'deadlines-management',      label: 'Deadlines Management',     icon: CalendarClock,   path: '/admin/deadlines-management' },
  { id: 'teachers',                  label: 'Teachers',                 icon: User,            path: '/teachers' },
  { id: 'settings',                  label: 'Settings',                 icon: Settings,        path: '/settings' },
  { id: 'robot-runs',                label: 'Robot Runs',               icon: Bot,             path: '/admin/robot-runs' },
  { id: 'activity-admin',            label: 'Activity Log',             icon: History,         path: '/activity' },
];

let paletteOpen = false;
let setPaletteOpen: ((v: boolean) => void) | null = null;

export function openCommandPalette() {
  setPaletteOpen?.(true);
}

function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const CommandPalette: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  setPaletteOpen = setOpen;
  paletteOpen = open;

  const pages = isAdmin() ? ADMIN_PAGES : TEACHER_PAGES;
  const debouncedQuery = useDebounce(query, 200);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Live search: teachers
  const { data: teacherResults = [] } = useQuery({
    queryKey: ['palette', 'users', debouncedQuery],
    queryFn: () => usersApi.getAll(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  // Live search: templates
  const { data: templateResults = [] } = useQuery({
    queryKey: ['palette', 'templates', debouncedQuery],
    queryFn: () => templatesApi.getAll({ search: debouncedQuery }),
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const filteredPages = query
    ? pages.filter((p) => p.label.toLowerCase().includes(query.toLowerCase()))
    : pages;

  const filteredTeachers = teacherResults.filter(
    (u: any) => u.role === 'ROLE_TEACHER'
  );

  interface ResultItem {
    id: string;
    label: string;
    sub?: string;
    onSelect: () => void;
    icon?: React.ReactNode;
  }

  const allItems: ResultItem[] = [
    ...filteredPages.map((p) => ({
      id: `page-${p.id}`,
      label: p.label,
      sub: t('commandPalette.sections.pages'),
      icon: <p.icon className="w-4 h-4 text-muted-foreground" />,
      onSelect: () => { setOpen(false); navigate(p.path); },
    })),
    ...filteredTeachers.map((u: any) => ({
      id: `teacher-${u.id}`,
      label: u.username,
      sub: t('commandPalette.sections.teachers'),
      icon: <User className="w-4 h-4 text-blue-500" />,
      onSelect: () => { setOpen(false); navigate(`/user/${u.id}`); },
    })),
    ...templateResults.map((tmpl: any) => ({
      id: `template-${tmpl.id}`,
      label: tmpl.name,
      sub: t('commandPalette.sections.templates'),
      icon: <FileText className="w-4 h-4 text-green-500" />,
      onSelect: () => { setOpen(false); navigate('/templates-library'); },
    })),
  ];

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      allItems[activeIdx]?.onSelect();
    }
  }, [allItems, activeIdx]);

  useEffect(() => {
    setActiveIdx(0);
  }, [debouncedQuery]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIdx}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx]);

  if (!open) return null;

  const groupedItems = [
    { label: t('commandPalette.sections.pages'), items: allItems.filter((i) => i.id.startsWith('page-')) },
    { label: t('commandPalette.sections.teachers'), items: allItems.filter((i) => i.id.startsWith('teacher-')) },
    { label: t('commandPalette.sections.templates'), items: allItems.filter((i) => i.id.startsWith('template-')) },
  ].filter((g) => g.items.length > 0);

  let globalIdx = 0;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="relative w-full max-w-[640px] mx-4 bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder={t('commandPalette.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 text-xs text-muted-foreground border border-border rounded px-1.5 py-0.5">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[420px] overflow-y-auto py-2">
          {allItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t('commandPalette.noResults')}
            </div>
          ) : (
            groupedItems.map((group) => (
              <div key={group.label}>
                <p className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const idx = globalIdx++;
                  const isActive = idx === activeIdx;
                  return (
                    <button
                      key={item.id}
                      data-idx={idx}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors',
                        isActive
                          ? 'bg-accent text-accent-foreground ring-inset ring-2 ring-primary/30'
                          : 'hover:bg-accent/50'
                      )}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={item.onSelect}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <span className="flex-1 truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span><kbd className="border border-border rounded px-1">↑↓</kbd> {t('commandPalette.hints.navigate')}</span>
          <span><kbd className="border border-border rounded px-1">↵</kbd> {t('commandPalette.hints.select')}</span>
          <span><kbd className="border border-border rounded px-1">Esc</kbd> {t('commandPalette.hints.close')}</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
