import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Sparkles, Send, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { assistantApi } from '../../api/assistant';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const KkkTutorPanel: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const locale = i18n.language === 'en' ? 'en' : 'ru';

  const suggestedKeys = [
    'kkkRequirements',
    'confirmDocs',
    'scopusCount',
    'qualificationRequirements',
  ] as const;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || thinking) return;

    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    setThinking(true);
    setError(null);

    try {
      const { answer } = await assistantApi.askKkkTutor(question, locale);
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { status?: number; data?: { error?: string; message?: string } } };
      if (axiosErr?.response?.status === 503 && axiosErr?.response?.data?.error === 'AiUnavailable') {
        const msg = axiosErr.response?.data?.message || t('kkk.tutor.error');
        setMessages((prev) => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }]);
      } else {
        setError(t('kkk.tutor.error'));
      }
    } finally {
      setThinking(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const handleTextareaInput = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 80)}px`;
  };

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="text-base font-semibold">{t('kkk.tutor.title')}</span>
          <Badge variant="outline" className="text-xs">
            {t('kkk.tutor.badge')}
          </Badge>
        </div>
        {messages.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-muted-foreground h-7 px-2"
            onClick={() => setMessages([])}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            {t('kkk.tutor.clear')}
          </Button>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Suggested chips — only when no messages */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestedKeys.map((key) => (
              <button
                key={key}
                className="text-xs px-3 py-1.5 rounded-full border bg-muted hover:bg-muted/80 hover:border-muted-foreground/40 transition-colors disabled:opacity-50"
                onClick={() => send(t(`kkk.tutor.suggestedQuestions.${key}`))}
                disabled={thinking}
              >
                {t(`kkk.tutor.suggestedQuestions.${key}`)}
              </button>
            ))}
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1 scrollbar-thin">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary/10 rounded-br-sm'
                      : 'bg-muted rounded-bl-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {/* Thinking indicator */}
            {thinking && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm px-3 py-2 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive text-center">{error}</p>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              handleTextareaInput();
            }}
            onKeyDown={handleKeyDown}
            placeholder={t('kkk.tutor.askPlaceholder')}
            rows={1}
            className="resize-none min-h-[36px] py-2 text-sm"
            disabled={thinking}
          />
          <Button
            size="sm"
            className="shrink-0 h-9 w-9 p-0"
            onClick={() => send(input)}
            disabled={!input.trim() || thinking}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default KkkTutorPanel;
