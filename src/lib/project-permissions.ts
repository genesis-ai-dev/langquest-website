import { createBrowserClient } from '@/lib/supabase/client';

export async function checkProjectOwnership(
  projectId: string,
  userId: string,
  environment: 'preview' | 'production'
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
  environment: 'preview' | 'production'
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
  environment: 'preview' | 'production'
): Promise<boolean> {
  if (!userId || !projectId) return false;

  // Check if user is owner of the project
  const isOwner = await checkProjectOwnership(projectId, userId, environment);
  if (isOwner) return true;

  // Check if project has any ownership (if not, it's unowned and editable by anyone)
  const { data, error } = await createBrowserClient(environment)
    .from('profile_project_link')
    .select('membership')
    .eq('project_id', projectId)
    .eq('active', true)
    .eq('membership', 'owner')
    .limit(1);

  if (error) return false;

  // If no ownership records found, it's unowned and can be edited by anyone
  return !data || data.length === 0;
}
