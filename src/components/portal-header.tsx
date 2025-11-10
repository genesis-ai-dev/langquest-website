'use client';

import { Globe } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { EnvironmentBadge } from '@/components/environment-badge';
import { UserProfile } from '@/components/user-profile';
import { SupabaseEnvironment } from '@/lib/supabase';

interface PortalHeaderProps {
  environment: SupabaseEnvironment;
  user: any;
  onSignOut: () => void | Promise<void>;
}

export function PortalHeader({
  environment,
  user,
  onSignOut
}: PortalHeaderProps) {
  return (
    <header className="sticky top-0 z-40 px-4 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between">
        <Link
          href="/"
          className="flex gap-2 items-center flex-nowrap no-underline font-bold"
        >
          <Globe className="h-6 w-6 text-accent4" />
          <span className="font-bold text-xl">LangQuest</span>
        </Link>

        <div className="flex items-center gap-4">
          <EnvironmentBadge environment={environment} />
          {user && <UserProfile user={user} onSignOut={onSignOut} />}
        </div>
      </div>
    </header>
  );
}
