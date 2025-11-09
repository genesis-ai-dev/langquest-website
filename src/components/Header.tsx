'use client';

import { Globe, Menu } from 'lucide-react';
import { buttonVariants, Button } from './ui/button';
import { SheetTrigger, SheetContent, Sheet } from './ui/sheet';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import GithubIcon from './icons/github-icon';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from './auth-provider';
import { Separator } from '@/components/ui/separator';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [DEV_ADMIN_MODE, setDEV_ADMIN_MODE] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const t = useTranslations('header');
  const { user } = useAuth();

  // Check localStorage for devAdmin flag when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const devAdmin = localStorage.getItem('devAdmin');
      if (devAdmin === 'true') {
        setDEV_ADMIN_MODE(true);
      }
    }
  }, []);

  // Handle logo clicks to toggle dev admin mode
  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);

    // If clicked 5 times in succession, toggle dev admin mode
    if (newCount >= 5) {
      const newDevAdminMode = !DEV_ADMIN_MODE;
      setDEV_ADMIN_MODE(newDevAdminMode);
      localStorage.setItem('devAdmin', newDevAdminMode.toString());
      setLogoClickCount(0);
      toast.success(
        t('adminMode', {
          status: newDevAdminMode ? t('enabled') : t('disabled')
        })
      );
    }

    // Reset count after 2 seconds of inactivity
    setTimeout(() => {
      setLogoClickCount(0);
    }, 2000);
  };

  return (
    <header className="sticky top-0 z-40 px-4 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex gap-2 items-center flex-nowrap no-underline font-bold"
          onClick={handleLogoClick}
        >
          <Globe className="h-6 w-6 text-accent4" />
          <span className="font-bold text-xl">{t('title')}</span>
          {DEV_ADMIN_MODE && (
            <span className="ml-2 text-xs px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded-full">
              {t('admin')}
            </span>
          )}
        </Link>

        {/* Mobile Menu Button */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild>
            <button className="md:hidden p-2">
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent>
            <nav className="flex flex-col space-y-2 p-4 mt-12">
              <Link
                href="https://github.com/genesis-ai-dev/langquest"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {t('sourceCode')}
              </Link>
              <div className="border-t my-2"></div>
              <Link
                href="/database"
                className={buttonVariants({ variant: 'outline' })}
              >
                {t('allData')}
              </Link>
              <Link
                href="/data-view"
                className={buttonVariants({
                  variant: 'secondary',
                  class: 'bg-accent1 hover:bg-accent1-hover text-white'
                })}
              >
                {t('userFriendlyData')}
              </Link>
              {(!!user || DEV_ADMIN_MODE) && (
                <Link href="/portal">
                  <Button variant="outline" className="w-full mt-2">
                    {!!user ? 'Project Management' : t('adminDashboard')}
                  </Button>
                </Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <Link
            href="https://github.com/genesis-ai-dev/langquest"
            target="_blank"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <GithubIcon />
          </Link>
          <Link
            href="/database"
            className={buttonVariants({ variant: 'outline' })}
          >
            {t('allData')}
          </Link>
          <Link
            href="/data-view"
            className={cn(
              buttonVariants({
                variant: 'secondary'
              }),
              'bg-accent4 text-white hover:bg-accent4/90'
            )}
          >
            {t('userFriendlyData')}
          </Link>

          <Separator orientation="vertical" className="h-6 w-2 bg-gray-600" />

          <Link href="/portal">
            <Button variant="outline">{t('goToUserArea')}</Button>
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
