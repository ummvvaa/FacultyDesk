import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Search, User as UserIcon } from 'lucide-react';
import { usersApi } from '../api/users';
import { User } from '../types';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/layout/PageHeader';

const UsersSearch: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', 'search', searchTerm],
    queryFn: () => {
      console.log('🔍 UsersSearch: calling getAll with searchTerm:', searchTerm);
      return usersApi.getAll(searchTerm && searchTerm.trim() ? searchTerm.trim() : undefined);
    },
    enabled: true,
    staleTime: 30000, // 30 секунд кэшированиеге
  });
  
  console.log('🔍 UsersSearch: users from API:', users?.length, users);

  const filteredUsers = users?.filter(user => 
    user.id !== currentUser?.id &&
    (user.role === 'ROLE_ADMIN' || user.role === 'ROLE_TEACHER' || user.role === 'ROLE_USER')
  ) || [];

  const handleUserClick = (userId: number) => {
    navigate(`/user/${userId}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.users')} icon={Search} />

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Поиск по email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                type="email"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Загрузка...</div>
          ) : filteredUsers.length > 0 ? (
            <div className="space-y-4">
              {filteredUsers.map((user: User) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  className="border rounded-lg p-4 cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => handleUserClick(user.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                      {user.username[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{user.username}</h3>
                      {user.email && (
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      )}
                      {user.position && (
                        <p className="text-sm text-muted-foreground">{user.position}</p>
                      )}
                      {user.academicDegree && (
                        <p className="text-xs text-muted-foreground">{user.academicDegree}</p>
                      )}
                    </div>
                    <Button variant="outline" onClick={(e) => {
                      e.stopPropagation();
                      handleUserClick(user.id);
                    }}>
                      <UserIcon className="w-4 h-4 mr-2" />
                      Профиль
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Пользователи не найдены по указанному email' : 'Введите email для поиска'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UsersSearch;

