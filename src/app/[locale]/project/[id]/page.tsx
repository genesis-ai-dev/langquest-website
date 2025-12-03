'use client';

import { Suspense, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { Spinner } from '@/components/spinner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { QuestExplorer } from '@/components/quest-explorer';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { ProjectHeaderV1 } from '@/components/project-header-v1';
import { PortalHeader } from '@/components/portal-header';

export default function ProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="container p-8 max-w-screen-xl mx-auto flex justify-center">
          <Spinner />
        </div>
      }
    >
      <ProjectPageContent />
    </Suspense>
  );
}

function ProjectPageContent() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const { user, isLoading, signOut, environment } = useAuth();
  const supabase = createBrowserClient(environment);
  // const queryClient = useQueryClient();

  // Fetch project data
  const {
    data: project,
    isLoading: projectLoading,
    error: projectError
  } = useQuery({
    queryKey: ['project', projectId, environment],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      // Check if project exists (without filters first)
      const { data: allProjects } = await supabase.from('project').select('*');

      const matchingProject = allProjects?.find((p) => p.id === projectId);

      if (!matchingProject) {
        const availableIds = allProjects?.map((p) => p.id) || [];
        throw new Error(
          `Project ${projectId} not found. Available projects: ${availableIds.length}`
        );
      }

      // Try to get language info separately if the project exists
      let languageData = null;
      if (matchingProject.target_language_id) {
        const { data: lang } = await supabase
          .from('language')
          .select('*')
          .eq('id', matchingProject.target_language_id)
          .single();
        languageData = lang;
      }

      // Get quests count
      const { data: quests } = await supabase
        .from('quest')
        .select('id')
        .eq('project_id', projectId);

      // Get project members
      const { data: members } = await supabase
        .from('profile_project_link')
        .select('*')
        .eq('project_id', projectId)
        .eq('active', true);

      // Return complete data structure
      const data = {
        ...matchingProject,
        target_language: languageData,
        quests: quests || [],
        project_members: members || []
      };

      return data;
    }
  });

  // Check user permission to access this project
  const { data: userPermission } = useQuery({
    queryKey: ['project-permission', projectId, user?.id, environment],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      console.log(
        '🔐 Checking permissions for project:',
        projectId,
        'user:',
        user?.id
      );

      const { data, error } = await supabase
        .from('profile_project_link')
        .select('*')
        .eq('project_id', projectId)
        .eq('profile_id', user?.id)
        .eq('active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

      return data;
    }
  });

  // Single query to fetch Assets and Translations
  const { data: assetsCounts = { assets: 0, translations: 0 } } = useQuery({
    queryKey: ['assets-translations-count', projectId, environment],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('asset')
        .select('source_asset_id')
        .eq('project_id', projectId);

      if (error) throw error;

      const assets = (data || []).filter(
        (item) => item.source_asset_id === null
      ).length;
      const translations = (data || []).filter(
        (item) => item.source_asset_id !== null
      ).length;

      return { assets, translations };
    },
    enabled: !!projectId && !!user
  });

  const assetsCount = assetsCounts.assets;
  const translationsCount = assetsCounts.translations;

  // Handle sign out
  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      const currentUrl = `/project/${projectId}`;
      const envQuery =
        environment !== 'production' ? `?env=${environment}` : '';
      router.push(
        `/login${envQuery}&redirectTo=${encodeURIComponent(currentUrl)}`
      );
    }
  }, [isLoading, user, router, projectId, environment]);

  // Show loading state while authentication is being checked
  if (isLoading || projectLoading) {
    return (
      <div className="container p-8 max-w-screen-xl mx-auto flex justify-center items-center min-h-screen">
        <Spinner />
      </div>
    );
  }

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // Show error if project not found or no access
  if (projectError || (!project && !projectLoading)) {
    console.log('🚨 Project error details:', {
      projectError,
      project,
      projectLoading,
      projectId,
      environment
    });

    return (
      <div className="container p-8 max-w-screen-xl mx-auto">
        <Alert className="max-w-md mx-auto">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Project Not Found</AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              The project you&apos;re looking for doesn&apos;t exist or you
              don&apos;t have permission to access it.
            </p>
            <div className="text-xs text-muted-foreground mt-2 space-y-1">
              <p>Project ID: {projectId}</p>
              <p>Environment: {environment}</p>
              {projectError && <p>Error: {projectError.message}</p>}
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show loading if we don't have project data yet
  if (!project) {
    return (
      <div className="container p-8 max-w-screen-xl mx-auto flex justify-center">
        <Spinner />
      </div>
    );
  }

  // Check if user has access
  // const hasAccess = userPermission || user?.user_metadata?.role === 'admin';

  // if (!hasAccess && project.private === true) {
  //   return (
  //     <div className="container p-8 max-w-screen-xl mx-auto">
  //       <Alert className="max-w-md mx-auto">
  //         <AlertCircle className="h-4 w-4" />
  //         <AlertTitle>Access Denied</AlertTitle>
  //         <AlertDescription>
  //           You don&apos;t have permission to access this project.
  //         </AlertDescription>
  //       </Alert>
  //     </div>
  //   );
  // }

  const isOwner = userPermission?.membership === 'owner';
  const isAdmin = userPermission?.membership === 'admin';

  return (
    <div className="min-h-screen bg-background">
      <PortalHeader
        environment={environment}
        user={user}
        onSignOut={handleSignOut}
      />

      {/* Project Header - Original Model with Stats */}
      <div className="container p-6 max-w-screen-xl mx-auto">
        <ProjectHeaderV1
          project={project}
          userRole={
            isOwner
              ? 'owner'
              : isAdmin
                ? 'admin'
                : userPermission?.membership
                  ? 'member'
                  : 'viewer'
          }
          assetsCount={assetsCount}
          translationsCount={translationsCount}
        />
      </div>

      <div className="container p-6 max-w-screen-xl mx-auto ">
        {/* Quest Explorer - Template-based quest organization */}
        <QuestExplorer
          project={project}
          projectId={projectId}
          userPermission={userPermission}
        />
      </div>
    </div>
  );
}
