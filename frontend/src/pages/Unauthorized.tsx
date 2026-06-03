import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldOff } from 'lucide-react';
import { Button } from '../components/ui/button';

const Unauthorized: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-4">
        <ShieldOff className="w-16 h-16 mx-auto text-destructive opacity-60" />
        <h1 className="text-2xl font-bold">{t('unauthorized.title')}</h1>
        <p className="text-muted-foreground">{t('unauthorized.message')}</p>
        <Button asChild>
          <Link to="/">{t('unauthorized.goHome')}</Link>
        </Button>
      </div>
    </div>
  );
};

export default Unauthorized;
