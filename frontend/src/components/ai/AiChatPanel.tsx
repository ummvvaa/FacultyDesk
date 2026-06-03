import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Send,
  X,
  Plus,
  Trash2,
  History,
  ChevronDown,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { assistantApi } from '../../api/assistant';
import { useAuth } from '../../contexts/AuthContext';
import { AssistantMessage, AssistantConversation } from '../../types';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

interface Props {
  open: boolean;
  onClose: () => void;
}

interface UiMessage {
  id: number | string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
}

const AiChatPanel: React.FC<Props> = ({ open, onClose }) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const locale = i18n.language === 'en' ? 'en' : 'ru';

  const { data: conversations = [] } = useQuery<AssistantConversation[]>({
    queryKey: ['assistant', 'conversations'],
    queryFn: () => assistantApi.listConversations(),
    enabled: open,
    staleTime: 30_000,
  });

  const { data: loadedMessages } = useQuery<AssistantMessage[]>({
    queryKey: ['assistant', 'messages', conversationId],
    queryFn: () => assistantApi.getMessages(conversationId!),
    enabled: open && conversationId != null,
  });

  useEffect(() => {
    if (loadedMessages) {
      setMessages(
        loadedMessages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        }))
      );
    }
  }, [loadedMessages]);

  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 200);
    }
  }, [open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => assistantApi.deleteConversation(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['assistant', 'conversations'] });
      if (conversationId === id) {
        setConversationId(null);
        setMessages([]);
      }
    },
  });

  const sendMessage = async (text: string) => {
    if (!text.trim() || isSending) return;
    setSendError(null);
    setIsSending(true);

    const optimistic: UiMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    setInput('');

    try {
      const response = await assistantApi.chat(text, conversationId ?? undefined, locale);
      setConversationId(response.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          id: response.messageId,
          role: 'assistant',
          content: response.response,
          createdAt: response.createdAt,
        },
      ]);
      queryClient.invalidateQueries({ queryKey: ['assistant', 'conversations'] });
    } catch (err: any) {
      if (err?.response?.status === 503 && err?.response?.data?.error === 'AiUnavailable') {
        const msg = err.response.data.message || t('ai.assistant.error');
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant' as const,
            content: `⚠️ ${msg}`,
            createdAt: new Date().toISOString(),
          },
        ]);
      } else {
        const msg =
          err?.response?.data?.message ||
          err?.message ||
          t('ai.assistant.error', 'Something went wrong. Try again.');
        setSendError(msg);
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const startNewChat = () => {
    setConversationId(null);
    setMessages([]);
    setSendError(null);
    setHistoryOpen(false);
  };

  const switchConversation = (id: number) => {
    setConversationId(id);
    setHistoryOpen(false);
  };

  const suggestedQuestions = useMemo(
    () => [
      {
        key: 'kkkProgress',
        label: t('ai.assistant.suggestedQuestions.kkkProgress', "What's my KKK progress?"),
      },
      {
        key: 'deadlines',
        label: t('ai.assistant.suggestedQuestions.deadlines', 'Show my upcoming deadlines'),
      },
      {
        key: 'publicationsNeeded',
        label: t(
          'ai.assistant.suggestedQuestions.publicationsNeeded',
          'How many publications do I need for KKK?'
        ),
      },
      {
        key: 'whatNext',
        label: t('ai.assistant.suggestedQuestions.whatNext', 'What should I work on next?'),
      },
    ],
    [t]
  );

  const isEmpty = messages.length === 0 && !isSending;
  const firstName = user?.username || '';

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-background/40 backdrop-blur-[1px] md:hidden"
            onClick={onClose}
          />
          <motion.aside
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={cn(
              'fixed top-0 right-0 bottom-0 z-50',
              'w-full md:w-[420px]',
              'bg-card border-l border-border',
              'flex flex-col shadow-2xl'
            )}
          >
            <header className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2 min-w-0">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold leading-tight truncate">
                    {t('ai.assistant.chatTitle', 'AI Assistant')}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {t('ai.assistant.poweredBy', 'Powered by Groq')}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={startNewChat}
                  title={t('ai.assistant.newChat', 'New chat')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setHistoryOpen((v) => !v)}
                    title={t('ai.assistant.conversationsList', 'Conversations')}
                  >
                    <History className="h-4 w-4" />
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                  {historyOpen && (
                    <div className="absolute right-0 top-full mt-1 w-72 rounded-lg border border-border bg-popover shadow-lg z-20">
                      <div className="px-3 py-2 text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                        {t('ai.assistant.conversationsList', 'Conversations')}
                      </div>
                      {conversations.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-muted-foreground">
                          {t('ai.assistant.noConversations', 'No conversations yet')}
                        </div>
                      ) : (
                        <ul className="max-h-64 overflow-y-auto scrollbar-thin py-1">
                          {conversations.slice(0, 10).map((c) => (
                            <li
                              key={c.id}
                              className={cn(
                                'group flex items-center gap-1 px-2 py-1.5 hover:bg-accent rounded mx-1',
                                conversationId === c.id && 'bg-accent'
                              )}
                            >
                              <button
                                type="button"
                                className="flex-1 text-left text-sm truncate"
                                onClick={() => switchConversation(c.id)}
                              >
                                {c.title || 'Untitled'}
                              </button>
                              <button
                                type="button"
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(t('ai.assistant.deleteConversation', 'Delete conversation?'))) {
                                    deleteMutation.mutate(c.id);
                                  }
                                }}
                                title={t('ai.assistant.deleteConversation', 'Delete')}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-4">
              {isEmpty && (
                <div className="flex flex-col items-center text-center mt-6">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
                    <Bot className="h-8 w-8" />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {t('ai.assistant.welcomeTitle', 'Hi {{name}}! How can I help?', { name: firstName })}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground max-w-[300px]">
                    {t(
                      'ai.assistant.welcomeDescription',
                      'Ask me anything about your KKK, deadlines, publications, or the system.'
                    )}
                  </p>
                  <div className="mt-5 grid grid-cols-1 gap-2 w-full">
                    {suggestedQuestions.map((q) => (
                      <button
                        key={q.key}
                        type="button"
                        className="text-left text-sm px-3 py-2 rounded-lg border border-border bg-card hover:bg-accent hover:border-muted-foreground/30 transition-colors"
                        onClick={() => sendMessage(q.label)}
                      >
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] p-3 text-sm leading-relaxed',
                        m.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
                          : 'bg-muted rounded-2xl rounded-bl-md'
                      )}
                    >
                      {m.role === 'assistant' ? (
                        <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-pre:my-1 prose-code:px-1 prose-code:py-0 prose-code:rounded prose-code:bg-background/40">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="whitespace-pre-wrap">{m.content}</span>
                      )}
                    </div>
                  </div>
                ))}
                {isSending && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md p-3">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '120ms' }} />
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60 animate-bounce" style={{ animationDelay: '240ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                {sendError && (
                  <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{sendError}</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              className="sticky bottom-0 border-t border-border bg-card/95 px-3 py-3 backdrop-blur"
            >
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder={t('ai.assistant.placeholder', 'Ask anything…')}
                  className={cn(
                    'flex-1 resize-none rounded-lg border border-input bg-background',
                    'px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    'min-h-[40px] max-h-[140px]'
                  )}
                  style={{ height: 'auto' }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
                  }}
                  disabled={isSending}
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!input.trim() || isSending}
                  className="h-10 w-10 p-0 shrink-0"
                  aria-label={t('ai.assistant.send', 'Send')}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-1.5 text-[10px] text-muted-foreground text-center">
                {t('ai.assistant.poweredByLong', 'Powered by Groq Llama 3.3 70B · ⌘+Enter to send')}
              </div>
            </form>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

export default AiChatPanel;
