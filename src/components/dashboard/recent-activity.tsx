'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityCard,
  type RecentActivityItem
} from '@/components/dashboard/activity-card';
import { Spinner } from '@/components/spinner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

type RecentActivityResponse = {
  data: RecentActivityItem[];
};

type RecentActivityProps = {
  accessToken?: string;
  projectId?: string;
};

export function RecentActivity({
  accessToken,
  projectId
}: RecentActivityProps) {
  const [activities, setActivities] = useState<RecentActivityItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken) return;

    let cancelled = false;

    async function fetchActivities() {
      try {
        setIsFetching(true);
        setError(null);

        const url = projectId
          ? `/api/dashboard/activity?project_id=${encodeURIComponent(projectId)}`
          : '/api/dashboard/activity';

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(
            errorPayload?.error || 'Failed to load recent activity'
          );
        }

        const payload = (await response.json()) as RecentActivityResponse;
        if (!cancelled) {
          setActivities(payload.data ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load recent activity'
          );
          setActivities([]);
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    }

    void fetchActivities();

    return () => {
      cancelled = true;
    };
  }, [accessToken, projectId]);

  const content = useMemo(() => {
    if (isFetching) {
      return (
        <div className="h-64 flex items-center justify-center">
          <Spinner className="h-5 w-5 text-foreground" />
        </div>
      );
    }

    if (error) {
      return <p className="text-sm text-destructive">{error}</p>;
    }

    if (!activities.length) {
      return (
        <p className="text-sm text-muted-foreground">
          No recent activity found in the selected timeframe.
        </p>
      );
    }

    return (
      <ScrollArea className="h-[500px] pr-3">
        <div className="space-y-3 flex flex-col gap-x-0.5">
          {activities.map((activity, index) => (
            <ActivityCard
              key={`${activity.project_id}-${activity.source}-${activity.user.id}-${activity.date_time}-${index}`}
              activity={activity}
            />
          ))}
        </div>
      </ScrollArea>
    );
  }, [activities, error, isFetching]);

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader>
        <CardTitle className="uppercase tracking-wide">
          Recent Activity
        </CardTitle>
        <CardDescription>Latest updates across your projects.</CardDescription>
      </CardHeader>
      <CardContent>{content}</CardContent>
    </Card>
  );
}
