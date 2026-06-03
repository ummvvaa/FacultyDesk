import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { GraduationCap, LogIn, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { authApi } from '../api/auth';

const Login: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Forgot password dialog
  const [fpOpen, setFpOpen] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpReason, setFpReason] = useState('');
  const [fpSubmitting, setFpSubmitting] = useState(false);
  const [fpError, setFpError] = useState('');
  const [fpSuccess, setFpSuccess] = useState(false);

  const openForgot = () => {
    setFpEmail('');
    setFpReason('');
    setFpError('');
    setFpSuccess(false);
    setFpOpen(true);
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFpError('');
    if (!fpEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fpEmail.trim())) {
      setFpError(t('auth.forgotPasswordDlg.emailInvalid'));
      return;
    }
    if (fpReason.trim().length < 5) {
      setFpError(t('auth.forgotPasswordDlg.reasonTooShort'));
      return;
    }
    setFpSubmitting(true);
    try {
      await authApi.forgotPassword(fpEmail.trim(), fpReason.trim());
      setFpSuccess(true);
      setTimeout(() => setFpOpen(false), 2000);
    } catch (err: any) {
      setFpError(err.response?.data?.error || err.message || t('common.error'));
    } finally {
      setFpSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || t('auth.invalidCredentials');
      setError(errorMessage);
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left — form */}
      <div className="flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
          {/* Logo + project name */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <span className="text-base font-semibold tracking-tight">
              {t('sidebar.departmentName')}
            </span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">{t('auth.welcomeBack')}</h1>
            <p className="text-sm text-muted-foreground mt-2">{t('auth.signInSubtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {reason === 'session_expired' && (
              <div className="flex items-start gap-2 p-3 text-sm text-warning bg-warning/10 border border-warning/20 rounded-md">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{t('login.sessionExpired')}</span>
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium block">{t('auth.username')}</label>
              <Input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium block">{t('auth.password')}</label>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  onClick={openForgot}
                >
                  {t('auth.forgotPassword')}
                </button>
              </div>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" size="lg" className="w-full gap-2" disabled={loading}>
              <LogIn className="w-4 h-4" />
              {loading ? t('common.loading') : t('common.login')}
            </Button>
          </form>

          <p className="text-xs text-muted-foreground mt-10 text-center">
            {t('auth.footerHint')}
          </p>
        </motion.div>
      </div>

      {/* Right — decorative */}
      <div className="hidden lg:flex items-center justify-center relative overflow-hidden border-l border-border bg-gradient-to-br from-primary/[0.03] via-background to-primary/[0.06]">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(to right, hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative flex flex-col items-center"
        >
          <div className="relative">
            <div className="absolute inset-0 blur-3xl bg-primary/20 rounded-full" />
            <div className="relative w-44 h-44 rounded-3xl bg-card border border-border shadow-md flex items-center justify-center">
              <GraduationCap className="w-24 h-24 text-primary" strokeWidth={1.2} />
            </div>
          </div>
          <div className="mt-10 max-w-sm text-center">
            <h2 className="text-2xl font-bold tracking-tight">
              {t('auth.heroTitle')}
            </h2>
            <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
              {t('auth.heroSubtitle')}
            </p>
          </div>
        </motion.div>
      </div>

      <Dialog open={fpOpen} onOpenChange={setFpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('auth.forgotPasswordDlg.title')}</DialogTitle>
            <DialogDescription>{t('auth.forgotPasswordDlg.description')}</DialogDescription>
          </DialogHeader>
          {fpSuccess ? (
            <div className="p-3 text-sm bg-success/10 text-success border border-success/20 rounded-md">
              {t('auth.forgotPasswordDlg.success')}
            </div>
          ) : (
            <form onSubmit={handleForgotSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="fp-email">{t('auth.forgotPasswordDlg.emailLabel')}</Label>
                <Input
                  id="fp-email"
                  type="email"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="fp-reason">{t('auth.forgotPasswordDlg.reasonLabel')}</Label>
                <Textarea
                  id="fp-reason"
                  value={fpReason}
                  onChange={(e) => setFpReason(e.target.value)}
                  rows={3}
                  placeholder={t('auth.forgotPasswordDlg.reasonPlaceholder')}
                />
              </div>
              {fpError && <p className="text-sm text-destructive">{fpError}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setFpOpen(false)} disabled={fpSubmitting}>
                  {t('auth.forgotPasswordDlg.cancel')}
                </Button>
                <Button type="submit" disabled={fpSubmitting}>
                  {t('auth.forgotPasswordDlg.submit')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
