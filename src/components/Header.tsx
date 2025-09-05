'use client';

import { Globe, Menu, UserRound, LogOut } from 'lucide-react';
import { buttonVariants, Button } from './ui/button';
import { SheetTrigger, SheetContent, Sheet } from './ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from './ui/dropdown-menu';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import GithubIcon from './icons/github-icon';
import { cn } from '@/lib/utils';
import { Link } from '@/i18n/navigation';
import { LoadingLink } from './loading-link';
import { useTranslations } from 'next-intl';
import { useAuth } from './auth-provider';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [DEV_ADMIN_MODE, setDEV_ADMIN_MODE] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);
  const t = useTranslations('header');
  const { user, environment, signOut } = useAuth();

  // Environment color mapping
  const envColors = {
    production: 'border-green-500',
    preview: 'border-yellow-500',
    development: 'border-blue-500'
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

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
    <header className="sticky top-0 z-40 px-4 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
              <LoadingLink
                href="/database"
                className={buttonVariants({ variant: 'outline' })}
                loadingMessage="Loading database viewer..."
              >
                {t('allData')}
              </LoadingLink>
              <LoadingLink
                href="/data-view"
                className={buttonVariants({
                  variant: 'secondary',
                  class: 'bg-accent1 hover:bg-accent1-hover text-white'
                })}
                loadingMessage="Loading user-friendly data..."
              >
                {t('userFriendlyData')}
              </LoadingLink>
              {(!!user || DEV_ADMIN_MODE) && (
                <LoadingLink href="/admin" loadingMessage="Loading project management...">
                  <Button variant="outline" className="w-full mt-2">
                    {!!user ? 'Project Management' : t('adminDashboard')}
                  </Button>
                </LoadingLink>
              )}
              {!user && !DEV_ADMIN_MODE && (
                <Link href="/login">
                  <Button variant="outline" className="w-full mt-2">
                    Login
                  </Button>
                </Link>
              )}
              {user && (
                <div className="mt-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                          'w-10 h-10 rounded-full border-2',
                          envColors[environment]
                        )}
                      >
                        <UserRound className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem disabled>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.email}</span>
                          <span className="text-xs text-muted-foreground capitalize">
                            {environment} environment
                          </span>
                        </div>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
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
          <LoadingLink
            href="/database"
            className={buttonVariants({ variant: 'outline' })}
            loadingMessage="Loading database viewer..."
          >
            {t('allData')}
          </LoadingLink>
          <LoadingLink
            href="/data-view"
            className={cn(
              buttonVariants({
                variant: 'secondary'
              }),
              'bg-accent4 text-white hover:bg-accent4/90'
            )}
            loadingMessage="Loading user-friendly data..."
          >
            {t('userFriendlyData')}
          </LoadingLink>
          {(!!user || DEV_ADMIN_MODE) && (
            <LoadingLink href="/admin" loadingMessage="Loading project management...">
              <Button variant="outline">
                {!!user ? 'Project Management' : t('admin')}
              </Button>
            </LoadingLink>
          )}
          {!user && !DEV_ADMIN_MODE && (
            <Link href="/login">
              <Button variant="outline">Login</Button>
            </Link>
          )}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    'w-10 h-10 rounded-full border-2',
                    envColors[environment]
                  )}
                >
                  <UserRound className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.email}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      {environment} environment
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
