'use client';

import { Suspense, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Spinner } from '@/components/spinner';
import { PortalHeader } from '@/components/portal-header';
import { AclReorderView } from '@/components/acl-reorder/AclReorderView';

export default function AclReorderPage() {
  return (
    <Suspense
      fallback={
        <div className="container p-8 max-w-screen-xl mx-auto flex justify-center">
          <Spinner />
        </div>
      }
    >
      <AclReorderPageContent />
    </Suspense>
  );
}

function AclReorderPageContent() {
  const { user, isLoading, signOut } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = `/login?redirectTo=${encodeURIComponent('/portal/acl-reorder')}`;
    }
  }, [user, isLoading]);

  if (isLoading) {
    return (
      <div className="container p-8 max-w-screen-xl mx-auto flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader user={user} onSignOut={signOut} />
      <div className="container p-4 sm:p-6 max-w-screen-xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold mb-2">
          ACL Order Reorder
        </h1>
        <p className="text-muted-foreground mb-4 sm:mb-6 text-sm sm:text-base">
          Reorder asset content links within each asset. Select a project and
          quest to get started.
        </p>
        <AclReorderView />
      </div>
    </div>
  );
}
