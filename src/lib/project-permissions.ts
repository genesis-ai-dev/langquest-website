import { createBrowserClient } from '@/lib/supabase/client';

export type ProjectMembership = 'owner' | 'admin' | 'member' | null;

export async function getProjectMembership(
  projectId: string,
  authUserId: string
): Promise<ProjectMembership> {
  if (!authUserId || !projectId) return null;

  const projectRes = await createBrowserClient()
    .from('project')
    .select('creator_id')
    .eq('id', projectId)
    .single();
  if (projectRes.data?.creator_id === authUserId) return 'owner';

  const linkRes = await createBrowserClient()
    .from('profile_project_link')
    .select('membership')
    .eq('project_id', projectId)
    .eq('profile_id', authUserId)
    .eq('active', true)
    .in('membership', ['owner', 'admin', 'member'])
    .maybeSingle();

  return (linkRes.data?.membership as ProjectMembership) ?? null;
}

export async function checkProjectOwnership(
  projectId: string,
  authUserId: string
): Promise<boolean> {
  const membership = await getProjectMembership(projectId, authUserId);
  return membership === 'owner';
}

export async function canCreateContentInProject(
  projectId: string,
  authUserId: string
): Promise<boolean> {
  const membership = await getProjectMembership(projectId, authUserId);
  return membership === 'owner' || membership === 'admin' || membership === 'member';
}

export async function canEditProject(
  projectId: string,
  authUserId: string
): Promise<boolean> {
  return checkProjectOwnership(projectId, authUserId);
}

export async function createProjectOwnership(
  projectId: string,
  authUserId: string
): Promise<void> {
  const { error } = await createBrowserClient().rpc(
    'create_project_ownership',
    {
      p_project_id: projectId,
      p_profile_id: authUserId
    }
  );
  if (error) {
    throw new Error(`Failed to create project ownership: ${error.message}`);
  }
}
