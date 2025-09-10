import { createBrowserClient } from '@/lib/supabase/client';
import { SupabaseEnvironment } from '@/lib/supabase';

export async function checkProjectOwnership(
  projectId: string,
  authUserId: string,
  environment: SupabaseEnvironment
): Promise<boolean> {
  if (!authUserId || !projectId) return false;

  // Owner if creator
  const projectRes = await createBrowserClient(environment)
    .from('project')
    .select('creator_id')
    .eq('id', projectId)
    .single();
  if (projectRes.data?.creator_id === authUserId) return true;

  // Or owner via ACL link (policy typically allows reading own links)
  const linkRes = await createBrowserClient(environment)
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
  authUserId: string,
  environment: SupabaseEnvironment
): Promise<boolean> {
  return checkProjectOwnership(projectId, authUserId, environment);
}

export async function createProjectOwnership(
  projectId: string,
  authUserId: string,
  environment: SupabaseEnvironment
): Promise<void> {
  const { error } = await createBrowserClient(environment).rpc(
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
