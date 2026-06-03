import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/users';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Plus, Edit, Trash2, Search, UserPlus, Users, KeyRound, Copy, AlertCircle, CheckCircle2 } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { useToast } from '../../hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../../types';
import { passwordResetsApi } from '../../api/auth';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog';

const Teachers: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<User | null>(null);

  // Reset password state
  const [resetTeacher, setResetTeacher] = useState<User | null>(null);
  const [resetMode, setResetMode] = useState<'generate' | 'custom'>('generate');
  const [resetCustom, setResetCustom] = useState('');
  const [resetResult, setResetResult] = useState<{ password: string; username: string } | null>(null);

  const resetPasswordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: number; password?: string }) =>
      passwordResetsApi.adminResetUser(userId, password),
    onSuccess: (data) => {
      const username = resetTeacher?.username ?? '';
      setResetTeacher(null);
      setResetCustom('');
      setResetResult({ password: data.newPassword, username });
      toast({ title: t('admin.teachers.resetPassword.success'), variant: 'success' });
    },
    onError: (err: any) => {
      toast({
        title: t('common.error'),
        description: err.response?.data?.message || err.message,
        variant: 'destructive',
      });
    },
  });

  const handleResetSubmit = () => {
    if (!resetTeacher) return;
    if (resetMode === 'custom' && resetCustom.trim().length < 6) {
      toast({ title: t('common.error'), description: 'Password too short', variant: 'destructive' });
      return;
    }
    resetPasswordMutation.mutate({
      userId: resetTeacher.id,
      password: resetMode === 'custom' ? resetCustom.trim() : undefined,
    });
  };

  const copyResetPassword = (pwd: string) => {
    navigator.clipboard.writeText(pwd);
    toast({ title: t('admin.passwordResets.success.passwordCopied'), variant: 'success' });
  };

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
  });

  const deleteMutation = useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Успешно', description: 'Преподаватель удалён', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось удалить преподавателя', variant: 'destructive' });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<User> & { password?: string }) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Успешно', description: 'Преподаватель добавлен', variant: 'success' });
      setShowAddModal(false);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Не удалось добавить преподавателя';
      toast({ title: 'Ошибка', description: errorMessage, variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<User> }) => usersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: 'Успешно', description: 'Данные преподавателя обновлены', variant: 'success' });
      setShowEditModal(false);
      setEditingTeacher(null);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Не удалось обновить данные';
      toast({ title: 'Ошибка', description: errorMessage, variant: 'destructive' });
    },
  });

  const handleEdit = (teacher: User) => {
    setEditingTeacher(teacher);
    setShowEditModal(true);
  };

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    if (!password || password.trim() === '') {
      toast({ title: 'Ошибка', description: 'Пароль обязателен', variant: 'destructive' });
      return;
    }
    
    const data: Partial<User> & { password: string } = {
      username: formData.get('username') as string,
      password: password,
      email: formData.get('email') as string || undefined,
      role: 'ROLE_TEACHER',
      academicDegree: formData.get('academicDegree') as string || undefined,
      position: formData.get('position') as string || undefined,
      phone: formData.get('phone') as string || undefined,
      office: formData.get('office') as string || undefined,
      researchAreas: formData.get('researchAreas') as string || undefined,
      publications: formData.get('publications') as string || undefined,
    };

    createMutation.mutate(data);
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTeacher) return;
    
    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;
    const data: Partial<User> & { password?: string } = {
      username: formData.get('username') as string,
      email: formData.get('email') as string,
      role: (formData.get('role') as 'ROLE_TEACHER' | 'ROLE_USER') || editingTeacher.role,
      academicDegree: formData.get('academicDegree') as string || undefined,
      position: formData.get('position') as string || undefined,
      phone: formData.get('phone') as string || undefined,
      office: formData.get('office') as string || undefined,
      researchAreas: formData.get('researchAreas') as string || undefined,
      publications: formData.get('publications') as string || undefined,
    };
    
    if (password && password.trim() !== '') {
      data.password = password;
    }

    updateMutation.mutate({ id: editingTeacher.id, data });
  };

  const teachers = users?.filter(user => 
    user.role === 'ROLE_TEACHER' || user.role === 'ROLE_USER'
  ) || [];

  const filteredTeachers = teachers.filter(teacher =>
    teacher.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.teachers')}
        icon={Users}
        actions={
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Добавить преподавателя
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Поиск преподавателей"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : filteredTeachers.length > 0 ? (
            <div className="space-y-4">
              {filteredTeachers.map((teacher) => (
                <Card key={teacher.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                          {teacher.username[0]?.toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-semibold">{teacher.username}</h3>
                          <p className="text-sm text-muted-foreground">
                            {teacher.email || 'Email не указан'}
                          </p>
                          {teacher.position && (
                            <p className="text-sm text-muted-foreground">{teacher.position}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setResetTeacher(teacher);
                            setResetMode('generate');
                            setResetCustom('');
                          }}
                          title={t('admin.teachers.resetPassword.button')}
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(teacher)}
                          title="Редактировать"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            if (window.confirm(`Удалить преподавателя ${teacher.username}?`)) {
                              deleteMutation.mutate(teacher.id);
                            }
                          }}
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Преподаватели не найдены
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingTeacher && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowEditModal(false);
              setEditingTeacher(null);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <CardTitle>Редактирование преподавателя</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{editingTeacher.username}</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Имя пользователя *</label>
                        <Input 
                          name="username" 
                          defaultValue={editingTeacher.username} 
                          required 
                          disabled
                          className="bg-gray-50"
                        />
                        <p className="text-xs text-muted-foreground mt-1">Имя пользователя нельзя изменить</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Email</label>
                        <Input 
                          name="email" 
                          type="email" 
                          defaultValue={editingTeacher.email || ''} 
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Роль</label>
                        <select
                          name="role"
                          defaultValue={editingTeacher.role}
                          className="flex h-12 w-full rounded-md border-2 border-input bg-background px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="ROLE_TEACHER">Преподаватель</option>
                          <option value="ROLE_USER">Пользователь</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Новый пароль (оставьте пустым, чтобы не менять)</label>
                        <Input 
                          name="password" 
                          type="password" 
                          placeholder="Введите новый пароль или оставьте пустым"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Ученая степень</label>
                        <Input 
                          name="academicDegree" 
                          defaultValue={editingTeacher.academicDegree || ''} 
                          placeholder="Кандидат технических наук"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Должность</label>
                        <Input 
                          name="position" 
                          defaultValue={editingTeacher.position || ''} 
                          placeholder="Старший преподаватель"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Телефон</label>
                        <Input 
                          name="phone" 
                          defaultValue={editingTeacher.phone || ''} 
                          placeholder="+7 (XXX) XXX-XX-XX"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Кабинет</label>
                        <Input 
                          name="office" 
                          defaultValue={editingTeacher.office || ''} 
                          placeholder="Кабинет 101"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Научные области</label>
                      <Input 
                        name="researchAreas" 
                        defaultValue={editingTeacher.researchAreas || ''} 
                        placeholder="Информационные технологии, Программирование"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Можно указать несколько через запятую</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Публикации</label>
                      <textarea
                        name="publications"
                        defaultValue={editingTeacher.publications || ''}
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Список публикаций..."
                      />
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => {
                          setShowEditModal(false);
                          setEditingTeacher(null);
                        }}
                      >
                        Отмена
                      </Button>
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Сохранение...' : 'Сохранить изменения'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
          )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <CardHeader>
                  <CardTitle>Добавить преподавателя</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Заполните данные нового преподавателя</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleAddSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Имя пользователя *</label>
                        <Input 
                          name="username" 
                          required 
                          placeholder="teacher1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Пароль *</label>
                        <Input 
                          name="password" 
                          type="password" 
                          required 
                          placeholder="Минимум 6 символов"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Email</label>
                      <Input 
                        name="email" 
                        type="email" 
                        placeholder="teacher@university.edu"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Ученая степень</label>
                        <Input 
                          name="academicDegree" 
                          placeholder="Кандидат технических наук"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Должность</label>
                        <Input 
                          name="position" 
                          placeholder="Старший преподаватель"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Телефон</label>
                        <Input 
                          name="phone" 
                          placeholder="+7 (XXX) XXX-XX-XX"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Кабинет</label>
                        <Input 
                          name="office" 
                          placeholder="Кабинет 101"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Научные области</label>
                      <Input 
                        name="researchAreas" 
                        placeholder="Информационные технологии, Программирование"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Можно указать несколько через запятую</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-2 block">Публикации</label>
                      <textarea
                        name="publications"
                        className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Список публикаций..."
                      />
                    </div>

                    <div className="flex justify-end gap-2 mt-6">
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => setShowAddModal(false)}
                      >
                        Отмена
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? 'Создание...' : 'Добавить преподавателя'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reset password dialog */}
      <Dialog open={!!resetTeacher} onOpenChange={(v) => { if (!v) setResetTeacher(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('admin.teachers.resetPassword.dialogTitle')}</DialogTitle>
            <DialogDescription>
              {resetTeacher?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="reset-mode"
                value="generate"
                checked={resetMode === 'generate'}
                onChange={() => setResetMode('generate')}
              />
              <span className="text-sm">{t('admin.teachers.resetPassword.generateRadio')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="reset-mode"
                value="custom"
                checked={resetMode === 'custom'}
                onChange={() => setResetMode('custom')}
              />
              <span className="text-sm">{t('admin.teachers.resetPassword.customRadio')}</span>
            </label>
            {resetMode === 'custom' && (
              <div className="space-y-1">
                <Label htmlFor="reset-pwd">{t('admin.teachers.resetPassword.passwordLabel')}</Label>
                <Input
                  id="reset-pwd"
                  type="text"
                  value={resetCustom}
                  onChange={(e) => setResetCustom(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTeacher(null)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleResetSubmit} disabled={resetPasswordMutation.isPending}>
              {t('admin.teachers.resetPassword.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Result dialog */}
      <Dialog open={!!resetResult} onOpenChange={(v) => { if (!v) setResetResult(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" />
              {t('admin.teachers.resetPassword.success')}
            </DialogTitle>
          </DialogHeader>
          {resetResult && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-muted rounded font-mono text-sm tabular-nums">
                  {resetResult.password}
                </code>
                <Button size="sm" variant="outline" onClick={() => copyResetPassword(resetResult.password)}>
                  <Copy className="w-4 h-4 mr-1" />
                  {t('common.copy')}
                </Button>
              </div>
              <div className="flex items-start gap-2 p-3 text-sm text-warning bg-warning/10 border border-warning/20 rounded-md">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{t('admin.teachers.resetPassword.warning')}</span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setResetResult(null)}>{t('common.close')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Teachers;

