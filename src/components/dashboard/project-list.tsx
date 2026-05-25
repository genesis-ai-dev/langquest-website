'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Spinner } from '@/components/spinner';
import {
  ProjectListCard,
  type ProjectListItem
} from '@/components/dashboard/project-list-card';

type ProjectListApiResponse = {
  profile_id: string;
  items: ProjectListItem[];
  pagination: {
    limit: number;
    offset: number;
    total: number;
    has_more: boolean;
  };
};

export function ProjectList() {
  const { session, isLoading } = useAuth();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameFilter, setNameFilter] = useState('');

  useEffect(() => {
    if (isLoading || !session?.access_token) return;
    const accessToken = session.access_token;

    let cancelled = false;

    async function fetchProjects() {
      try {
        setIsFetching(true);
        setError(null);

        const response = await fetch(
          '/api/dashboard/projectlist?limit=30&offset=0',
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
          }
        );

        if (!response.ok) {
          const errorPayload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(errorPayload?.error || 'Failed to load project list');
        }

        const payload = (await response.json()) as ProjectListApiResponse;
        if (!cancelled) {
          setProjects(payload.items || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load project list'
          );
        }
      } finally {
        if (!cancelled) {
          setIsFetching(false);
        }
      }
    }

    void fetchProjects();
    return () => {
      cancelled = true;
    };
  }, [isLoading, session?.access_token]);

  const filteredProjects = useMemo(() => {
    const term = nameFilter.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter((project) =>
      project.project_name.toLowerCase().includes(term)
    );
  }, [nameFilter, projects]);

  return (
    <section className="w-full space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold uppercase tracking-wide">
          Projects List
        </h2>
        <p className="text-sm text-muted-foreground">
          Browse owner projects and track completion and production metrics.
        </p>
      </div>

      <Input
        type="text"
        value={nameFilter}
        onChange={(event) => setNameFilter(event.target.value)}
        placeholder="Filter by project name"
        className="w-full"
      />

      {isFetching ? (
        <div className="w-full py-8 flex justify-center">
          <Spinner className="h-5 w-5 text-foreground" />
        </div>
      ) : error ? (
        <Card className="w-full border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base">Failed to load projects</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : filteredProjects.length === 0 ? (
        <Card className="w-full">
          <CardHeader>
            <CardTitle className="text-base">No projects found</CardTitle>
            <CardDescription>
              Try another name in the filter or clear the search.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ScrollArea className="w-full h-[450px] pr-3">
          <div className="space-y-2">
            {filteredProjects.map((project) => (
              <ProjectListCard key={project.id} project={project} />
            ))}
          </div>
        </ScrollArea>
      )}
    </section>
  );
}

export default ProjectList;
