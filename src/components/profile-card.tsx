'use client';

import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader
} from '@/components/ui/card';
import { CustomAvatar } from '@/components/custom-avatar';
import { cn } from '@/lib/utils';

interface ProfileCardProps {
  fullName: string;
  email: string;
  avatarUrl?: string;
  className?: string;
  onSignOut?: () => void;
}

export function ProfileCard({
  fullName,
  email,
  avatarUrl,
  className,
  onSignOut
}: ProfileCardProps) {
  return (
    <Card className={cn('absolute z-50 w-full max-w-xs m-2 top-0', className)}>
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <CustomAvatar fullName={fullName} avatarUrl={avatarUrl} size="2xl" />
        </div>
      </CardHeader>

      <CardContent className="text-center space-y-2">
        <h3 className="text-lg font-semibold">{fullName}</h3>
        <p className="text-sm text-muted-foreground">{email}</p>
      </CardContent>

      <CardFooter>
        <Button variant="outline" className="w-full" onClick={onSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </CardFooter>
    </Card>
  );
}
