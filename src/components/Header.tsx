'use client';

import { Globe, Menu } from 'lucide-react';
import Link from 'next/link';
import { Button } from './ui/button';
import { SheetTrigger, SheetContent, Sheet } from './ui/sheet';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [DEV_ADMIN_MODE, setDEV_ADMIN_MODE] = useState(false);
  const [logoClickCount, setLogoClickCount] = useState(0);

  // Check localStorage for devAdmin flag when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const devAdmin = localStorage.getItem('devAdmin');
      console.log('Initial devAdmin value from localStorage:', devAdmin);
      if (devAdmin === 'true') {
        setDEV_ADMIN_MODE(true);
        console.log('DEV_ADMIN_MODE set to true');
      }
    }
  }, []);

  // Handle logo clicks to toggle dev admin mode
  const handleLogoClick = () => {
    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);
    console.log('Logo click count:', newCount);

    // If clicked 5 times in succession, toggle dev admin mode
    if (newCount >= 5) {
      const newDevAdminMode = !DEV_ADMIN_MODE;
      console.log('Toggling DEV_ADMIN_MODE to:', newDevAdminMode);
      setDEV_ADMIN_MODE(newDevAdminMode);
      localStorage.setItem('devAdmin', newDevAdminMode.toString());
      setLogoClickCount(0);
      toast.success(`Admin mode ${newDevAdminMode ? 'enabled' : 'disabled'}`);
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
          className="flex gap-2 items-center flex-nowrap no-underline"
          onClick={handleLogoClick}
        >
          <Globe className="h-6 w-6 text-accent1" />
          <span className="font-bold text-xl">LangQuest</span>
          {DEV_ADMIN_MODE && (
            <span className="ml-2 text-xs px-1.5 py-0.5 bg-amber-200 text-amber-800 rounded-full">
              Admin
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
                href="/data-policy"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Open Data Policy
              </Link>
              <Link
                href="https://github.com/genesis-ai-dev/langquest"
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Source Code
              </Link>
              <div className="border-t my-2"></div>
              <Link href="/database">
                <Button variant="outline" className="w-full">
                  Full Database
                </Button>
              </Link>
              <Link href="/data-view">
                <Button className="w-full bg-accent1 hover:bg-accent1-hover text-white">
                  User-Friendly Database
                </Button>
              </Link>
              {DEV_ADMIN_MODE && (
                <Link href="/admin">
                  <Button variant="outline" className="w-full mt-2">
                    Admin Dashboard
                  </Button>
                </Link>
              )}
            </nav>
          </SheetContent>
        </Sheet>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 gap-4">
          <Link
            href="/data-policy"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Open Data Policy
          </Link>
          <Link
            href="https://github.com/genesis-ai-dev/langquest"
            target="_blank"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Source Code
          </Link>
          <div className="border-l h-6 mx-2"></div>
          <Link href="/database">
            <Button variant="outline">Full Database</Button>
          </Link>
          <Link href="/data-view">
            <Button className="bg-accent1 hover:bg-accent1-hover text-white">
              User-Friendly Database
            </Button>
          </Link>
          {DEV_ADMIN_MODE && (
            <Link href="/admin">
              <Button variant="outline">Admin</Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
