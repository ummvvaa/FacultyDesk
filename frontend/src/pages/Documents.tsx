import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recordsApi } from '../api/records';
import { categoriesApi } from '../api/categories';
import { aiApi } from '../api/ai';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Plus, Download, Trash2, Edit, Search, Filter, CheckCircle, XCircle, ArrowLeft, FileText, Sparkles, Loader2 } from 'lucide-react';
import PinButton from '../components/dashboard/PinButton';
import PageHeader from '../components/layout/PageHeader';
import EmptyState from '../components/EmptyState';
import ListSkeleton from '../components/skeletons/ListSkeleton';
import { useToast } from '../hooks/useToast';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { Record } from '../types';
import { useAuth } from '../contexts/AuthContext';

interface RecordFormData {
  title: string;
  description: string;
  categoryId: string;
  file?: FileList;
}

interface StatusFormData {
  status: string;
  comments: string;
}

const Documents: React.FC = () => {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<Record | null>(null);
  const [statusRecord, setStatusRecord] = useState<Record | null>(null);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<RecordFormData>({
    defaultValues: {
      title: '',
      description: '',
      categoryId: '',
    },
  });

  const handleGenerateDescription = async () => {
    const title = watch('title');
    const categoryId = watch('categoryId');
    if (!title || title.trim().length < 5) return;
    setIsGeneratingDescription(true);
    try {
      const catId = categoryId ? parseInt(categoryId, 10) : undefined;
      const res = await aiApi.generateRecordDescription(
        title.trim(),
        catId && !isNaN(catId) ? catId : undefined,
        i18n.language
      );
      setValue('description', res.description);
      toast({ title: t('ai.generateDescription.success'), variant: 'success' });
    } catch {
      toast({ title: t('ai.generateDescription.error'), variant: 'destructive' });
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  // Для админа показываем все отчеты, для преподавателя - только свои
  const { data: records, isLoading, error: recordsError } = useQuery({
    queryKey: isAdmin() ? ['records'] : ['myRecords'],
    queryFn: () => isAdmin() ? recordsApi.getAll() : recordsApi.getMyRecords(),
    retry: 2,
  });

  useEffect(() => {
    console.log('Records state:', {
      records,
      count: records?.length || 0,
      isLoading,
      error: recordsError,
      isAdmin: isAdmin(),
    });
  }, [records, isLoading, recordsError, isAdmin]);

  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesApi.getAll(),
    retry: 3,
  });

  useEffect(() => {
    if (categoriesError) {
      console.error('Error loading categories:', categoriesError);
      toast({
        title: 'Ошибка загрузки категорий',
        description: (categoriesError as any)?.response?.data?.message || categoriesError.message || 'Не удалось загрузить категории',
        variant: 'destructive',
      });
    }
  }, [categoriesError, toast]);

  useEffect(() => {
    if (recordsError) {
      console.error('Error loading records:', recordsError);
      const error = recordsError as any;
      let errorMessage = 'Не удалось загрузить отчеты';
      if (typeof error?.response?.data === 'string') {
        errorMessage = error.response.data;
      } else if (typeof error?.response?.data?.message === 'string') {
        errorMessage = error.response.data.message;
      } else if (typeof error?.message === 'string') {
        errorMessage = error.message;
      }
      toast({
        title: 'Ошибка загрузки отчетов',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  }, [recordsError, toast]);

  useEffect(() => {
    console.log('Categories state:', { 
      categories, 
      isLoading: categoriesLoading, 
      error: categoriesError,
      count: Array.isArray(categories) ? categories.length : 0
    });
  }, [categories, categoriesLoading, categoriesError]);

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string; categoryId: string | number; file?: File }) => {
      console.log('Creating record with:', data);
      const categoryIdNum = typeof data.categoryId === 'string' ? parseInt(data.categoryId, 10) : data.categoryId;
      console.log('Parsed categoryId:', categoryIdNum);
      
      if (isNaN(categoryIdNum) || categoryIdNum <= 0) {
        throw new Error('Неверная категория');
      }
      
      return recordsApi.create({
        title: data.title,
        description: data.description,
        categoryId: categoryIdNum,
        file: data.file,
      });
    },
    onSuccess: async (response) => {
      console.log('✅ Record created successfully:', response);
      console.log('Current user isAdmin:', isAdmin());
      
      // Инвалидируем оба queryKey чтобы обновить список для всех пользователей
      console.log('🔄 Invalidating queries...');
      await queryClient.invalidateQueries({ queryKey: ['myRecords'] });
      await queryClient.invalidateQueries({ queryKey: ['records'] });
      
      // Принудительно обновляем данные для текущего пользователя
      const currentQueryKey = isAdmin() ? ['records'] : ['myRecords'];
      console.log('🔄 Refetching with queryKey:', currentQueryKey);
      await queryClient.refetchQueries({ queryKey: currentQueryKey });
      
      // Также обновляем все связанные запросы
      await queryClient.refetchQueries({ queryKey: ['myRecords'] });
      
      console.log('✅ Queries invalidated and refetched');
      
      toast({
        title: 'Успешно',
        description: 'Отчёт создан',
        variant: 'success',
      });
      reset();
      setShowAddModal(false);
    },
    onError: (error: any) => {
      console.error('Error creating record:', error);
      console.error('Error response:', error.response);
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || error.message || 'Не удалось создать отчёт',
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title?: string; description?: string; categoryId?: number; status?: string; comments?: string } }) => {
      return recordsApi.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRecords'] });
      queryClient.invalidateQueries({ queryKey: ['records'] });
      toast({
        title: 'Успешно',
        description: 'Отчёт обновлён',
        variant: 'success',
      });
      reset();
      setShowEditModal(false);
      setShowStatusModal(false);
      setEditingRecord(null);
      setStatusRecord(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Не удалось обновить отчёт',
        variant: 'destructive',
      });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status, comments }: { id: number; status: string; comments: string }) => {
      return recordsApi.update(id, { status, comments });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records'] });
      queryClient.invalidateQueries({ queryKey: ['myRecords'] });
      toast({
        title: 'Успешно',
        description: 'Статус отчёта обновлён',
        variant: 'success',
      });
      setShowStatusModal(false);
      setStatusRecord(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || 'Не удалось обновить статус',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: recordsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRecords'] });
      toast({
        title: 'Успешно',
        description: 'Отчёт удалён',
        variant: 'success',
      });
    },
    onError: () => {
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить отчёт',
        variant: 'destructive',
      });
    },
  });

  const handleEdit = (record: Record) => {
    setEditingRecord(record);
    setValue('title', record.title);
    setValue('description', record.description || '');
    setValue('categoryId', record.category?.id ? String(record.category.id) : '');
    setShowEditModal(true);
  };

  const handleDownload = async (filename: string) => {
    try {
      // Получаем blob через API
      const blob = await recordsApi.downloadPdf(filename);
      
      // Создаем URL для blob и скачиваем файл
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      
      // Очищаем
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      
      toast({
        title: 'Успешно',
        description: 'Файл скачан',
        variant: 'success',
      });
    } catch (error: any) {
      console.error('Ошибка при скачивании файла:', error);
      toast({
        title: 'Ошибка',
        description: error.response?.data?.message || error.message || 'Не удалось скачать файл',
        variant: 'destructive',
      });
    }
  };

  const onEditSubmit = (data: RecordFormData) => {
    if (!editingRecord) return;
    
    if (!data.categoryId || data.categoryId === '') {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, выберите категорию',
        variant: 'destructive',
      });
      return;
    }

    updateMutation.mutate({
      id: editingRecord.id,
      data: {
        title: data.title,
        description: data.description,
        categoryId: Number(data.categoryId),
      },
    });
  };

  const onSubmit = (data: RecordFormData) => {
    console.log('=== 🟡 onSubmit CALLED ===');
    console.log('Form data:', {
      title: data.title,
      description: data.description,
      categoryId: data.categoryId,
      hasFile: !!data.file,
      fileCount: data.file?.length || 0
    });
    console.log('Title:', data.title, '| Length:', data.title?.length);
    console.log('Description:', data.description, '| Length:', data.description?.length);
    console.log('CategoryId:', data.categoryId, '| Type:', typeof data.categoryId);
    
    const file = data.file?.[0];
    console.log('File:', file ? { name: file.name, size: file.size, type: file.type } : 'No file');
    
    // Валидация
    if (!data.title || data.title.trim() === '') {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, введите название отчёта',
        variant: 'destructive',
      });
      return;
    }
    
    if (!data.description || data.description.trim() === '') {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, введите описание отчёта',
        variant: 'destructive',
      });
      return;
    }
    
    if (!data.categoryId || data.categoryId === '' || data.categoryId === '0') {
      toast({
        title: 'Ошибка',
        description: 'Пожалуйста, выберите категорию',
        variant: 'destructive',
      });
      return;
    }
    
    const categoryIdNum = parseInt(data.categoryId, 10);
    if (isNaN(categoryIdNum) || categoryIdNum <= 0) {
      toast({
        title: 'Ошибка',
        description: 'Неверная категория',
        variant: 'destructive',
      });
      return;
    }
    
    console.log('✅ Validation passed, calling createMutation.mutate...');
    console.log('📤 Mutation data:', {
      title: data.title.trim(),
      description: data.description.trim(),
      categoryId: categoryIdNum,
      hasFile: !!file,
    });
    
    try {
      createMutation.mutate({
        title: data.title.trim(),
        description: data.description.trim(),
        categoryId: categoryIdNum,
        file: file,
      }, {
        onSuccess: () => {
          console.log('✅ Mutation onSuccess callback');
        },
        onError: (error) => {
          console.error('❌ Mutation onError:', error);
        }
      });
    } catch (error) {
      console.error('❌ Error calling mutation:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить форму',
        variant: 'destructive',
      });
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/30';
      case 'REJECTED': return 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30';
      case 'PENDING': return 'text-yellow-600 bg-yellow-50 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'RETURNED': return 'text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-900/30';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  const getStatusText = (status?: string) => {
    return t(`documents.status.${status?.toLowerCase() || 'pending'}`);
  };

  // Цвета для категорий (адаптивные для темной темы)
  const getCategoryColor = (categoryId?: number, isSelected?: boolean) => {
    if (!categoryId) {
      return isSelected 
        ? 'bg-primary/20 text-primary border-primary' 
        : 'border-border';
    }
    
    // Для темной темы используем более темные оттенки
    const colors: { [key: number]: string } = {
      1: isSelected 
        ? 'bg-blue-500/20 text-blue-400 border-blue-400 dark:bg-blue-500/30 dark:text-blue-300' // Учебная работа
        : 'border-blue-500/30',
      2: isSelected 
        ? 'bg-purple-500/20 text-purple-400 border-purple-400 dark:bg-purple-500/30 dark:text-purple-300' // Научная работа
        : 'border-purple-500/30',
      3: isSelected 
        ? 'bg-green-500/20 text-green-400 border-green-400 dark:bg-green-500/30 dark:text-green-300' // Отчет за семестр
        : 'border-green-500/30',
      4: isSelected 
        ? 'bg-orange-500/20 text-orange-400 border-orange-400 dark:bg-orange-500/30 dark:text-orange-300' // Годовой отчет
        : 'border-orange-500/30',
    };
    
    return colors[categoryId] || (isSelected ? 'bg-primary/20 text-primary border-primary' : 'border-border');
  };

  const getCategoryIcon = (categoryName?: string) => {
    if (!categoryName) return '📄';
    
    if (categoryName.includes('Учебная')) return '📚';
    if (categoryName.includes('Научная')) return '🔬';
    if (categoryName.includes('семестр')) return '📅';
    if (categoryName.includes('Годовой')) return '📊';
    
    return '📄';
  };

  const filteredRecords = records?.filter(record => {
    const matchesSearch = record.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategoryId === null || record.category?.id === selectedCategoryId;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin() ? t('nav.allReports') : t('nav.myDocuments')}
        icon={FileText}
        actions={!isAdmin() ? (
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('documents.addNew')}
          </Button>
        ) : undefined}
      />

      {/* Фильтр по категориям */}
      {categories && categories.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Фильтр по категориям:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategoryId(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    selectedCategoryId === null
                      ? 'bg-primary text-primary-foreground shadow-md scale-105'
                      : 'bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground border border-border'
                  }`}
                >
                  Все категории ({records?.length || 0})
                </button>
                {categories.map((category) => {
                  const categoryRecords = records?.filter(r => r.category?.id === category.id) || [];
                  const isSelected = selectedCategoryId === category.id;
                  const colorClass = getCategoryColor(category.id, isSelected);
                  
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategoryId(isSelected ? null : category.id)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 border-2 flex items-center gap-2 ${
                        isSelected
                          ? colorClass + ' shadow-md scale-105 font-semibold'
                          : 'bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground border-border ' + colorClass
                      }`}
                    >
                      <span className="text-base">{getCategoryIcon(category.name)}</span>
                      <span>{category.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        isSelected ? 'bg-background/30 text-foreground' : 'bg-muted text-muted-foreground'
                      }`}>
                        {categoryRecords.length}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {selectedCategoryId && (
              <Button 
                variant="outline" 
                onClick={() => setSelectedCategoryId(null)}
                className="gap-2"
              >
                <Filter className="w-4 h-4" />
                Сбросить фильтр
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <ListSkeleton rows={5} />
          ) : filteredRecords && filteredRecords.length > 0 ? (
            <div className="space-y-4">
              <AnimatePresence>
                {filteredRecords.map((record) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                  <Card className={`group hover:shadow-lg transition-shadow duration-200 ${
                    record.category?.id ? 'border-l-4 ' + getCategoryColor(record.category.id).split(' ')[2] : ''
                  }`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-3">
                          {record.category && (
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 font-medium text-sm ${getCategoryColor(record.category.id)}`}>
                              <span className="text-base">{getCategoryIcon(record.category.name)}</span>
                              <span>{record.category.name}</span>
                            </div>
                          )}
                          <div className="ml-auto">
                            <PinButton type="RECORD" itemId={record.id} customTitle={record.title} />
                          </div>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">{record.title}</h3>
                        {isAdmin() && record.author && (
                          <p className="text-sm text-muted-foreground mb-2">
                            Автор: <span className="font-medium">{record.author.username}</span>
                            {record.author.email && ` (${record.author.email})`}
                          </p>
                        )}
                        <p className="text-muted-foreground mb-4 line-clamp-2">{record.description}</p>
                        {record.comments && isAdmin() && (
                          <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-sm font-medium text-yellow-800 mb-1">Комментарий администратора:</p>
                            <p className="text-sm text-yellow-700">{record.comments}</p>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-sm flex-wrap">
                          <span className={getStatusColor(record.status) + ' px-3 py-1 rounded-full text-xs font-medium'}>
                            {getStatusText(record.status)}
                          </span>
                          {record.semester && (
                            <span className="text-muted-foreground flex items-center gap-1">
                              <span>📅</span>
                              <span>Семестр: {record.semester}</span>
                            </span>
                          )}
                          <span className="text-muted-foreground flex items-center gap-1">
                            <span>📆</span>
                            <span>{new Date(record.createdAt).toLocaleDateString('ru-RU', { 
                              day: 'numeric', 
                              month: 'long', 
                              year: 'numeric' 
                            })}</span>
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {record.pdf && (
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleDownload(record.pdf!)}
                            title="Скачать PDF"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                        {isAdmin() && (
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => {
                              setStatusRecord(record);
                              setShowStatusModal(true);
                            }}
                            title="Изменить статус"
                            className="bg-blue-50 hover:bg-blue-100 border-blue-300"
                          >
                            <CheckCircle className="w-4 h-4 text-blue-600" />
                          </Button>
                        )}
                        {!isAdmin() && (
                          <>
                            <Button 
                              variant="outline" 
                              size="icon"
                              onClick={() => handleEdit(record)}
                              title="Редактировать"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                if (window.confirm('Вы уверены, что хотите удалить этот отчёт?')) {
                                  deleteMutation.mutate(record.id);
                                }
                              }}
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>
              ))}
              </AnimatePresence>
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title={t('emptyStates.documents.title')}
              description={t('emptyStates.documents.description')}
              actionLabel={!selectedCategoryId && !searchTerm ? t('emptyStates.documents.action') : undefined}
              onAction={!selectedCategoryId && !searchTerm ? () => setShowAddModal(true) : undefined}
            />
          )}
        </CardContent>
      </Card>

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
              <Card className="w-full max-w-2xl">
                <CardHeader>
                  <CardTitle>{t('documents.addNew')}</CardTitle>
                  <CardDescription>Добавьте новый отчёт</CardDescription>
                </CardHeader>
                <CardContent>
                  <form 
                    onSubmit={(e) => {
                      console.log('🔵 Form submit event triggered');
                      e.preventDefault();
                      handleSubmit(
                        (data) => {
                          console.log('✅ Form is valid, calling onSubmit');
                          console.log('📋 Validated data:', data);
                          onSubmit(data);
                        },
                        (errors) => {
                          console.error('❌ Form validation errors:', errors);
                          // Безопасное логирование ошибок без циклических ссылок
                          const errorKeys = Object.keys(errors);
                          console.error('❌ Error fields:', errorKeys);
                          errorKeys.forEach(key => {
                            const error = errors[key as keyof typeof errors];
                            if (error) {
                              console.error(`  - ${key}:`, error.message || error);
                            }
                          });
                          toast({
                            title: 'Ошибка валидации',
                            description: 'Пожалуйста, заполните все обязательные поля',
                            variant: 'destructive',
                          });
                        }
                      )(e);
                    }}
                  >
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Название *</label>
                        <Input 
                          placeholder="Название отчёта" 
                          {...register('title', { required: 'Название обязательно' })}
                        />
                        {errors.title && (
                          <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium">Описание *</label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleGenerateDescription}
                            disabled={isGeneratingDescription || !watch('title') || watch('title').trim().length < 5}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            {isGeneratingDescription
                              ? <><Loader2 className="w-3 h-3 animate-spin" />{t('ai.generateDescription.generating')}</>
                              : <><Sparkles className="w-3 h-3" />{t('ai.generateDescription.button')}</>
                            }
                          </Button>
                        </div>
                        <textarea
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Описание отчёта"
                          {...register('description', { required: 'Описание обязательно' })}
                        />
                        {errors.description && (
                          <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Категория * 
                          {categoriesLoading && <span className="text-xs text-muted-foreground ml-2">(загрузка...)</span>}
                          {!categoriesLoading && Array.isArray(categories) && (
                            <span className="text-xs text-muted-foreground ml-2">({categories.length} категорий)</span>
                          )}
                        </label>
                        <select 
                          className="flex h-12 w-full rounded-md border-2 border-input bg-background px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          {...register('categoryId', { 
                            required: 'Категория обязательна',
                            validate: (value) => {
                              if (!value || value === '' || value === '0') {
                                return 'Пожалуйста, выберите категорию';
                              }
                              return true;
                            }
                          })}
                          disabled={categoriesLoading}
                        >
                          <option value="">Выберите категорию</option>
                          {categoriesLoading ? (
                            <option value="" disabled>Загрузка категорий...</option>
                          ) : categoriesError ? (
                            <option value="" disabled>Ошибка загрузки категорий (проверьте консоль F12)</option>
                          ) : Array.isArray(categories) && categories.length > 0 ? (
                            categories.map((cat) => (
                              <option key={cat.id} value={String(cat.id)}>
                                {getCategoryIcon(cat.name)} {cat.name}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>Нет доступных категорий (перезапустите бэкенд)</option>
                          )}
                        </select>
                        {watch('categoryId') && categories.find(c => c.id === Number(watch('categoryId'))) && (
                          <div className="mt-2">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 ${getCategoryColor(Number(watch('categoryId')))}`}>
                              <span className="text-base">{getCategoryIcon(categories.find(c => c.id === Number(watch('categoryId')))?.name)}</span>
                              <span className="text-sm font-medium">
                                Выбрана: {categories.find(c => c.id === Number(watch('categoryId')))?.name}
                              </span>
                            </div>
                          </div>
                        )}
                        {errors.categoryId && (
                          <p className="text-sm text-destructive mt-1">{errors.categoryId.message}</p>
                        )}
                        {categoriesError && (
                          <p className="text-sm text-destructive mt-1">
                            Ошибка: {
                              (() => {
                                const error = categoriesError as any;
                                if (typeof error?.response?.data === 'string') {
                                  return error.response.data;
                                }
                                if (typeof error?.response?.data?.message === 'string') {
                                  return error.response.data.message;
                                }
                                if (typeof error?.message === 'string') {
                                  return error.message;
                                }
                                return 'Не удалось загрузить категории';
                              })()
                            }
                          </p>
                        )}
                        {!categoriesLoading && !categoriesError && Array.isArray(categories) && categories.length === 0 && (
                          <p className="text-sm text-yellow-600 mt-1">
                            ⚠️ Категории не найдены. Перезапустите бэкенд для создания категорий.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Файл</label>
                        <Input 
                          type="file" 
                          accept=".pdf,.doc,.docx" 
                          {...register('file')}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => {
                          reset();
                          setShowAddModal(false);
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending}
                        onClick={(e) => {
                          console.log('🟢 Submit button clicked');
                          console.log('📊 Form state:', {
                            isPending: createMutation.isPending,
                            hasErrors: Object.keys(errors).length > 0,
                            errors: errors
                          });
                        }}
                      >
                        {createMutation.isPending ? t('common.loading') : t('common.save')}
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
        {showEditModal && editingRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowEditModal(false);
              setEditingRecord(null);
              reset();
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-full max-w-2xl">
                <CardHeader>
                  <CardTitle>Редактировать отчёт</CardTitle>
                  <CardDescription>Измените информацию об отчёте</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit(onEditSubmit)}>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Название *</label>
                        <Input 
                          placeholder="Название отчёта" 
                          {...register('title', { required: 'Название обязательно' })}
                        />
                        {errors.title && (
                          <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium">Описание *</label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={handleGenerateDescription}
                            disabled={isGeneratingDescription || !watch('title') || watch('title').trim().length < 5}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            {isGeneratingDescription
                              ? <><Loader2 className="w-3 h-3 animate-spin" />{t('ai.generateDescription.generating')}</>
                              : <><Sparkles className="w-3 h-3" />{t('ai.generateDescription.button')}</>
                            }
                          </Button>
                        </div>
                        <textarea
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Описание отчёта"
                          {...register('description', { required: 'Описание обязательно' })}
                        />
                        {errors.description && (
                          <p className="text-sm text-destructive mt-1">{errors.description.message}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Категория * 
                          {categoriesLoading && <span className="text-xs text-muted-foreground ml-2">(загрузка...)</span>}
                          {!categoriesLoading && Array.isArray(categories) && (
                            <span className="text-xs text-muted-foreground ml-2">({categories.length} категорий)</span>
                          )}
                        </label>
                        <select 
                          className="flex h-12 w-full rounded-md border-2 border-input bg-background px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                          {...register('categoryId', { 
                            required: 'Категория обязательна',
                            validate: (value) => {
                              if (!value || value === '' || value === '0') {
                                return 'Пожалуйста, выберите категорию';
                              }
                              return true;
                            }
                          })}
                          disabled={categoriesLoading}
                        >
                          <option value="">Выберите категорию</option>
                          {categoriesLoading ? (
                            <option value="" disabled>Загрузка категорий...</option>
                          ) : categoriesError ? (
                            <option value="" disabled>Ошибка загрузки категорий (проверьте консоль F12)</option>
                          ) : Array.isArray(categories) && categories.length > 0 ? (
                            categories.map((cat) => (
                              <option key={cat.id} value={String(cat.id)}>
                                {getCategoryIcon(cat.name)} {cat.name}
                              </option>
                            ))
                          ) : (
                            <option value="" disabled>Нет доступных категорий (перезапустите бэкенд)</option>
                          )}
                        </select>
                        {watch('categoryId') && categories.find(c => c.id === Number(watch('categoryId'))) && (
                          <div className="mt-2">
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border-2 ${getCategoryColor(Number(watch('categoryId')))}`}>
                              <span className="text-base">{getCategoryIcon(categories.find(c => c.id === Number(watch('categoryId')))?.name)}</span>
                              <span className="text-sm font-medium">
                                Выбрана: {categories.find(c => c.id === Number(watch('categoryId')))?.name}
                              </span>
                            </div>
                          </div>
                        )}
                        {errors.categoryId && (
                          <p className="text-sm text-destructive mt-1">{errors.categoryId.message}</p>
                        )}
                        {categoriesError && (
                          <p className="text-sm text-destructive mt-1">
                            Ошибка: {
                              (() => {
                                const error = categoriesError as any;
                                if (typeof error?.response?.data === 'string') {
                                  return error.response.data;
                                }
                                if (typeof error?.response?.data?.message === 'string') {
                                  return error.response.data.message;
                                }
                                if (typeof error?.message === 'string') {
                                  return error.message;
                                }
                                return 'Не удалось загрузить категории';
                              })()
                            }
                          </p>
                        )}
                        {!categoriesLoading && !categoriesError && Array.isArray(categories) && categories.length === 0 && (
                          <p className="text-sm text-yellow-600 mt-1">
                            ⚠️ Категории не найдены. Перезапустите бэкенд для создания категорий.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => {
                          setShowEditModal(false);
                          setEditingRecord(null);
                          reset();
                        }}
                      >
                        {t('common.cancel')}
                      </Button>
                      <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? t('common.loading') : 'Сохранить изменения'}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Status Change Modal (Admin only) */}
      <AnimatePresence>
        {showStatusModal && statusRecord && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowStatusModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Card className="w-full max-w-2xl">
                <CardHeader>
                  <CardTitle>Изменение статуса отчёта</CardTitle>
                  <CardDescription>Отчёт: {statusRecord.title}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.target as HTMLFormElement);
                    const status = formData.get('status') as string;
                    const comments = formData.get('comments') as string;
                    statusMutation.mutate({ id: statusRecord.id, status, comments });
                  }}>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Статус *</label>
                        <select 
                          name="status"
                          defaultValue={statusRecord.status || 'PENDING'}
                          className="flex h-12 w-full rounded-md border-2 border-input bg-background px-4 py-2 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        >
                          <option value="PENDING">⏳ На проверке</option>
                          <option value="APPROVED">✅ Принято</option>
                          <option value="RETURNED">↩️ Отправлено на исправление</option>
                          <option value="REJECTED">❌ Отклонено</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Комментарий (опционально)</label>
                        <textarea
                          name="comments"
                          defaultValue={statusRecord.comments || ''}
                          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          placeholder="Введите комментарий для преподавателя..."
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-6">
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => {
                          setShowStatusModal(false);
                          setStatusRecord(null);
                        }}
                      >
                        Отмена
                      </Button>
                      <Button type="submit" disabled={statusMutation.isPending}>
                        {statusMutation.isPending ? 'Сохранение...' : 'Сохранить статус'}
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

export default Documents;

