import { createBrowserClient } from '@/lib/supabase/client';

export async function checkProjectOwnership(
  projectId: string,
  authUserId: string
): Promise<boolean> {
  if (!authUserId || !projectId) return false;

  const projectRes = await createBrowserClient()
    .from('project')
    .select('creator_id')
    .eq('id', projectId)
    .single();
  if (projectRes.data?.creator_id === authUserId) return true;

  const linkRes = await createBrowserClient()
    .from('profile_project_link')
    .select('membership')
    .eq('project_id', projectId)
    .eq('profile_id', authUserId)
    .eq('active', true)
    .eq('membership', 'owner')
    .maybeSingle();

  return !!linkRes.data;
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
