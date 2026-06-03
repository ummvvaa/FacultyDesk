import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Settings as SettingsIcon, Save, Building2, Users, Phone, Mail } from 'lucide-react';
import PageHeader from '../../components/layout/PageHeader';
import { useToast } from '../../hooks/useToast';
import { settingsApi } from '../../api/settings';

const Settings: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  });

  const updateMutation = useMutation({
    mutationFn: settingsApi.update,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      toast({ title: 'Успешно', description: 'Настройки сохранены', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось сохранить настройки', variant: 'destructive' });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      departmentName: (formData.get('departmentName') as string) || undefined,
      deanery: (formData.get('deanery') as string) || undefined,
      headOfDepartment: (formData.get('headOfDepartment') as string) || undefined,
      postalAddress: (formData.get('postalAddress') as string) || undefined,
      phoneNumbers: (formData.get('phoneNumbers') as string) || undefined,
    };
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.settings')} description="Управление настройками кафедры и системы" icon={SettingsIcon} />

      {/* Department Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Настройки кафедры
          </CardTitle>
          <CardDescription>Основная информация о кафедре</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Название кафедры</label>
                <Input
                  name="departmentName"
                  defaultValue={settings?.departmentName || ''}
                  placeholder="Название кафедры"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Деканат</label>
                <Input
                  name="deanery"
                  defaultValue={settings?.deanery || ''}
                  placeholder="Название деканата"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Заведующий кафедрой</label>
              <Input
                name="headOfDepartment"
                defaultValue={settings?.headOfDepartment || ''}
                placeholder="ФИО заведующего кафедрой"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Почтовый адрес</label>
              <textarea
                name="postalAddress"
                defaultValue={settings?.postalAddress || ''}
                placeholder="Полный почтовый адрес"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Телефоны
              </label>
              <Input
                name="phoneNumbers"
                defaultValue={settings?.phoneNumbers || ''}
                placeholder="Телефоны через запятую"
              />
              <p className="text-xs text-muted-foreground mt-1">Можно указать несколько телефонов через запятую</p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                {updateMutation.isPending ? 'Сохранение...' : 'Сохранить настройки'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Информация о системе
          </CardTitle>
          <CardDescription>Техническая информация</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Версия системы</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-sm text-muted-foreground">Дата последнего обновления</span>
              <span className="font-medium">{new Date().toLocaleDateString('ru-RU')}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Статус</span>
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Активна
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Быстрые действия</CardTitle>
          <CardDescription>Часто используемые функции</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Экспорт данных</div>
                <div className="text-xs text-muted-foreground mt-1">Выгрузить все данные системы</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Резервное копирование</div>
                <div className="text-xs text-muted-foreground mt-1">Создать резервную копию БД</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Очистка логов</div>
                <div className="text-xs text-muted-foreground mt-1">Очистить старые записи логов</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto p-4">
              <div className="text-left">
                <div className="font-medium">Уведомления</div>
                <div className="text-xs text-muted-foreground mt-1">Настройки уведомлений</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;

