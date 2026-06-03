import React, { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import AiChatPanel from './AiChatPanel';
import { cn } from '../../lib/utils';

const AiChatButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            aria-label={t('ai.assistant.chatTitle', 'AI Assistant')}
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={cn(
              'fixed bottom-6 right-6 z-50',
              'h-14 w-14 rounded-full',
              'bg-primary text-primary-foreground',
              'shadow-lg shadow-primary/30',
              'flex items-center justify-center',
              'hover:scale-105 hover:brightness-110 active:scale-95',
              'transition-all duration-200',
              'ring-1 ring-primary/50'
            )}
          >
            <span className="absolute inset-0 rounded-full bg-primary/40 animate-ping opacity-60" />
            <Sparkles className="relative h-6 w-6" strokeWidth={2} />
          </motion.button>
        )}
      </AnimatePresence>
      <AiChatPanel open={open} onClose={() => setOpen(false)} />
    </>
  );
};

export default AiChatButton;
