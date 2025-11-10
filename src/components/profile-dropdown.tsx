'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { ProfileCard } from '@/components/profile-card';
import { CustomAvatar } from '@/components/custom-avatar';
import { cn } from '@/lib/utils';

interface ProfileDropdownProps {
  fullName: string;
  email: string;
  avatarUrl?: string;
  className?: string;
  onSignOut?: () => void;
}

export function ProfileDropdown({
  fullName,
  email,
  avatarUrl,
  className,
  onSignOut
}: ProfileDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'relative rounded-full transition-all hover:ring-2 hover:ring-ring hover:ring-offset-2 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            className
          )}
          aria-label="Open profile menu"
        >
          <CustomAvatar
            fullName={fullName}
            avatarUrl={avatarUrl}
            size="md"
            className="cursor-pointer"
          />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <ProfileCard
          fullName={fullName}
          email={email}
          avatarUrl={avatarUrl}
          onSignOut={onSignOut}
          className="relative border-0 shadow-none w-full max-w-none m-0"
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
