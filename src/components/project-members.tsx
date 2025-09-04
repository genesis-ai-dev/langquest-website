'use client';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createBrowserClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useProjectPermission } from '@/hooks/use-project-permission';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Crown,
  Mail,
  RefreshCcw,
  Trash2,
  UserMinus,
  UserPlus,
  UserRound
} from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';

type Member = {
  id: string;
  email: string | null;
  username: string | null;
  role: 'owner' | 'member';
  active: boolean;
};

type Invitation = {
  id: string;
  email: string;
  as_owner: boolean;
  status: 'pending' | 'expired' | 'declined' | 'withdrawn' | 'accepted';
  created_at: string;
  last_updated: string;
  receiver_profile_id: string | null;
  count?: number | null;
};

export function ProjectMembers({ projectId }: { projectId: string }) {
  const { user, environment } = useAuth();
  const supabase = createBrowserClient(environment);
  const queryClient = useQueryClient();

  const canSendInvites = useProjectPermission(projectId, 'send_invite_section');
  const canPromote = useProjectPermission(projectId, 'promote_member_button');
  const canRemove = useProjectPermission(projectId, 'remove_member_button');
  const canWithdrawInvite = useProjectPermission(
    projectId,
    'withdraw_invite_button'
  );

  const { data: memberLinks = [], isLoading: memberLinksLoading } = useQuery({
    queryKey: ['project-member-links', projectId, environment],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile_project_link')
        .select('profile_id, membership, active')
        .eq('project_id', projectId);
      if (error) throw error;
      return data as Array<{
        profile_id: string;
        membership: 'owner' | 'member';
        active: boolean;
      }>;
    }
  });

  const profileIds = useMemo(
    () => Array.from(new Set(memberLinks.map((l) => l.profile_id))),
    [memberLinks]
  );

  const { data: profiles = [] } = useQuery({
    queryKey: ['member-profiles', projectId, profileIds.join(','), environment],
    enabled: profileIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profile')
        .select('id, username')
        .in('id', profileIds);
      if (error) throw error;
      // Load auth user emails via edge: we do not have email in profile; join via auth admin not available on client
      // Fallback: show username only
      return data as Array<{ id: string; username: string | null }>;
    }
  });

  const profilesById = useMemo(() => {
    const m = new Map<string, { id: string; username: string | null }>();
    profiles.forEach((p) => m.set(p.id, p));
    return m;
  }, [profiles]);

  const members: Member[] = useMemo(() => {
    return memberLinks
      .filter((l) => l.active)
      .map((l) => {
        const p = profilesById.get(l.profile_id);
        return {
          id: l.profile_id,
          email: null,
          username: p?.username ?? null,
          role: l.membership,
          active: l.active
        } as Member;
      })
      .sort((a, b) => {
        if (a.id === user?.id) return -1;
        if (b.id === user?.id) return 1;
        if (a.role !== b.role) return a.role === 'owner' ? -1 : 1;
        return (a.username || '').localeCompare(b.username || '');
      });
  }, [memberLinks, profilesById, user?.id]);

  const { data: invites = [] } = useQuery({
    queryKey: ['project-invites', projectId, environment],
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invite')
        .select(
          'id, email, as_owner, status, created_at, last_updated, receiver_profile_id, count'
        )
        .eq('project_id', projectId);
      if (error) throw error;
      return (data || []) as Invitation[];
    }
  });

  const visibleInvitations = useMemo(() => {
    return invites.filter((inv) =>
      ['pending', 'expired', 'declined', 'withdrawn'].includes(inv.status)
    );
  }, [invites]);

  const [activeTab, setActiveTab] = useState<'members' | 'invited'>('members');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteAsOwner, setInviteAsOwner] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmState, setConfirmState] = useState<
    | { type: 'remove'; memberId: string; memberName: string }
    | { type: 'promote'; memberId: string; memberName: string }
    | null
  >(null);

  const refetchAll = () => {
    queryClient.invalidateQueries({ queryKey: ['project-member-links'] });
    queryClient.invalidateQueries({ queryKey: ['member-profiles'] });
    queryClient.invalidateQueries({ queryKey: ['project-invites'] });
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!canRemove.hasAccess) return;
    await supabase
      .from('profile_project_link')
      .update({ active: false, last_updated: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('profile_id', memberId);
    refetchAll();
  };

  const handlePromoteToOwner = async (memberId: string) => {
    if (!canPromote.hasAccess) return;
    await supabase
      .from('profile_project_link')
      .update({ membership: 'owner', last_updated: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('profile_id', memberId);
    refetchAll();
  };

  const handleLeaveProject = async () => {
    if (!user?.id) return;
    const activeOwnerCount = members.filter(
      (m) => m.role === 'owner' && m.active
    ).length;
    const isCurrentUserOwner = members.some(
      (m) => m.id === user.id && m.role === 'owner' && m.active
    );
    if (isCurrentUserOwner && activeOwnerCount <= 1) {
      // Block leaving if the only owner
      alert('You are the only owner. Add another owner before leaving.');
      return;
    }
    await supabase
      .from('profile_project_link')
      .update({ active: false, last_updated: new Date().toISOString() })
      .eq('project_id', projectId)
      .eq('profile_id', user.id);
    refetchAll();
  };

  const handleWithdrawInvitation = async (inviteId: string) => {
    if (!canWithdrawInvite.hasAccess) return;
    await supabase
      .from('invite')
      .update({ status: 'withdrawn', last_updated: new Date().toISOString() })
      .eq('id', inviteId);
    refetchAll();
  };

  const handleResendInvitation = async (inv: Invitation) => {
    if (!canWithdrawInvite.hasAccess) return;
    const MAX_INVITE_ATTEMPTS = 3;
    if ((inv.count || 0) >= MAX_INVITE_ATTEMPTS) return;
    await supabase
      .from('invite')
      .update({
        status: 'pending',
        count: (inv.count || 0) + 1,
        last_updated: new Date().toISOString(),
        sender_profile_id: user?.id || undefined
      })
      .eq('id', inv.id);
    refetchAll();
  };

  const isValidEmail = (email: string) =>
    /[^\s@]+@[^\s@]+\.[^\s@]+/.test(email);

  const handleSendInvitation = async () => {
    if (!canSendInvites.hasAccess) return;
    if (!inviteEmail.trim() || !isValidEmail(inviteEmail)) return;
    if (!user?.id) return;
    setIsSubmitting(true);
    try {
      // Prevent inviting users who are already active members/owners when resolvable via prior invite linkage
      const { data: priorInvites } = await supabase
        .from('invite')
        .select('receiver_profile_id')
        .eq('project_id', projectId)
        .eq('email', inviteEmail.trim());
      const receiverId = (priorInvites || []).find(
        (pi) => pi.receiver_profile_id
      )?.receiver_profile_id as string | undefined;
      if (receiverId) {
        const { data: existingLink } = await supabase
          .from('profile_project_link')
          .select('active')
          .eq('project_id', projectId)
          .eq('profile_id', receiverId)
          .eq('active', true)
          .maybeSingle();
        if (existingLink) {
          alert('This user is already a member of the project.');
          setIsSubmitting(false);
          return;
        }
      }
      const { error } = await supabase.from('invite').insert({
        email: inviteEmail.trim(),
        project_id: projectId,
        status: 'pending',
        as_owner: inviteAsOwner,
        count: 1,
        last_updated: new Date().toISOString(),
        sender_profile_id: user.id
      } as any);
      if (error) throw error;
      setInviteEmail('');
      setInviteAsOwner(false);
      refetchAll();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="invited">Invited</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="mt-4">
              <div className="space-y-3">
                {memberLinksLoading ? (
                  <div className="text-sm text-muted-foreground">
                    Loading members…
                  </div>
                ) : members.length > 0 ? (
                  members.map((m) => {
                    const isCurrentUser = m.id === user?.id;
                    return (
                      <div
                        key={m.id}
                        className="flex items-center justify-between border rounded-md p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-primary/10 flex items-center justify-center">
                            <UserRound
                              className={cn(
                                'size-4',
                                m.role === 'owner' && 'text-primary'
                              )}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {m.username || m.email || 'User'}
                              </span>
                              {m.role === 'owner' && (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                                  <Crown className="size-3" /> Owner
                                </span>
                              )}
                              {isCurrentUser && (
                                <span className="text-xs text-muted-foreground">
                                  (You)
                                </span>
                              )}
                            </div>
                            {m.email && (
                              <div className="text-xs text-muted-foreground">
                                {m.email}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!isCurrentUser &&
                            m.role === 'member' &&
                            canPromote.hasAccess && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  setConfirmState({
                                    type: 'promote',
                                    memberId: m.id,
                                    memberName: m.username || m.email || 'User'
                                  })
                                }
                              >
                                <Crown className="size-4 mr-2" /> Promote
                              </Button>
                            )}
                          {!isCurrentUser && canRemove.hasAccess && (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={m.role === 'owner'}
                              onClick={() =>
                                setConfirmState({
                                  type: 'remove',
                                  memberId: m.id,
                                  memberName: m.username || m.email || 'User'
                                })
                              }
                            >
                              <UserMinus className="size-4 mr-2" /> Remove
                            </Button>
                          )}
                          {isCurrentUser && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleLeaveProject}
                            >
                              <Trash2 className="size-4 mr-2" /> Leave
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No members found.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="invited" className="mt-4 space-y-6">
              <div className="space-y-3">
                {visibleInvitations.length > 0 ? (
                  visibleInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between border rounded-md p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="size-9 rounded-full bg-muted flex items-center justify-center">
                          <Mail className="size-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{inv.email}</span>
                            {inv.as_owner && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">
                                <Crown className="size-3" /> Owner
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground capitalize">
                            {inv.status}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {inv.status === 'expired' &&
                          canWithdrawInvite.hasAccess && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResendInvitation(inv)}
                            >
                              <RefreshCcw className="size-4 mr-2" /> Resend
                            </Button>
                          )}
                        {inv.status === 'pending' &&
                          canWithdrawInvite.hasAccess && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleWithdrawInvitation(inv.id)}
                            >
                              <Trash2 className="size-4 mr-2" /> Withdraw
                            </Button>
                          )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No invitations.
                  </div>
                )}
              </div>

              {canSendInvites.hasAccess && (
                <div className="border rounded-md p-4 space-y-3">
                  <div className="font-medium">Invite member</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="sm:col-span-2 space-y-2">
                      <Label htmlFor="invite-email">Email</Label>
                      <Input
                        id="invite-email"
                        placeholder="user@example.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                      />
                      <div className="flex items-center gap-2">
                        <input
                          id="invite-as-owner"
                          type="checkbox"
                          className="h-4 w-4"
                          checked={inviteAsOwner}
                          onChange={(e) => setInviteAsOwner(e.target.checked)}
                        />
                        <Label htmlFor="invite-as-owner" className="text-sm">
                          Invite as owner
                        </Label>
                      </div>
                    </div>
                    <div>
                      <Button
                        className="w-full"
                        onClick={handleSendInvitation}
                        disabled={!isValidEmail(inviteEmail) || isSubmitting}
                      >
                        <UserPlus className="size-4 mr-2" />
                        {isSubmitting ? 'Sending…' : 'Send Invite'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      {/* Confirmation Dialog */}
      <Dialog
        open={!!confirmState}
        onOpenChange={(open) => !open && setConfirmState(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmState?.type === 'remove'
                ? 'Remove member'
                : 'Promote to owner'}
            </DialogTitle>
            <DialogDescription>
              {confirmState?.type === 'remove'
                ? 'Are you sure you want to remove this member from the project? This will set their membership to inactive.'
                : 'Promoting to owner cannot be undone in-app (owners cannot be demoted). Proceed?'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">{confirmState?.memberName}</div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmState(null)}>
              Cancel
            </Button>
            {confirmState?.type === 'remove' ? (
              <Button
                variant="destructive"
                onClick={async () => {
                  await handleRemoveMember(confirmState.memberId);
                  setConfirmState(null);
                }}
              >
                Remove member
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  await handlePromoteToOwner(confirmState!.memberId);
                  setConfirmState(null);
                }}
              >
                Promote
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
