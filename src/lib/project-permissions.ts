import { createBrowserClient } from '@/lib/supabase/client';
import { SupabaseEnvironment } from '@/lib/supabase';

export async function checkProjectOwnership(
  projectId: string,
  userId: string,
  environment: SupabaseEnvironment
): Promise<boolean> {
  if (!userId || !projectId) return false;

  const { data, error } = await createBrowserClient(environment)
    .from('profile_project_link')
    .select('membership')
    .eq('project_id', projectId)
    .eq('profile_id', userId)
    .eq('active', true)
    .eq('membership', 'owner')
    .single();

  if (error || !data) return false;
  return true;
}

export async function createProjectOwnership(
  projectId: string,
  userId: string,
  environment: SupabaseEnvironment
): Promise<void> {
  const { error } = await createBrowserClient(environment)
    .from('profile_project_link')
    .insert({
      project_id: projectId,
      profile_id: userId,
      membership: 'owner',
      active: true
    });

  if (error) {
    throw new Error(`Failed to create project ownership: ${error.message}`);
  }
}

export async function canEditProject(
  projectId: string,
  userId: string,
  environment: SupabaseEnvironment
): Promise<boolean> {
  return checkProjectOwnership(projectId, userId, environment);
}
 