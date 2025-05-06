'use client';

import { Globe } from 'lucide-react';
import GithubIcon from './icons/github-icon';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

const Footer = () => {
  const t = useTranslations('footer');

  return (
    <footer className="w-full py-6 md:py-0 border-t">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row">
        <div className="flex gap-2 items-center">
          <Globe className="h-5 w-5 text-accent4" />
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            © {new Date().getFullYear()} LangQuest.{' '}
            <Link
              href="https://github.com/genesis-ai-dev/langquest/blob/main/LICENSE"
              target="_blank"
              className="text-muted-foreground hover:text-foreground"
            >
              {t('mitLicense')}
            </Link>
            .
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/terms"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t('terms')}
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t('privacy')}
          </Link>
          <Link
            href="https://frontierrnd.com"
            target="_blank"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {t('frontierRND')}
          </Link>
          <Link
            href="https://github.com/genesis-ai-dev/langquest"
            aria-label="LangQuest GitHub Repository"
            target="_blank"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <GithubIcon />
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
