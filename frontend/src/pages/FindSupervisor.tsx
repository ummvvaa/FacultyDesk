import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Sparkles, User as UserIcon, MessageSquare, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import EmptyState from '../components/EmptyState';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { aiApi } from '../api/ai';
import { TeacherSearchResult } from '../types';
import { useToast } from '../hooks/useToast';

const QUICK_TOPICS = [
  'машинное обучение',
  'компьютерное зрение',
  'кибербезопасность',
  'базы данных',
  'разработка программного обеспечения',
  'обработка естественного языка',
];

const FindSupervisor: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TeacherSearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const runSearch = async (q?: string) => {
    const search = (q ?? query).trim();
    if (!search) return;
    setLoading(true);
    try {
      const data = await aiApi.searchTeachers(search, 10);
      setResults(data);
    } catch {
      toast({ title: t('common.error'), description: t('findSupervisor.error'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const setTopicAndSearch = (topic: string) => {
    setQuery(topic);
    runSearch(topic);
  };

  const maxScore = results && results.length > 0 ? results[0].score : 1;
  const matchPct = (score: number) => Math.min(100, Math.round((score / Math.max(maxScore, 1)) * 100));

  const toggleExpand = (id: number) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('findSupervisor.title')}
        description={t('findSupervisor.subtitle')}
        icon={Sparkles}
      />

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('findSupervisor.placeholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
                className="pl-9"
              />
            </div>
            <Button onClick={() => runSearch()} disabled={loading || !query.trim()}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
              {t('common.search')}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-muted-foreground self-center mr-1">
              {t('findSupervisor.quickTopics')}:
            </span>
            {QUICK_TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => setTopicAndSearch(topic)}
                className="text-xs px-3 py-1 rounded-full border border-border bg-muted/40 hover:bg-primary hover:text-primary-foreground transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {results !== null && (
        <>
          {results.length === 0 ? (
            <EmptyState
              icon={Search}
              title={t('emptyStates.findSupervisor.title')}
              description={t('emptyStates.findSupervisor.description')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {results.map((res, i) => (
                <motion.div
                  key={res.teacher.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.04 }}
                >
                  <Card className="h-full">
                    <CardContent className="p-5 flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg shrink-0">
                          {res.teacher.username?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base truncate">{res.teacher.username}</h3>
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              {matchPct(res.score)}% {t('aiSearch.match')}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {[res.teacher.position, res.teacher.academicTitle].filter(Boolean).join(' · ')}
                          </p>
                          {res.matchedFields.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {res.matchedFields.map((f) => (
                                <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                  {t(`findSupervisor.fields.${f}`, { defaultValue: f })}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {res.matchReason && (
                        <p className="text-sm text-muted-foreground italic">
                          Найден по: {res.matchReason}
                        </p>
                      )}

                      {res.teacher.researchAreas && (
                        <div className="text-xs">
                          <span className="font-medium">{t('findSupervisor.researchAreas')}: </span>
                          <span className="text-muted-foreground">{res.teacher.researchAreas}</span>
                        </div>
                      )}

                      {res.relevantPublications && res.relevantPublications.length > 0 && (
                        <div className="border-t border-border pt-2">
                          <button
                            className="text-xs flex items-center gap-1 text-primary hover:underline"
                            onClick={() => toggleExpand(res.teacher.id)}
                          >
                            {expanded[res.teacher.id]
                              ? <ChevronUp className="w-3 h-3" />
                              : <ChevronDown className="w-3 h-3" />}
                            {t('findSupervisor.relevantPublications')} ({res.relevantPublications.length})
                          </button>
                          {expanded[res.teacher.id] && (
                            <ul className="mt-2 space-y-1">
                              {res.relevantPublications.map((pub) => (
                                <li key={pub.id} className="text-xs text-muted-foreground line-clamp-2">
                                  • {pub.title}
                                  {pub.publicationYear ? ` (${pub.publicationYear})` : ''}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2 mt-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => navigate(`/user/${res.teacher.id}`)}
                        >
                          <UserIcon className="w-4 h-4 mr-1" />
                          {t('findSupervisor.viewProfile')}
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => navigate(`/messages?to=${res.teacher.id}`)}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          {t('findSupervisor.sendMessage')}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default FindSupervisor;
