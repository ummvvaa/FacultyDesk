import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { MessageSquare, Send, User } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import { messagesApi } from '../api/messages';
import { usersApi } from '../api/users';
import { useToast } from '../hooks/useToast';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Message, User as UserType } from '../types';

const Messages: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const locale = i18n.language === 'ru' ? ru : enUS;
  const [searchParams] = useSearchParams();
  const initialUserId = searchParams.get('userId');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(
    initialUserId ? parseInt(initialUserId, 10) : null
  );
  const [messageContent, setMessageContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialUserId) {
      setSelectedUserId(parseInt(initialUserId, 10));
    }
  }, [initialUserId]);

  const { data: chatList } = useQuery({
    queryKey: ['messages', 'chats'],
    queryFn: () => messagesApi.getChatList(),
  });

  const { data: allUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.getAll(),
    enabled: !!currentUser,
  });

  const { data: conversation, refetch: refetchConversation } = useQuery({
    queryKey: ['messages', 'conversation', selectedUserId],
    queryFn: () => messagesApi.getConversation(selectedUserId!),
    enabled: !!selectedUserId,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => messagesApi.send(selectedUserId!, content),
    onSuccess: () => {
      setMessageContent('');
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversation', selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ['messages', 'chats'] });
      refetchConversation();
      toast({ title: 'Успешно', description: 'Сообщение отправлено', variant: 'success' });
    },
    onError: () => {
      toast({ title: 'Ошибка', description: 'Не удалось отправить сообщение', variant: 'destructive' });
    },
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (messageContent.trim() && selectedUserId) {
      sendMessageMutation.mutate(messageContent);
    }
  };

  const availableUsers = allUsers?.filter(u => 
    u.id !== currentUser?.id && 
    (u.role === 'ROLE_ADMIN' || u.role === 'ROLE_TEACHER' || u.role === 'ROLE_USER')
  ) || [];

  const chatListUsers = chatList || [];
  // Объединяем списки пользователей и удаляем дубликаты
  const allChatUsersMap = new Map<number, UserType>();
  chatListUsers.forEach(u => allChatUsersMap.set(u.id, u));
  availableUsers.forEach(u => {
    if (!allChatUsersMap.has(u.id)) {
      allChatUsersMap.set(u.id, u);
    }
  });
  const allChatUsers = Array.from(allChatUsersMap.values());

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.messages')} icon={MessageSquare} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Список чатов */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Чаты</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {allChatUsers.map((chatUser: UserType) => (
                <button
                  key={chatUser.id}
                  onClick={() => setSelectedUserId(chatUser.id)}
                  className={`w-full p-4 text-left hover:bg-accent transition-colors ${
                    selectedUserId === chatUser.id ? 'bg-accent' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                      {chatUser.username[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{chatUser.username}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {chatUser.email || chatUser.position || ''}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              {allChatUsers.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">
                  Нет активных чатов
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Область сообщений */}
        <Card className="lg:col-span-2">
          {selectedUserId ? (
            <>
              <CardHeader>
                <CardTitle>
                  {allChatUsers.find((u: UserType) => u.id === selectedUserId)?.username || 'Выберите чат'}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col h-[600px]">
                {/* Сообщения */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {conversation && conversation.length > 0 ? (
                    conversation.map((message: Message) => {
                      const isOwn = message.sender.id === currentUser?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isOwn
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className={`text-xs mt-1 ${
                              isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                            }`}>
                              {format(new Date(message.createdAt), 'HH:mm', { locale })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center text-muted-foreground py-8">
                      Нет сообщений. Начните общение!
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Форма отправки */}
                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    placeholder="Введите сообщение..."
                    disabled={sendMessageMutation.isPending}
                  />
                  <Button
                    type="submit"
                    disabled={!messageContent.trim() || sendMessageMutation.isPending}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[600px]">
              <div className="text-center text-muted-foreground">
                <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Выберите чат для начала общения</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Messages;

