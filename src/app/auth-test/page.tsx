'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function AuthTestPage() {
  const { user, isLoading, signOut } = useAuth();

  return (
    <div className="container p-8 max-w-screen-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test Page</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p>Loading authentication state...</p>
          ) : user ? (
            <div className="space-y-4">
              <p>You are logged in as: {user.email}</p>
              <p>User ID: {user.id}</p>
              <div className="flex gap-4">
                <Button onClick={() => signOut()}>Sign Out</Button>
                <Link href="/admin">
                  <Button variant="outline">Go to Admin Dashboard</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p>You are not logged in.</p>
              <Link href="/login">
                <Button>Log In</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
