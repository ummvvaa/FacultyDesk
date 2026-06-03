import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Plus, Download, Trash2, Edit, FileText, Upload, Archive, CheckCircle, FileCheck } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { useToast } from '../../hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import { templatesApi } from '../../api/templates';
import { Template, TemplateStatus } from '../../types';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const SELECT_CLS = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const STATUS_BADGE: Record<TemplateStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  DRAFT: 'bg-yellow-100 text-yellow-700',
  ARCHIVED: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<TemplateStatus, string> = {
  ACTIVE: 'Активен',
  DRAFT: 'Черновик',
  ARCHIVED: 'Архив',
};

const CATEGORY_LABEL: Record<string, string> = {
  TEACHING_WORKLOAD: 'Учебная нагрузка',
  KKK_DOCUMENTS: 'ККК документы',
  SCIENTIFIC_REPORTS: 'Научные отчёты',
  SERVICE_NOTES: 'Служебные записки',
  PROTOCOLS: 'Протоколы',
  PRACTICE_DOCUMENTS: 'Практика',
  DIPLOMA_SUPERVISION: 'Дипломное руководство',
  QUALIFICATION_DOCUMENTS: 'Квалификационные',
  DEPARTMENT_FORMS: 'Бланки кафедры',
  OTHER: 'Прочее',
};

