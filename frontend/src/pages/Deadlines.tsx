import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar as CalendarIcon, List, Filter, CalendarDays } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import EmptyState from '../components/EmptyState';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format as fnsFormat, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { deadlinesApi } from '../api/deadlines';
import { Deadline, DeadlineCategory, RepeatType } from '../types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

const locales = { ru };
const localizer = dateFnsLocalizer({ format: fnsFormat, parse, startOfWeek, getDay, locales });

const CATEGORY_COLORS: Record<DeadlineCategory, string> = {
  KKK: 'bg-purple-100 text-purple-800',
  SCOPUS: 'bg-blue-100 text-blue-800',
  QUARTERLY_REPORT: 'bg-yellow-100 text-yellow-800',
  SEMESTER_REPORT: 'bg-orange-100 text-orange-800',
  WORKLOAD_REPORT: 'bg-cyan-100 text-cyan-800',
  PRACTICE_REPORT: 'bg-green-100 text-green-800',
  ACCREDITATION: 'bg-red-100 text-red-800',
  OTHER: 'bg-gray-100 text-gray-800',
};

function urgencyClass(deadline: Deadline): string {
  const days = differenceInDays(parseISO(deadline.deadlineDate), new Date());
  if (days < 3) return 'border-l-4 border-red-500';
  if (days < 7) return 'border-l-4 border-orange-400';
  return 'border-l-4 border-green-500';
}

function DaysLeftBadge({ dateStr }: { dateStr: string }) {
  const { t } = useTranslation();
  const days = differenceInDays(parseISO(dateStr), new Date());
  if (days < 0) return <span className="text-sm font-semibold text-red-600">{t('deadlines.alerts.overdue')}</span>;
  if (days === 0) return <span className="text-sm font-semibold text-orange-600">{t('deadlines.alerts.today')}</span>;
  return <span className="text-sm text-muted-foreground">{t('deadlines.alerts.daysLeft', { count: days })}</span>;
}

