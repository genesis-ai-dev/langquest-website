'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface CustomAvatarProps {
  fullName: string;
  avatarUrl?: string;
  size?: AvatarSize;
  className?: string;
}

export function CustomAvatar({
  fullName,
  avatarUrl,
  size = 'md',
  className
}: CustomAvatarProps) {
  // Get initials from full name for avatar fallback
  const getInitials = (name: string) => {
    const words = name
      .trim()
      .split(' ')
      .filter((word) => word.length > 0);

    if (words.length > 1) {
      // Multiple words: use first letter of first two words
      return words
        .map((word) => word.charAt(0).toUpperCase())
        .slice(0, 2)
        .join('');
    } else {
      // Single word: use first two letters
      const singleWord = words[0] || '';
      return singleWord.substring(0, 2).toUpperCase();
    }
  };

  // Define size classes
  const sizeClasses = {
    sm: 'size-6',
    md: 'size-8',
    lg: 'size-12',
    xl: 'size-16',
    '2xl': 'size-20'
  };

  // Define text size classes for initials
  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
    '2xl': 'text-lg'
  };

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      <AvatarImage src={avatarUrl} alt={fullName} />
      <AvatarFallback className={textSizeClasses[size]}>
        {getInitials(fullName)}
      </AvatarFallback>
    </Avatar>
  );
}
