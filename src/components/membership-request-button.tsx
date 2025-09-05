'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, UserPlus, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

interface MembershipRequestButtonProps {
  projectId: string;
  projectName: string;
  className?: string;
}

interface MembershipRequest {
  id: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
  count: number;
  last_updated: string;
}

export function MembershipRequestButton({
  projectId,
  projectName,
  className
}: MembershipRequestButtonProps) {
  const { user, environment } = useAuth();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const t = useTranslations('membership_request');

  // Fetch existing membership request
  const { data: existingRequest, isLoading } = useQuery({
    queryKey: ['membership-request', projectId, user?.id, environment],
    queryFn: async () => {
      if (!user?.id || !environment) return null;

      const response = await fetch(
        `/api/requests?projectId=${projectId}&environment=${environment}`
      );
      
      if (!response.ok) {
        if (response.status === 401) return null;
        throw new Error('Failed to fetch membership request');
      }
      
      return await response.json();
    },
    enabled: !!user?.id && !!environment
  });

  const handleRequestMembership = async () => {
    if (!user?.id || !environment) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          environment
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('errors.failedToSend'));
      }

      // Invalidate and refetch the request data
      await queryClient.invalidateQueries({
        queryKey: ['membership-request', projectId, user.id, environment]
      });

      toast.success(t('success.requestSent'));
    } catch (error) {
      console.error('Error requesting membership:', error);
      toast.error(error instanceof Error ? error.message : t('errors.failedToSend'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawRequest = async () => {
    if (!existingRequest?.id || !environment) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/requests/${existingRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'withdrawn',
          environment
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('errors.failedToWithdraw'));
      }

      // Invalidate and refetch the request data
      await queryClient.invalidateQueries({
        queryKey: ['membership-request', projectId, user?.id, environment]
      });

      toast.success(t('success.requestWithdrawn'));
    } catch (error) {
      console.error('Error withdrawing membership request:', error);
      toast.error(error instanceof Error ? error.message : t('errors.failedToWithdraw'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestAgain = async () => {
    if (!user?.id || !environment) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          projectId,
          environment
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('errors.failedToSend'));
      }

      // Invalidate and refetch the request data
      await queryClient.invalidateQueries({
        queryKey: ['membership-request', projectId, user.id, environment]
      });

      toast.success(t('success.requestSentAgain'));
    } catch (error) {
      console.error('Error requesting membership:', error);
      toast.error(error instanceof Error ? error.message : t('errors.failedToSend'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled className={className}>
        Loading...
      </Button>
    );
  }

  if (!user) {
    return null; // Don't show button if user is not logged in
  }

  // Check if request is expired (older than 7 days)
  const isExpired = existingRequest && 
    new Date(existingRequest.last_updated).getTime() < 
    (Date.now() - 7 * 24 * 60 * 60 * 1000);

  const getRequestStatus = () => {
    if (!existingRequest) return null;
    
    if (existingRequest.status === 'pending' && isExpired) {
      return 'expired';
    }
    
    return existingRequest.status;
  };

  const currentStatus = getRequestStatus();

  switch (currentStatus) {
    case 'pending':
      return (
        <div className="flex flex-col gap-1">
          <div className="text-xs text-green-600 font-medium">
            ✓ Request Sent
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleWithdrawRequest();
            }}
            disabled={isSubmitting}
            className={className}
          >
            <X className="h-4 w-4 mr-2" />
            {isSubmitting ? t('withdrawing') : t('withdrawRequest')}
          </Button>
        </div>
      );

    case 'expired': {
      const attemptsLeft = 4 - (existingRequest?.count || 0);
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (attemptsLeft > 0) handleRequestAgain();
          }}
          disabled={isSubmitting || attemptsLeft <= 0}
          className={className}
        >
          <X className="h-4 w-4 mr-2" />
          {attemptsLeft > 0 
            ? `${isSubmitting ? t('requesting') : t('requestAgain')} (${t('attemptsLeft', { count: attemptsLeft })})`
            : t('noAttemptsLeft')
          }
        </Button>
      );
    }

    case 'declined': {
      const attemptsLeft = 3 - (existingRequest?.count || 0);
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            if (attemptsLeft > 0) handleRequestAgain();
          }}
          disabled={isSubmitting || attemptsLeft <= 0}
          className={className}
        >
          <X className="h-4 w-4 mr-2" />
          {attemptsLeft > 0 
            ? `${isSubmitting ? t('requesting') : t('requestAgain')} (${t('attemptsLeft', { count: attemptsLeft })})`
            : t('noAttemptsLeft')
          }
        </Button>
      );
    }

    case 'withdrawn':
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleRequestMembership();
          }}
          disabled={isSubmitting}
          className={className}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {isSubmitting ? t('requesting') : t('requestMembership')}
        </Button>
      );

    default:
      // No existing request
      return (
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            handleRequestMembership();
          }}
          disabled={isSubmitting}
          className={className}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          {isSubmitting ? t('requesting') : t('requestMembership')}
        </Button>
      );
  }
}