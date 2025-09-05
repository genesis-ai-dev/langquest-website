'use client';

import { useLoading } from './loading-provider';
import { useRouter } from 'next/navigation';
import { Link as NextLink, LinkProps as NextLinkProps } from '@/i18n/navigation';
import { ReactNode, MouseEvent } from 'react';

interface LoadingLinkProps extends Omit<NextLinkProps, 'onClick'> {
  children: ReactNode;
  loadingMessage?: string;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
}

export function LoadingLink({ 
  children, 
  loadingMessage = 'Loading...', 
  onClick,
  ...props 
}: LoadingLinkProps) {
  const { setLoadingMessage } = useLoading();
  const router = useRouter();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    // Call custom onClick if provided
    if (onClick) {
      onClick(e);
    }

    // Don't prevent default if there's a custom onClick that might want to handle it
    if (onClick && e.defaultPrevented) {
      return;
    }

    // Show loading state
    setLoadingMessage(loadingMessage);

    // Let Next.js handle the navigation
    // The loading state will be cleared when the new page mounts
  };

  return (
    <NextLink {...props} onClick={handleClick}>
      {children}
    </NextLink>
  );
}
