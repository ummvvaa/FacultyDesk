import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line,
} from 'recharts';
import { FileText, Users, BookOpen, Bot, CheckCircle, AlertCircle, Link as LinkIcon, BarChart3 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { dashboardApi } from '../../api/dashboard';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#a855f7', '#14b8a6', '#f97316', '#64748b'];

function statusBadgeColor(status: string) {
  if (status === 'SUCCESS') return 'bg-green-100 text-green-700 border-green-400';
  if (status === 'FAILED') return 'bg-red-100 text-red-700 border-red-400';
  if (status === 'PARTIAL') return 'bg-orange-100 text-orange-700 border-orange-400';
  if (status === 'RUNNING') return 'bg-blue-100 text-blue-700 border-blue-400';
  return 'bg-muted text-muted-foreground border-border';
}

const Statistics: React.FC = () => {
  const { t } = useTranslation();

  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: dashboardApi.getAdminDashboard,
    staleTime: 60_000,
  });

  const pubsByDbData = dash
    ? Object.entries(dash.publicationsByDatabase).map(([name, value]) => ({ name, value }))
    : [];

  const pubsByTypeData = dash
    ? Object.entries(dash.publicationsByType).map(([name, value]) => ({ name, value }))
    : [];

  const reportsByStatusData = dash
    ? Object.entries(dash.reportsByStatus).map(([name, value]) => ({ name, value }))
    : [];

  const genDocsByMonthData = dash
    ? Object.entries(dash.generatedDocsByMonth).map(([month, count]) => ({ month, count }))
    : [];

  const kkkData = dash?.kkkReadinessByTeacher ?? [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('nav.statistics')} icon={BarChart3} />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><div className="h-16 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('statistics.title')} description={t('statistics.subtitle')} icon={BarChart3} />

      {/* Row 1 — Stats cards (2×4 grid) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('statistics.cards.teachers')}</CardTitle>
            <Users className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dash?.totalTeachers ?? 0}</div>
            <div className="text-xs text-muted-foreground">
              {t('statistics.cards.incompleteProfiles')}: <span className="text-orange-500 font-medium">{dash?.incompleteProfiles ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('statistics.cards.publications')}</CardTitle>
            <BookOpen className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dash?.totalPublications ?? 0}</div>
            <div className="text-xs text-muted-foreground">
              {t('statistics.cards.pending')}: <span className="text-orange-500 font-medium">{dash?.pendingPublications ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('statistics.cards.reports')}</CardTitle>
            <FileText className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dash?.totalReports ?? 0}</div>
            <div className="text-xs text-muted-foreground">
              {t('statistics.cards.pending')}: <span className="text-orange-500 font-medium">{dash?.pendingReports ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('statistics.cards.docsThisMonth')}</CardTitle>
            <Bot className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dash?.generatedDocsThisMonth ?? 0}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {t('statistics.cards.robot')}:&nbsp;
              {dash?.lastRobotRunStatus && dash.lastRobotRunStatus !== 'NONE' ? (
                <span className={`px-1.5 py-0.5 rounded border text-xs font-medium ${statusBadgeColor(dash.lastRobotRunStatus)}`}>
                  {dash.lastRobotRunStatus}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('statistics.cards.approvedReports')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dash?.reportsByStatus?.['APPROVED'] ?? 0}</div>
            <div className="text-xs text-muted-foreground">{t('statistics.cards.rejected')}: {dash?.reportsByStatus?.['REJECTED'] ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('statistics.cards.verifiedPublications')}</CardTitle>
            <BookOpen className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dash ? (dash.totalPublications - (dash.pendingPublications || 0)) : 0}
            </div>
            <div className="text-xs text-muted-foreground">{t('statistics.cards.outOf')} {dash?.totalPublications ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('statistics.cards.topActive')}</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dash?.topActiveTeachers?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground">
              {dash?.topActiveTeachers?.[0] ? `1: ${dash.topActiveTeachers[0].username}` : t('statistics.noData')}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">{t('statistics.cards.kkkIncomplete')}</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dash ? kkkData.filter(k => k.completionPercentage < 80).length : 0}
            </div>
            <div className="text-xs text-muted-foreground">{t('statistics.cards.outOf')} {kkkData.length} {t('statistics.cards.profiles')}</div>
          </CardContent>
        </Card>
      </div>

      {/* Row 2 — Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('statistics.charts.pubsByDatabase')}</CardTitle>
            <CardDescription>{t('statistics.charts.pubsByDatabaseDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {pubsByDbData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={pubsByDbData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {pubsByDbData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">{t('statistics.noData')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('statistics.charts.reportsByStatus')}</CardTitle>
            <CardDescription>{t('statistics.charts.reportsByStatusDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {reportsByStatusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={reportsByStatusData} cx="50%" cy="50%" outerRadius={90} dataKey="value"
                    label={(props: any) => `${props.name}: ${((props.percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {reportsByStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">{t('statistics.noData')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('statistics.charts.kkkReadiness')}</CardTitle>
            <CardDescription>{t('statistics.charts.kkkReadinessDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {kkkData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(200, kkkData.length * 24)}>
                <BarChart data={kkkData} layout="vertical" margin={{ left: 16 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `${v}%`} />
                  <YAxis type="category" dataKey="username" width={90} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip formatter={(v: any) => `${v}%`} contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }} />
                  <Bar dataKey="completionPercentage" radius={[0, 4, 4, 0]}>
                    {kkkData.map((entry, i) => (
                      <Cell key={i} fill={entry.completionPercentage >= 80 ? '#22c55e' : entry.completionPercentage >= 50 ? '#f59e0b' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">{t('statistics.noData')}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('statistics.charts.genDocsByMonth')}</CardTitle>
            <CardDescription>{t('statistics.charts.genDocsByMonthDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {genDocsByMonthData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={genDocsByMonthData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={10} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '6px' }} />
                  <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">{t('statistics.noData')}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Row 3 — Lists */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              {t('statistics.lastRobotRun.title')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dash?.lastRobotRun ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded border text-sm font-medium ${statusBadgeColor(dash.lastRobotRun.status)}`}>
                    {dash.lastRobotRun.status}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {dash.lastRobotRun.startedAt ? new Date(dash.lastRobotRun.startedAt).toLocaleString() : '—'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="text-center p-2 bg-muted/40 rounded">
                    <div className="font-bold text-lg">{dash.lastRobotRun.processedCount}</div>
                    <div className="text-xs text-muted-foreground">{t('statistics.lastRobotRun.processed')}</div>
                  </div>
                  <div className="text-center p-2 bg-muted/40 rounded">
                    <div className="font-bold text-lg text-green-600">{dash.lastRobotRun.generatedCount}</div>
                    <div className="text-xs text-muted-foreground">{t('statistics.lastRobotRun.generated')}</div>
                  </div>
                  <div className="text-center p-2 bg-muted/40 rounded">
                    <div className="font-bold text-lg text-red-500">{dash.lastRobotRun.errorCount}</div>
                    <div className="text-xs text-muted-foreground">{t('statistics.lastRobotRun.errors')}</div>
                  </div>
                </div>
                <a href="/admin/robot-runs" className="flex items-center gap-1 text-sm text-primary hover:underline">
                  <LinkIcon className="h-3 w-3" /> {t('statistics.lastRobotRun.viewAll')}
                </a>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('statistics.lastRobotRun.none')}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('statistics.topTeachers.title')}
            </CardTitle>
            <CardDescription>{t('statistics.topTeachers.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            {dash?.topActiveTeachers && dash.topActiveTeachers.length > 0 ? (
              <div className="space-y-2">
                {dash.topActiveTeachers.map((teacher, i) => (
                  <div key={teacher.userId} className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}.</span>
                      <span className="text-sm font-medium">{teacher.username}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">{teacher.activityCount} {t('statistics.topTeachers.actions')}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('statistics.topTeachers.empty')}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Statistics;
