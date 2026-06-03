import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Home } from 'lucide-react';

const SEGMENT_MAP: Record<string, string> = {
  dashboard: 'nav.dashboard',
  documents: 'nav.myDocuments',
  'generated-documents': 'nav.generatedDocuments',
  publications: 'nav.publications',
  kkk: 'nav.kkkPreparation',
  deadlines: 'nav.deadlines',
  'templates-library': 'nav.templatesLibrary',
  templates: 'nav.templates',
  profile: 'nav.profile',
  activity: 'nav.activity',
  notifications: 'nav.notifications',
  messages: 'nav.messages',
  'find-supervisor': 'nav.findSupervisor',
  users: 'nav.users',
  statistics: 'nav.statistics',
  teachers: 'nav.teachers',
  categories: 'nav.categories',
  settings: 'nav.settings',
  admin: 'breadcrumbs.admin',
  'all-generated-documents': 'nav.allGeneratedDocuments',
  'robot-runs': 'nav.robotRuns',
  'publications-review': 'nav.publicationsReview',
  'kkk-submissions': 'nav.kkkSubmissions',
  'deadlines-management': 'nav.deadlinesManagement',
};

const Breadcrumbs: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const segments = location.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs: { label: string; path: string }[] = [];
  let accumulated = '';
  for (const seg of segments) {
    accumulated += '/' + seg;
    const key = SEGMENT_MAP[seg];
    crumbs.push({ label: key ? t(key) : seg, path: accumulated });
  }

  return (
    <nav className="flex items-center gap-1.5 text-xs text-muted-foreground px-6 md:px-8 py-2 border-b border-border bg-background/40">
      <Link to="/" className="flex items-center hover:text-foreground transition-colors">
        <Home className="w-3.5 h-3.5" />
      </Link>
      {crumbs.map((crumb, idx) => (
        <React.Fragment key={crumb.path}>
          <ChevronRight className="w-3 h-3 opacity-40" />
          {idx === crumbs.length - 1 ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="hover:text-foreground transition-colors capitalize">
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
