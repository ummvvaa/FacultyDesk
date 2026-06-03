import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { GraduationCap, ExternalLink, Copy, Check, QrCode, X, LogIn } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { publicProfileApi } from '../api/users';

interface PublicProfileData {
  username: string;
  firstName?: string;
  lastName?: string;
  position?: string;
  academicTitle?: string;
  academicDegree?: string;
  researchAreas?: string;
  aiSummary?: string;
  profileDescription?: string;
  orcid?: string;
  scopusAuthorId?: string;
  googleScholarUrl?: string;
  englishLevel?: string;
  publications: Array<{
    title: string;
    authors: string;
    publicationYear?: number;
    journalName?: string;
    doi?: string;
    publicationType?: string;
    databaseType?: string;
    quartile?: string;
  }>;
  educations: Array<{
    degree?: string;
    institution?: string;
    specialty?: string;
    year?: number;
  }>;
  kkkReadinessPercentage?: number;
  kkkStatus?: string;
}

function getDisplayName(profile: PublicProfileData): string {
  if (profile.firstName && profile.lastName) {
    return `${profile.firstName} ${profile.lastName}`;
  }
  return profile.username;
}

function getInitials(profile: PublicProfileData): string {
  const name = getDisplayName(profile);
  const parts = name.split(/[\s.]/);
  return parts
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

const PublicProfile: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [showQr, setShowQr] = useState(false);

  const { data: profile, isLoading, isError } = useQuery<PublicProfileData>({
    queryKey: ['publicProfile', slug],
    queryFn: () => publicProfileApi.getProfile(slug!),
    retry: false,
  });

  const profileUrl = `${window.location.origin}/p/${slug}`;
  const qrUrl = `/api/public/profiles/${slug}/qr`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">{t('common.loading')}</div>
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <GraduationCap className="w-16 h-16 text-muted-foreground/40" />
        <h1 className="text-2xl font-bold">{t('publicProfile.notFound.title')}</h1>
        <p className="text-muted-foreground">{t('publicProfile.notFound.description')}</p>
        <Link to="/login">
          <Button variant="outline">
            <LogIn className="w-4 h-4 mr-2" />
            {t('publicProfile.loginToSystem')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center gap-3">
          <GraduationCap className="w-6 h-6 text-primary" />
          <span className="font-semibold text-sm">{t('publicProfile.headerTitle', 'Academic Portal')}</span>
          <div className="ml-auto">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                <LogIn className="w-4 h-4 mr-2" />
                {t('publicProfile.loginToSystem')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Hero */}
        <div className="flex flex-col sm:flex-row gap-6 items-start">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold shrink-0 border border-border">
            {getInitials(profile)}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{getDisplayName(profile)}</h1>
            {profile.academicTitle && (
              <p className="text-muted-foreground mt-1">{profile.academicTitle}</p>
            )}
            {profile.position && (
              <p className="text-muted-foreground">{profile.position}</p>
            )}
            {profile.academicDegree && (
              <Badge variant="secondary" className="mt-2">{profile.academicDegree}</Badge>
            )}
            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                {copied ? <Check className="w-4 h-4 mr-2 text-green-500" /> : <Copy className="w-4 h-4 mr-2" />}
                {copied ? t('publicProfile.copied') : t('publicProfile.copy')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowQr(true)}>
                <QrCode className="w-4 h-4 mr-2" />
                {t('publicProfile.qrCode')}
              </Button>
            </div>
          </div>
        </div>

        {/* About */}
        {(profile.aiSummary || profile.profileDescription) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('publicProfile.about')}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground leading-relaxed space-y-2">
              {profile.aiSummary && <p>{profile.aiSummary}</p>}
              {profile.profileDescription && profile.profileDescription !== profile.aiSummary && (
                <p>{profile.profileDescription}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Research Areas */}
        {profile.researchAreas && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('publicProfile.research')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {profile.researchAreas.split(/[,;]+/).map((area, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">{area.trim()}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Online Profiles */}
        {(profile.orcid || profile.scopusAuthorId || profile.googleScholarUrl) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('publicProfile.onlineProfiles')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {profile.orcid && (
                <a href={`https://orcid.org/${profile.orcid}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-3 h-3 mr-2" />
                    ORCID
                  </Button>
                </a>
              )}
              {profile.scopusAuthorId && (
                <a href={`https://www.scopus.com/authid/detail.uri?authorId=${profile.scopusAuthorId}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Scopus
                  </Button>
                </a>
              )}
              {profile.googleScholarUrl && (
                <a href={profile.googleScholarUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Google Scholar
                  </Button>
                </a>
              )}
            </CardContent>
          </Card>
        )}

        {/* Publications */}
        {profile.publications && profile.publications.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('publicProfile.publications')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {profile.publications.map((pub, i) => (
                <div key={i} className="text-sm border-l-2 border-primary/30 pl-3">
                  <p className="font-medium leading-snug">{pub.title}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{pub.authors}</p>
                  <div className="flex flex-wrap gap-2 mt-1 items-center">
                    {pub.publicationYear && (
                      <span className="text-xs text-muted-foreground">{pub.publicationYear}</span>
                    )}
                    {pub.journalName && (
                      <span className="text-xs text-muted-foreground italic">{pub.journalName}</span>
                    )}
                    {pub.databaseType && pub.databaseType !== 'OTHER' && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{pub.databaseType}</Badge>
                    )}
                    {pub.quartile && pub.quartile !== 'NONE' && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{pub.quartile}</Badge>
                    )}
                    {pub.doi && (
                      <a href={`https://doi.org/${pub.doi}`} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline">
                        DOI
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Education */}
        {profile.educations && profile.educations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('publicProfile.education')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {profile.educations.map((edu, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">{edu.year}</span>
                  {edu.degree && <span className="text-muted-foreground"> — {edu.degree}</span>}
                  {edu.institution && <span className="text-muted-foreground">, {edu.institution}</span>}
                  {edu.specialty && <span className="text-muted-foreground"> ({edu.specialty})</span>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* KKK Readiness */}
        {profile.kkkReadinessPercentage != null && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('publicProfile.kkkReadiness', 'ККК Готовность')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Progress value={profile.kkkReadinessPercentage} className="flex-1" />
                <span className="font-bold text-sm">{profile.kkkReadinessPercentage}%</span>
              </div>
              {profile.kkkStatus && (
                <p className="text-xs text-muted-foreground mt-2">{t('common.status', 'Статус')}: {profile.kkkStatus}</p>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16 py-8 text-center text-xs text-muted-foreground">
        <div className="flex items-center justify-center gap-2">
          <GraduationCap className="w-4 h-4" />
          <span>{t('publicProfile.footerNote', 'Academic Portal — Public Profile')}</span>
        </div>
      </footer>

      {/* QR Modal */}
      {showQr && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setShowQr(false)}>
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full text-center"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">{t('publicProfile.qrModalTitle')}</h2>
              <button onClick={() => setShowQr(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={qrUrl} alt="QR Code" className="w-48 h-48 mx-auto rounded-lg" />
            <p className="text-xs text-muted-foreground mt-3">{t('publicProfile.qrModalDescription')}</p>
            <p className="text-xs font-mono text-primary mt-1 break-all">{profileUrl}</p>
            <a href={qrUrl} download={`qr-${slug}.png`} className="mt-4 inline-block">
              <Button size="sm" variant="outline" className="w-full">
                {t('profile.publicProfile.downloadQr')}
              </Button>
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicProfile;
