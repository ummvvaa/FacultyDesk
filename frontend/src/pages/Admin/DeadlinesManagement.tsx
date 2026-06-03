import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { Plus, Edit2, Trash2, Bell, Power, PowerOff, CalendarClock } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { deadlinesApi } from '../../api/deadlines';
import { Deadline, DeadlineCategory, DeadlineDto, RepeatType, TargetRole, User } from '../../types';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import { apiClient } from '../../api/client';

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

const EMPTY_FORM: DeadlineDto = {
  title: '',
  description: '',
  deadlineDate: '',
  category: 'OTHER',
  targetRole: 'ALL',
  targetUserIds: [],
  repeatType: 'ONE_TIME',
  active: true,
};

export default function DeadlinesManagement() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const [page, setPage] = useState(0);
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterRepeat, setFilterRepeat] = useState<string>('ALL');
  const [filterActive, setFilterActive] = useState<string>('ALL');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<DeadlineDto>(EMPTY_FORM);
  const [deleteConfirm, setDeleteConfirm] = useState<Deadline | null>(null);

  const params: Record<string, unknown> = { page, size: 20 };
  if (filterCategory !== 'ALL') params.category = filterCategory;
  if (filterRepeat !== 'ALL') params.repeatType = filterRepeat;
  if (filterActive !== 'ALL') params.active = filterActive === 'true';

  const { data: pageData, isLoading } = useQuery({
    queryKey: ['deadlines-admin', params],
    queryFn: () => deadlinesApi.getAdmin(params as any),
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['users-list'],
    queryFn: () => apiClient.get('/api/users').then(r => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (dto: DeadlineDto) =>
      editingId ? deadlinesApi.update(editingId, dto) : deadlinesApi.create(dto),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deadlines-admin'] }); setDialogOpen(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deadlinesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deadlines-admin'] }); setDeleteConfirm(null); },
  });

  const notifyMutation = useMutation({
    mutationFn: (id: number) => deadlinesApi.notifyNow(id),
  });

  const toggleMutation = useMutation({
    mutationFn: (d: Deadline) => deadlinesApi.update(d.id, {
      title: d.title,
      description: d.description,
      deadlineDate: d.deadlineDate,
      category: d.category,
      targetRole: d.targetRole,
      targetUserIds: d.targetUsers?.map(u => u.id) ?? [],
      repeatType: d.repeatType,
      active: !d.active,
    }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['deadlines-admin'] }),
  });

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(d: Deadline) {
    setEditingId(d.id);
    setForm({
      title: d.title,
      description: d.description ?? '',
      deadlineDate: d.deadlineDate.slice(0, 16),
      category: d.category,
      targetRole: d.targetRole,
      targetUserIds: d.targetUsers?.map(u => u.id) ?? [],
      repeatType: d.repeatType,
      active: d.active,
    });
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title || !form.deadlineDate) return;
    saveMutation.mutate(form);
  }

  const categories: DeadlineCategory[] = [
    'KKK', 'SCOPUS', 'QUARTERLY_REPORT', 'SEMESTER_REPORT',
    'WORKLOAD_REPORT', 'PRACTICE_REPORT', 'ACCREDITATION', 'OTHER',
  ];
  const repeatTypes: RepeatType[] = ['ONE_TIME', 'MONTHLY', 'QUARTERLY', 'SEMESTER', 'ANNUAL'];
  const targetRoles: TargetRole[] = ['ALL', 'TEACHERS_ONLY', 'ADMINS_ONLY', 'SPECIFIC_USERS'];

  const deadlines = pageData?.content ?? [];
  const total = pageData?.totalElements ?? 0;
  const totalPages = pageData?.totalPages ?? 1;

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title={t('deadlines.managementTitle')}
        icon={CalendarClock}
        actions={
          <Button onClick={openCreate} size="sm">
            <Plus className="w-4 h-4 mr-1" />
            {t('deadlines.addDeadline')}
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={filterCategory} onValueChange={v => { setFilterCategory(v); setPage(0); }}>
          <SelectTrigger className="w-44 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('deadlines.form.category')}</SelectItem>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{t(`deadlines.categories.${c.toLowerCase()}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterRepeat} onValueChange={v => { setFilterRepeat(v); setPage(0); }}>
          <SelectTrigger className="w-40 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('deadlines.form.repeat')}</SelectItem>
            {repeatTypes.map(r => (
              <SelectItem key={r} value={r}>{t(`deadlines.repeatTypes.${r.toLowerCase()}`)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterActive} onValueChange={v => { setFilterActive(v); setPage(0); }}>
          <SelectTrigger className="w-32 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('deadlines.form.active')}</SelectItem>
            <SelectItem value="true">{t('common.active', 'Active')}</SelectItem>
            <SelectItem value="false">{t('common.inactive', 'Inactive')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              {['title', 'date', 'category', 'target', 'repeat', 'active', 'createdBy', 'actions']
                .map(col => (
                  <th key={col} className="px-3 py-2 text-left font-medium text-xs uppercase tracking-wide text-muted-foreground">
                    {t(`deadlines.table.${col}`, col)}
                  </th>
                ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">{t('common.loading')}</td></tr>
            ) : deadlines.length === 0 ? (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">{t('deadlines.emptyState')}</td></tr>
            ) : deadlines.map(d => (
              <tr key={d.id} className="border-t border-border hover:bg-muted/30 transition-colors">
                <td className="px-3 py-2 font-medium max-w-xs truncate">{d.title}</td>
                <td className="px-3 py-2 whitespace-nowrap text-xs">
                  {format(parseISO(d.deadlineDate), 'dd.MM.yyyy HH:mm')}
                </td>
                <td className="px-3 py-2">
                  <Badge className={`text-xs ${CATEGORY_COLORS[d.category]}`}>
                    {t(`deadlines.categories.${d.category.toLowerCase()}`)}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-xs">
                  {t(`deadlines.targetRoles.${d.targetRole.toLowerCase()}`)}
                  {d.targetRole === 'SPECIFIC_USERS' && d.targetUsers && (
                    <span className="text-muted-foreground"> ({d.targetUsers.length})</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  {t(`deadlines.repeatTypes.${d.repeatType.toLowerCase()}`)}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={d.active ? 'default' : 'outline'} className="text-xs">
                    {d.active ? t('deadlines.active') : t('deadlines.inactive')}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {d.createdBy?.username ?? '—'}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      title={t('deadlines.actions.edit')}
                      onClick={() => openEdit(d)}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      title={t('deadlines.actions.notifyNow')}
                      onClick={() => notifyMutation.mutate(d.id)}
                      disabled={notifyMutation.isPending}
                    >
                      <Bell className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7"
                      title={t('deadlines.actions.toggleActive')}
                      onClick={() => toggleMutation.mutate(d)}
                    >
                      {d.active ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      title={t('deadlines.actions.delete')}
                      onClick={() => setDeleteConfirm(d)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>←</Button>
          <span className="text-sm py-1">{page + 1} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>→</Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('deadlines.editDeadline') : t('deadlines.addDeadline')}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label className="text-xs">{t('deadlines.form.title')} *</Label>
              <input
                required
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm rounded border border-border bg-background"
              />
            </div>
            <div>
              <Label className="text-xs">{t('deadlines.form.description')}</Label>
              <textarea
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm rounded border border-border bg-background resize-none"
              />
            </div>
            <div>
              <Label className="text-xs">{t('deadlines.form.date')} *</Label>
              <input
                required
                type="datetime-local"
                value={form.deadlineDate}
                onChange={e => setForm(f => ({ ...f, deadlineDate: e.target.value }))}
                className="w-full mt-1 px-3 py-2 text-sm rounded border border-border bg-background"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">{t('deadlines.form.category')}</Label>
                <Select value={form.category} onValueChange={(v) => setForm(f => ({ ...f, category: v as DeadlineCategory }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => (
                      <SelectItem key={c} value={c}>{t(`deadlines.categories.${c.toLowerCase()}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{t('deadlines.form.repeat')}</Label>
                <Select value={form.repeatType} onValueChange={(v) => setForm(f => ({ ...f, repeatType: v as RepeatType }))}>
                  <SelectTrigger className="mt-1 h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {repeatTypes.map(r => (
                      <SelectItem key={r} value={r}>{t(`deadlines.repeatTypes.${r.toLowerCase()}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs mb-2 block">{t('deadlines.form.target')}</Label>
              <div className="flex flex-col gap-2">
                {targetRoles.map(role => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="targetRole"
                      checked={form.targetRole === role}
                      onChange={() => setForm(f => ({ ...f, targetRole: role, targetUserIds: [] }))}
                    />
                    <span className="text-sm">{t(`deadlines.targetRoles.${role.toLowerCase()}`)}</span>
                  </label>
                ))}
              </div>
            </div>
            {form.targetRole === 'SPECIFIC_USERS' && (
              <div>
                <Label className="text-xs">{t('deadlines.form.users')}</Label>
                <div className="mt-1 border border-border rounded p-2 max-h-40 overflow-y-auto space-y-1">
                  {allUsers.filter(u => u.role !== 'ROLE_ROBOT').map(u => (
                    <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-1 rounded">
                      <input
                        type="checkbox"
                        checked={form.targetUserIds?.includes(u.id) ?? false}
                        onChange={e => {
                          const ids = form.targetUserIds ?? [];
                          setForm(f => ({
                            ...f,
                            targetUserIds: e.target.checked
                              ? [...ids, u.id]
                              : ids.filter(id => id !== u.id),
                          }));
                        }}
                      />
                      <span className="text-xs">{u.username} ({u.email})</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={v => setForm(f => ({ ...f, active: v }))}
                id="active-switch"
              />
              <Label htmlFor="active-switch" className="text-sm">{t('deadlines.form.active')}</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>{t('common.cancel')}</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{t('common.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('deadlines.actions.delete')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t('deadlines.deleteConfirm', { title: deleteConfirm?.title })}
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>{t('common.cancel')}</Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm.id)}
              disabled={deleteMutation.isPending}
            >
              {t('common.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
