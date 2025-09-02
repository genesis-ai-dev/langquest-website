import { createBrowserClient } from '@/lib/supabase/client';
import { SupabaseEnvironment } from '@/lib/supabase';

export async function checkProjectOwnership(
  projectId: string,
  authUserId: string,
  environment: SupabaseEnvironment
): Promise<boolean> {
  if (!authUserId || !projectId) return false;

  const { data, error } = await createBrowserClient(environment)
    .from('project')
    .select('creator_id')
    .eq('id', projectId)
    .eq('creator_id', authUserId) // Check if user is the creator
    .single();

  if (error || !data) return false;
  return true;
}

export async function canEditProject(
  projectId: string,
  authUserId: string,
  environment: SupabaseEnvironment
): Promise<boolean> {
  return checkProjectOwnership(projectId, authUserId, environment);
}
