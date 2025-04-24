'use client';

import { Globe, Menu } from 'lucide-react';
import Link from 'next/link';
import { buttonVariants } from './ui/button';
import { SheetTrigger, SheetContent, Sheet } from './ui/sheet';
import { useState } from 'react';
import { T } from 'gt-next';
import GithubIcon from './icons/github-icon';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <T id="components.header.0">
      <header className="sticky top-0 z-40 px-4 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between">
          <Link
            href="/"
            className="flex gap-2 items-center flex-nowrap no-underline font-bold"
          >
            <Globe className="h-6 w-6 text-accent4" />
            LangQuest
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
                  Source Code
                </Link>
                <div className="border-t my-2"></div>
                <Link
                  href="/database"
                  className={buttonVariants({ variant: 'outline' })}
                >
                  Full Database
                </Link>
                <Link
                  href="/data-view"
                  className={buttonVariants({
                    variant: 'secondary',
                    class: 'bg-accent1 hover:bg-accent1-hover text-white'
                  })}
                >
                  User-Friendly Database
                </Link>
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
              Full Database
            </Link>
            <Link
              href="/data-view"
              className={buttonVariants({ variant: 'secondary' })}
            >
              User-Friendly Database
            </Link>
          </nav>
        </div>
      </header>
    </T>
  );
};

export default Header;
