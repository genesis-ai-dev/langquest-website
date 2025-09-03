'use client';

import { useAuth } from '@/components/auth-provider';
import { createBrowserClient } from '@/lib/supabase/client';
import { useQuery } from '@tanstack/react-query';

export type MembershipRole = 'member' | 'admin' | 'owner' | null;

export type Permission =
  | 'open_project'
  | 'download'
  | 'contribute'
  | 'view_membership'
  | 'vote'
  | 'translate'
  | 'edit_transcription'
  | 'manage'
  | 'project_card_membership_icon'
  | 'project_settings_cog'
  | 'send_invite_section'
  | 'promote_member_button'
  | 'remove_member_button'
  | 'withdraw_invite_button';

const MEMBER_PERMISSIONS: Permission[] = [
  'open_project',
  'download',
  'contribute',
  'vote',
  'translate',
  'edit_transcription',
  'view_membership',
  'project_card_membership_icon'
];

const ADMIN_PERMISSIONS: Permission[] = [
  ...MEMBER_PERMISSIONS,
  'manage',
  'project_settings_cog',
  'send_invite_section',
  'promote_member_button',
  'remove_member_button',
  'withdraw_invite_button'
];

const OWNER_PERMISSIONS: Permission[] = [...ADMIN_PERMISSIONS];

const PERMISSION_LOOKUP: Record<Exclude<MembershipRole, null>, Set<Permission>> = {
  member: new Set(MEMBER_PERMISSIONS),
  admin: new Set(ADMIN_PERMISSIONS),
  owner: new Set(OWNER_PERMISSIONS)
};

export function useProjectPermission(projectId: string | null | undefined, action: Permission) {
  const { user, environment } = useAuth();

  const { data: membership, isLoading } = useQuery<MembershipRole>({
    queryKey: ['project-membership', projectId, user?.id, environment],
    enabled: Boolean(projectId && user?.id),
    queryFn: async () => {
      if (!projectId || !user?.id) return null;
      const { data, error } = await createBrowserClient(environment)
        .from('profile_project_link')
        .select('membership, active')
        .eq('project_id', projectId)
        .eq('profile_id', user.id)
        .eq('active', true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const mem = (data as any).membership as MembershipRole;
      return mem ?? null;
    }
  });

  const hasAccess = Boolean(membership && PERMISSION_LOOKUP[membership as Exclude<MembershipRole, null>]?.has(action));

  return {
    hasAccess,
    membership: membership ?? null,
    isLoading
  };
}


