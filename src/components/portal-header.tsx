'use client';

import { Globe } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { UserProfile } from '@/components/user-profile';

interface PortalHeaderProps {
  user: any;
  onSignOut: () => void | Promise<void>;
}

export function PortalHeader({ user, onSignOut }: PortalHeaderProps) {
  return (
    <header className="sticky top-0 z-40 px-4 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto relative flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex gap-2 items-center flex-nowrap no-underline font-bold"
        >
          <Globe className="h-6 w-6 text-accent4" />
          <span className="font-bold text-xl">LangQuest</span>
        </Link>

        <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-6">
          <Link
            href="/portal"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Projects
          </Link>
          <Link
            href="/dashboard"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
        </nav>

        <div className="flex items-center gap-4">
          {user && <UserProfile user={user} onSignOut={onSignOut} />}
        </div>
      </div>
    </header>
  );
}
