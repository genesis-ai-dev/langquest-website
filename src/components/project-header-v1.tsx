'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Calendar,
  UserCheck,
  Folder,
  Users,
  File,
  Languages,
  Book,
  TableOfContents,
  ListOrdered
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/components/auth-provider';
import { ProjectDownloadButton } from './new-project-download-button';
import { ProjectMembersModal } from './new-project-members';

interface ProjectHeaderV1Props {
  project: any;
  userRole: 'owner' | 'admin' | 'member' | 'viewer';
  assetsCount: number;
  translationsCount: number;
}

export function ProjectHeaderV1({
  project,
  userRole,
  assetsCount,
  translationsCount
}: ProjectHeaderV1Props) {
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const { environment } = useAuth();
  const aclReorderHref = `/portal/acl-reorder?projectId=${project.id}${environment !== 'production' ? `&env=${environment}` : ''}`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl">{project.name}</CardTitle>
                <Badge
                  variant={
                    userRole === 'owner'
                      ? 'default'
                      : userRole === 'admin'
                        ? 'secondary'
                        : 'outline'
                  }
                >
                  <UserCheck className="h-3 w-3 mr-1" />
                  {userRole}
                </Badge>
              </div>
              {project.description && (
                <p className="text-muted-foreground">{project.description}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                asChild
                size="sm"
                variant="outline"
                className="flex items-center gap-2 border-amber-500/60 bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/80"
              >
                <Link href={aclReorderHref} className="flex items-center gap-2">
                  <ListOrdered className="h-4 w-4" />
                  Reorder & Export
                  <Badge
                    variant="outline"
                    className="ml-1 border-amber-500/60 text-[10px] px-1.5 py-0"
                  >
                    Beta
                  </Badge>
                </Link>
              </Button>
              <Button
                title="Members"
                size="sm"
                variant="outline"
                onClick={() => setIsMembersModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Users className="h-4 w-4 mr-2" />
                Members
              </Button>
              <ProjectDownloadButton projectId={project.id} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Target Language</h4>
              <p className="text-sm text-muted-foreground">
                {(project.target_language as any)?.english_name || 'Unknown'}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Template</h4>
              <Badge
                variant="default"
                className="text-xs flex items-center gap-1 first-letter:uppercase"
              >
                {project.template === 'bible' ? (
                  <>
                    <Book className="h-3 w-3" /> Bible
                  </>
                ) : (
                  <>
                    <TableOfContents className="h-3 w-3" />{' '}
                    <span className="first-letter:uppercase">
                      {project.template}
                    </span>
                  </>
                )}
              </Badge>
              {/* <p className="text-sm text-muted-foreground">
                {project.template || 'None'}
              </p> */}
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Privacy</h4>
              <Badge variant={project.private ? 'secondary' : 'default'}>
                {project.private ? 'Private' : 'Public'}
              </Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-2">Status</h4>
              <Badge variant={project.active ? 'default' : 'secondary'}>
                {project.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="text-right text-sm text-muted-foreground flex flex-col justify-end items-end">
              <div className="flex items-center gap-1 mb-1">
                <Calendar className="h-3 w-3" />
                Created: {new Date(project.created_at).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Updated: {new Date(project.last_updated).toLocaleDateString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards - Conteúdo em linha centralizado */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 bg-primary/10 rounded">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold">
                  {project.project_members?.length || 0}
                </span>
                <span className="text-sm text-muted-foreground">Members</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 bg-primary/10 rounded">
                <Folder className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold">
                  {project.quests?.length || 0}
                </span>
                <span className="text-sm text-muted-foreground">Quests</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 bg-primary/10 rounded">
                <File className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold">{assetsCount}</span>
                <span className="text-sm text-muted-foreground">Assets</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 bg-primary/10 rounded">
                <Languages className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold">{translationsCount}</span>
                <span className="text-sm text-muted-foreground">
                  Translations
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProjectMembersModal
        open={isMembersModalOpen}
        onOpenChange={setIsMembersModalOpen}
        projectId={project.id}
      />
    </div>
  );
}
