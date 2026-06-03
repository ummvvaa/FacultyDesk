import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, FileQuestion } from 'lucide-react';
import { Button } from '../components/ui/button';

const NotFound: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <FileQuestion className="w-20 h-20 text-muted-foreground mb-4" />
      <p className="text-8xl font-bold text-muted-foreground/30 mb-2">404</p>
      <h1 className="text-2xl font-bold mb-2">{t('notFound.title')}</h1>
      <p className="text-muted-foreground mb-6 max-w-sm">{t('notFound.description')}</p>
      <Button asChild>
        <Link to="/"><Home className="w-4 h-4 mr-2" />{t('notFound.goHome')}</Link>
      </Button>
    </div>
  );
};

export default NotFound;