function DeadlineCard({ d, onClick }: { d: Deadline; onClick: () => void }) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? ru : undefined;
  return (
    <div
      className={`bg-card rounded-lg p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${urgencyClass(d)}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{d.title}</p>
          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
            <CalendarIcon className="w-3 h-3" />
            <span>{format(parseISO(d.deadlineDate), 'dd MMM yyyy', { locale })}</span>
          </div>
          {d.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{d.description}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge className={`text-xs ${CATEGORY_COLORS[d.category]}`}>
            {t(`deadlines.categories.${d.category.toLowerCase()}`)}
          </Badge>
          <DaysLeftBadge dateStr={d.deadlineDate} />
        </div>
      </div>
    </div>
  );
}

export default function Deadlines() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ru' ? ru : undefined;

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterRepeat, setFilterRepeat] = useState<string>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDeadline, setSelectedDeadline] = useState<Deadline | null>(null);
  const [calView, setCalView] = useState<string>(Views.MONTH);
  const [calDate, setCalDate] = useState(new Date());

  const { data: deadlines = [], isLoading } = useQuery({
    queryKey: ['deadlines'],
    queryFn: deadlinesApi.getRelevant,
  });

  const filtered = useMemo(() => {
    return deadlines.filter(d => {
      if (filterCategory !== 'ALL' && d.category !== filterCategory) return false;
      if (filterRepeat !== 'ALL' && d.repeatType !== filterRepeat) return false;
      if (dateFrom && parseISO(d.deadlineDate) < parseISO(dateFrom)) return false;
      if (dateTo && parseISO(d.deadlineDate) > parseISO(dateTo)) return false;
      return true;
    });
  }, [deadlines, filterCategory, filterRepeat, dateFrom, dateTo]);

  const grouped = useMemo(() => {
    const map = new Map<string, Deadline[]>();
    [...filtered]
      .sort((a, b) => a.deadlineDate.localeCompare(b.deadlineDate))
      .forEach(d => {
        const key = format(parseISO(d.deadlineDate), 'yyyy-MM');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(d);
      });
    return map;
  }, [filtered]);

  const calEvents = useMemo(() =>
    filtered.map(d => ({
      id: d.id,
      title: d.title,
      start: parseISO(d.deadlineDate),
      end: parseISO(d.deadlineDate),
      resource: d,
    })), [filtered]);

  const categories: DeadlineCategory[] = [
    'KKK', 'SCOPUS', 'QUARTERLY_REPORT', 'SEMESTER_REPORT',
    'WORKLOAD_REPORT', 'PRACTICE_REPORT', 'ACCREDITATION', 'OTHER',
  ];
  const repeatTypes: RepeatType[] = ['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'SEMESTER', 'ANNUAL'];

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t('deadlines.title')}
        icon={CalendarDays}
        actions={
          <>
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('list')}
            >
              <List className="w-4 h-4 mr-1" />
              {t('deadlines.listView')}
            </Button>
            <Button
              variant={view === 'calendar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setView('calendar')}
            >
              <CalendarIcon className="w-4 h-4 mr-1" />
              {t('deadlines.calendarView')}
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-muted-foreground" />
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue placeholder={t('deadlines.form.category')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('common.search')}</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>
                {t(`deadlines.categories.${c.toLowerCase()}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRepeat} onValueChange={setFilterRepeat}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue placeholder={t('deadlines.form.repeat')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('deadlines.form.repeat')}</SelectItem>
            {repeatTypes.map(r => (
              <SelectItem key={r} value={r}>
                {t(`deadlines.repeatTypes.${r.toLowerCase()}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input
          type="date"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          className="h-8 px-2 text-xs rounded border border-border bg-background"
        />
        <span className="text-xs text-muted-foreground">—</span>
        <input
          type="date"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          className="h-8 px-2 text-xs rounded border border-border bg-background"
        />
        {(filterCategory !== 'ALL' || filterRepeat !== 'ALL' || dateFrom || dateTo) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => { setFilterCategory('ALL'); setFilterRepeat('ALL'); setDateFrom(''); setDateTo(''); }}
          >
            ✕
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : view === 'list' ? (
        <div className="space-y-6">
          {grouped.size === 0 && (
            <EmptyState
              icon={CalendarDays}
              title={t('emptyStates.deadlines.title')}
              description={t('emptyStates.deadlines.description')}
            />
          )}
          {Array.from(grouped.entries()).map(([monthKey, items]) => (
            <div key={monthKey}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
                {format(parseISO(monthKey + '-01'), 'LLLL yyyy', { locale })}
              </h3>
              <div className="grid gap-2">
                {items.map(d => (
                  <DeadlineCard key={d.id} d={d} onClick={() => setSelectedDeadline(d)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden" style={{ height: 600 }}>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {React.createElement(Calendar as any, {
            localizer,
            events: calEvents,
            views: [Views.MONTH, Views.WEEK, Views.DAY],
            view: calView as any,
            date: calDate,
            onView: (v: string) => setCalView(v),
            onNavigate: (d: Date) => setCalDate(d),
            onSelectEvent: (ev: any) => setSelectedDeadline(ev.resource),
            style: { height: '100%' },
            messages: {
              today: t('common.search'),
              previous: '←',
              next: '→',
              month: t('deadlines.calendarView'),
            },
          })}
        </div>
      )}

      {/* Detail modal */}
      <Dialog open={!!selectedDeadline} onOpenChange={() => setSelectedDeadline(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedDeadline?.title}</DialogTitle>
          </DialogHeader>
          {selectedDeadline && (
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <Badge className={CATEGORY_COLORS[selectedDeadline.category]}>
                  {t(`deadlines.categories.${selectedDeadline.category.toLowerCase()}`)}
                </Badge>
                <Badge variant="outline">
                  {t(`deadlines.repeatTypes.${selectedDeadline.repeatType.toLowerCase()}`)}
                </Badge>
              </div>
              <p className="flex items-center gap-2 text-muted-foreground">
                <CalendarIcon className="w-4 h-4" />
                {format(parseISO(selectedDeadline.deadlineDate), 'dd MMMM yyyy HH:mm', { locale })}
              </p>
              <DaysLeftBadge dateStr={selectedDeadline.deadlineDate} />
              {selectedDeadline.description && (
                <p className="text-muted-foreground">{selectedDeadline.description}</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
