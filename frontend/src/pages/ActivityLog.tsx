import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { activityApi } from '../api/activity';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { History, User, FileText, Folder, Trash2, Edit, Plus } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

const ActivityLog: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['activity', user?.id],
    queryFn: () => activityApi.getUserActivity(user!.id),
    enabled: !!user,
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <Plus className="w-4 h-4 text-green-500" />;
      case 'UPDATE':
      case 'EDIT':
        return <Edit className="w-4 h-4 text-blue-500" />;
      case 'DELETE':
        return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'VIEW':
        return <FileText className="w-4 h-4 text-gray-500" />;
      default:
        return <History className="w-4 h-4" />;
    }
  };

  const getObjectIcon = (objectType: string) => {
    switch (objectType) {
      case 'Record':
        return <FileText className="w-4 h-4" />;
      case 'Category':
        return <Folder className="w-4 h-4" />;
      case 'User':
        return <User className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const locale = i18n.language === 'ru' ? ru : enUS;

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.activity')} icon={History} />

      <Card>
        <CardHeader>
          <CardTitle>Журнал активности</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('common.loading')}</div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="mt-1">
                    {getActionIcon(activity.action)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getObjectIcon(activity.objectType)}
                      <span className="font-medium">{activity.action}</span>
                      <span className="text-muted-foreground">{activity.objectType}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {activity.objectName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(activity.createdAt), 'PPpp', { locale })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              История действий пуста
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ActivityLog;