const AdminTemplates: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const { data: templates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof templatesApi.create>[0]) => templatesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates-library'] });
      toast({ title: 'Успешно', description: 'Шаблон добавлен', variant: 'success' });
      setShowAddModal(false);
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error?.response?.data?.message || error?.message || 'Не удалось добавить шаблон', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof templatesApi.update>[1] }) =>
      templatesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates-library'] });
      toast({ title: 'Успешно', description: 'Шаблон обновлён', variant: 'success' });
      setShowEditModal(false);
      setEditingTemplate(null);
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error?.response?.data?.message || error?.message || 'Не удалось обновить шаблон', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: templatesApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates-library'] });
      toast({ title: 'Успешно', description: 'Шаблон удалён', variant: 'success' });
    },
    onError: (error: any) => {
      toast({ title: 'Ошибка', description: error?.response?.data?.message || error?.message || 'Не удалось удалить шаблон', variant: 'destructive' });
    },
  });

  const quickStatus = (template: Template, newStatus: TemplateStatus) => {
    updateMutation.mutate({ id: template.id, data: { status: newStatus } });
  };

  const handleDownload = async (templateId: number) => {
    try {
      const blob = await templatesApi.download(templateId);
      const tpl = templates?.find((t) => t.id === templateId);
      const filename = tpl?.filePath || `template-${templateId}`;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Ошибка', description: 'Не удалось скачать шаблон', variant: 'destructive' });
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get('file') as File;
    if (!file || file.size === 0) {
      toast({ title: 'Ошибка', description: 'Выберите файл', variant: 'destructive' });
      return;
    }
    createMutation.mutate({
      name: fd.get('name') as string,
      description: (fd.get('description') as string) || undefined,
      version: (fd.get('version') as string) || undefined,
      academicYear: (fd.get('academicYear') as string) || undefined,
      semester: (fd.get('semester') as string) || undefined,
      templateCategory: (fd.get('templateCategory') as string) || undefined,
      status: (fd.get('status') as string) || undefined,
      file,
    });
  };

  const handleUpdate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingTemplate) return;
    const fd = new FormData(e.currentTarget);
    const file = fd.get('file') as File;
    updateMutation.mutate({
      id: editingTemplate.id,
      data: {
        name: (fd.get('name') as string) || undefined,
        description: fd.get('description') as string,
        version: (fd.get('version') as string) || undefined,
        status: (fd.get('status') as string) || undefined,
        academicYear: (fd.get('academicYear') as string) || undefined,
        semester: (fd.get('semester') as string) || undefined,
        templateCategory: (fd.get('templateCategory') as string) || undefined,
        file: file && file.size > 0 ? file : undefined,
      },
    });
  };

  const formatDate = (d?: string) => {
    if (!d) return '—';
    try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ru }); } catch { return '—'; }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.templates')}
        icon={FileCheck}
        actions={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Добавить шаблон
          </Button>
        }
      />

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Загрузка...</div>
          ) : templates && templates.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium">Название</th>
                    <th className="text-left px-4 py-3 font-medium">Категория</th>
                    <th className="text-left px-4 py-3 font-medium">Год</th>
                    <th className="text-left px-4 py-3 font-medium">Статус</th>
                    <th className="text-left px-4 py-3 font-medium">Загрузок</th>
                    <th className="text-left px-4 py-3 font-medium">Обновлён</th>
                    <th className="text-right px-4 py-3 font-medium">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map((template) => (
                    <tr key={template.id} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                          <div>
                            <div className="font-medium">{template.name}</div>
                            {template.version && (
                              <div className="text-xs text-muted-foreground">v{template.version} · {template.fileType || 'FILE'}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {template.templateCategory ? CATEGORY_LABEL[template.templateCategory] || template.templateCategory : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {template.academicYear || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[template.status] || ''}`}>
                          {STATUS_LABEL[template.status] || template.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{template.downloadCount ?? 0}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {formatDate(template.lastUpdateDate || template.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {template.status !== 'ACTIVE' && (
                            <Button
                              variant="outline"
                              size="icon"
                              title="Активировать"
                              onClick={() => quickStatus(template, 'ACTIVE')}
                              disabled={updateMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          {template.status !== 'ARCHIVED' && (
                            <Button
                              variant="outline"
                              size="icon"
                              title="Архивировать"
                              onClick={() => quickStatus(template, 'ARCHIVED')}
                              disabled={updateMutation.isPending}
                            >
                              <Archive className="w-4 h-4 text-gray-500" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="icon"
                            title="Скачать"
                            onClick={() => handleDownload(template.id)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            title="Редактировать"
                            onClick={() => { setEditingTemplate(template); setShowEditModal(true); }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            title="Удалить"
                            onClick={() => { if (window.confirm('Удалить шаблон?')) deleteMutation.mutate(template.id); }}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Нет шаблонов</h3>
              <p className="text-muted-foreground mb-4">Добавьте первый шаблон</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-full max-w-2xl my-4">
                <CardHeader><CardTitle>Добавить шаблон</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                      <TemplateFormFields />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <Button type="button" variant="outline" onClick={() => setShowAddModal(false)}>Отмена</Button>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? 'Загрузка...' : 'Добавить'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingTemplate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => { setShowEditModal(false); setEditingTemplate(null); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-full max-w-2xl my-4">
                <CardHeader><CardTitle>Редактировать шаблон</CardTitle></CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdate}>
                    <div className="space-y-4">
                      <TemplateFormFields template={editingTemplate} />
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <Button type="button" variant="outline" onClick={() => { setShowEditModal(false); setEditingTemplate(null); }}>Отмена</Button>
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface TemplateFormFieldsProps {
  template?: Template;
}

const TemplateFormFields: React.FC<TemplateFormFieldsProps> = ({ template }) => {
  const isEdit = !!template;
  return (
    <>
      <div>
        <label className="text-sm font-medium mb-2 block">Название *</label>
        <Input name="name" required placeholder="Название шаблона" defaultValue={template?.name} />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Описание</label>
        <Input name="description" placeholder="Описание шаблона" defaultValue={template?.description || ''} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Версия</label>
          <Input name="version" placeholder="1.0" defaultValue={template?.version || '1.0'} />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Статус</label>
          <select name="status" defaultValue={template?.status || 'ACTIVE'} className={SELECT_CLS}>
            <option value="ACTIVE">Активен</option>
            <option value="DRAFT">Черновик</option>
            <option value="ARCHIVED">Архив</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Учебный год</label>
          <Input name="academicYear" placeholder="2025-2026" defaultValue={template?.academicYear || ''} />
        </div>
        <div>
          <label className="text-sm font-medium mb-2 block">Семестр</label>
          <select name="semester" defaultValue={template?.semester || ''} className={SELECT_CLS}>
            <option value="">— не указан —</option>
            <option value="FALL">Осенний</option>
            <option value="SPRING">Весенний</option>
            <option value="SUMMER">Летний</option>
            <option value="ALL">Весь год</option>
          </select>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Категория</label>
        <select name="templateCategory" defaultValue={template?.templateCategory || ''} className={SELECT_CLS}>
          <option value="">— не указана —</option>
          <option value="TEACHING_WORKLOAD">Учебная нагрузка</option>
          <option value="KKK_DOCUMENTS">ККК документы</option>
          <option value="SCIENTIFIC_REPORTS">Научные отчёты</option>
          <option value="SERVICE_NOTES">Служебные записки</option>
          <option value="PROTOCOLS">Протоколы</option>
          <option value="PRACTICE_DOCUMENTS">Практика</option>
          <option value="DIPLOMA_SUPERVISION">Дипломное руководство</option>
          <option value="QUALIFICATION_DOCUMENTS">Квалификационные</option>
          <option value="DEPARTMENT_FORMS">Бланки кафедры</option>
          <option value="OTHER">Прочее</option>
        </select>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">
          Файл {isEdit ? '(оставьте пустым, чтобы не менять)' : '*'}
        </label>
        {isEdit && template?.filePath && (
          <p className="text-xs text-muted-foreground mb-2">Текущий: {template.filePath}</p>
        )}
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <Upload className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <Input
            type="file"
            name="file"
            accept=".docx,.pdf,.xlsx"
            required={!isEdit}
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-2">.docx, .pdf, .xlsx</p>
        </div>
      </div>
    </>
  );
};

export default AdminTemplates;
