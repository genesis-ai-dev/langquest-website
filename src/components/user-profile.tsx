'use client';

import { User } from '@supabase/supabase-js';
import { ProfileDropdown } from '@/components/profile-dropdown';

interface UserProfileProps {
  user: User;
  onSignOut?: () => void;
  className?: string;
}

export function UserProfile({ user, onSignOut, className }: UserProfileProps) {
  // Extract user information
  const fullName =
    user.user_metadata?.username || user.email?.split('@')[0] || 'User';
  const email = user.email || '';
  const avatarUrl =
    user.user_metadata?.avatar_url || user.user_metadata?.picture || '';

  return (
    <ProfileDropdown
      fullName={fullName}
      email={email}
      avatarUrl={avatarUrl}
      onSignOut={onSignOut}
      className={className}
    />
  );
}
