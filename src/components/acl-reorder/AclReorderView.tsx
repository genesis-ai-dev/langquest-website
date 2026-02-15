'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { Spinner } from '@/components/spinner';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ChevronDown, Download } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { AssetAclList, type AssetWithAcls } from './AssetAclList';
import { useAclAudioPlayer, type AclWithAudio } from './useAclAudioPlayer';

function sanitizeFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9-_.\s]/g, '').replace(/\s+/g, '-') || 'quest';
}

export function AclReorderView() {
  const searchParams = useSearchParams();
  const { user, session, environment } = useAuth();
  const queryClient = useQueryClient();
  const supabase = createBrowserClient(environment);
  const audioPlayer = useAclAudioPlayer(environment);

  const urlProjectId = searchParams.get('projectId');
  const urlQuestId = searchParams.get('questId');

  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    urlProjectId || null
  );
  const [selectedProjectName, setSelectedProjectName] = useState('');
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(
    urlQuestId || null
  );
  const [selectedQuestName, setSelectedQuestName] = useState('');
  const [movingAclId, setMovingAclId] = useState<string | null>(null);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Worker status (poll when quest selected)
  const { data: workerStatus, isLoading: workerStatusLoading } = useQuery({
    queryKey: ['export-worker-status'],
    queryFn: async () => {
      const res = await fetch('/api/export/worker-status');
      const data = await res.json();
      return data as { ready: boolean; error?: string };
    },
    refetchInterval: selectedQuestId ? 5000 : false,
    staleTime: 2000,
    enabled: !!selectedQuestId
  });

  const workerReady = workerStatus?.ready ?? false;
  const workerChecking = workerStatusLoading;
  const workerFailed = workerStatus && !workerStatus.ready;

  // Projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['acl-reorder-projects', user?.id, environment],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('project')
        .select(
          `
          id, name,
          profile_project_link(membership, active, profile_id)
        `
        )
        .order('name');
      if (error) throw error;
      return (data || []).filter((p) => {
        const link = (p.profile_project_link as any[])?.find(
          (l: any) => l.profile_id === user.id && l.active
        );
        return link?.membership;
      });
    },
    enabled: !!user?.id
  });

  // Quests (include metadata for bible book/chapter context)
  const { data: quests = [], isLoading: questsLoading } = useQuery({
    queryKey: ['acl-reorder-quests', selectedProjectId, environment],
    queryFn: async () => {
      if (!selectedProjectId) return [];
      const { data, error } = await supabase
        .from('quest')
        .select('id, name, metadata')
        .eq('project_id', selectedProjectId)
        .eq('active', true)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedProjectId
  });

  // Assets + ACLs for selected quest
  const { data: assetsWithAcls = [], isLoading: assetsLoading } = useQuery({
    queryKey: ['acl-reorder', selectedQuestId, environment],
    queryFn: async (): Promise<AssetWithAcls[]> => {
      if (!selectedQuestId) return [];

      const { data: qal, error: qalError } = await supabase
        .from('quest_asset_link')
        .select('asset_id')
        .eq('quest_id', selectedQuestId);
      if (qalError) throw qalError;
      const assetIds = (qal || []).map((r) => r.asset_id);
      if (assetIds.length === 0) return [];

      const { data: assets, error: assetsError } = await supabase
        .from('asset')
        .select('id, name, order_index, metadata')
        .in('id', assetIds)
        .is('source_asset_id', null);
      if (assetsError) throw assetsError;
      const topLevelAssets = (assets || []).sort(
        (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
      );
      const topLevelIds = topLevelAssets.map((a) => a.id);

      const { data: acls, error: aclsError } = await supabase
        .from('asset_content_link')
        .select('id, asset_id, order_index, audio, text, created_at')
        .in('asset_id', topLevelIds)
        .order('order_index', { ascending: true })
        .order('created_at', { ascending: true });
      if (aclsError) throw aclsError;

      const aclsByAsset = new Map<string, AclWithAudio[]>();
      for (const acl of acls || []) {
        const list = aclsByAsset.get(acl.asset_id) || [];
        list.push(acl as AclWithAudio);
        aclsByAsset.set(acl.asset_id, list);
      }

      return topLevelAssets.map((asset) => ({
        id: asset.id,
        name: asset.name,
        order_index: asset.order_index ?? 0,
        metadata: asset.metadata ?? null,
        acls: aclsByAsset.get(asset.id) || []
      }));
    },
    enabled: !!selectedQuestId
  });

  const moveMutation = useMutation({
    mutationFn: async ({
      updates
    }: {
      aclId: string;
      direction: 'up' | 'down';
      questId: string;
      updates: { id: string; order_index: number }[];
    }) => {
      for (const { id, order_index } of updates) {
        const { error } = await supabase
          .from('asset_content_link')
          .update({
            order_index,
            last_updated: new Date().toISOString()
          })
          .eq('id', id);
        if (error) throw error;
      }
    },
    onMutate: async ({ aclId, direction, questId }) => {
      setMovingAclId(aclId);
      const queryKey = ['acl-reorder', questId, environment];
      await queryClient.cancelQueries({ queryKey });

      const prev = queryClient.getQueryData<AssetWithAcls[]>(queryKey);
      if (!prev) return { prev };

      const assetIdx = prev.findIndex((a) =>
        a.acls.some((c) => c.id === aclId)
      );
      if (assetIdx < 0) return { prev };

      const asset = prev[assetIdx];
      const sorted = [...asset.acls].sort((a, b) => {
        const aIdx = a.order_index ?? 0;
        const bIdx = b.order_index ?? 0;
        if (aIdx !== bIdx) return aIdx - bIdx;
        return (
          new Date(a.created_at || 0).getTime() -
          new Date(b.created_at || 0).getTime()
        );
      });
      const idx = sorted.findIndex((a) => a.id === aclId);
      const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (swapIdx < 0 || swapIdx >= sorted.length) return { prev };

      // Swap positions in array, then assign sequential order_index (1, 2, 3...)
      const reordered = [...sorted];
      [reordered[idx], reordered[swapIdx]] = [
        reordered[swapIdx],
        reordered[idx]
      ];
      const withNewOrder = reordered.map((acl, i) => ({
        ...acl,
        order_index: i + 1
      }));

      const next = [...prev];
      next[assetIdx] = { ...asset, acls: withNewOrder };
      queryClient.setQueryData(queryKey, next);

      return { prev };
    },
    onError: (err: Error, variables, context) => {
      if (context?.prev) {
        queryClient.setQueryData(
          ['acl-reorder', variables.questId, environment],
          context.prev
        );
      }
      toast.error(err.message || 'Failed to update order');
    },
    onSettled: () => {
      setMovingAclId(null);
    },
    onSuccess: () => {
      toast.success('Order updated');
    }
  });

  const computeMove = (aclId: string, direction: 'up' | 'down') => {
    const asset = assetsWithAcls.find((a) =>
      a.acls.some((c) => c.id === aclId)
    );
    if (!asset) return null;
    const sorted = [...asset.acls].sort((a, b) => {
      const aIdx = a.order_index ?? 0;
      const bIdx = b.order_index ?? 0;
      if (aIdx !== bIdx) return aIdx - bIdx;
      return (
        new Date(a.created_at || 0).getTime() -
        new Date(b.created_at || 0).getTime()
      );
    });
    const idx = sorted.findIndex((a) => a.id === aclId);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return null;

    const reordered = [...sorted];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const updates = reordered.map((acl, i) => ({
      id: acl.id,
      order_index: i + 1
    }));
    return updates;
  };

  const handleMoveUp = (acl: AclWithAudio) => {
    if (!selectedQuestId) return;
    const updates = computeMove(acl.id, 'up');
    if (!updates) return;
    moveMutation.mutate({
      aclId: acl.id,
      direction: 'up',
      questId: selectedQuestId,
      updates
    });
  };
  const handleMoveDown = (acl: AclWithAudio) => {
    if (!selectedQuestId) return;
    const updates = computeMove(acl.id, 'down');
    if (!updates) return;
    moveMutation.mutate({
      aclId: acl.id,
      direction: 'down',
      questId: selectedQuestId,
      updates
    });
  };

  // Sync from URL params when they change (e.g. deep link from project/quest)
  useEffect(() => {
    if (urlProjectId) {
      setSelectedProjectId(urlProjectId);
      setSelectedQuestId(urlQuestId || null);
    } else {
      setSelectedProjectId(null);
      setSelectedQuestId(null);
    }
  }, [urlProjectId, urlQuestId]);

  useEffect(() => {
    if (selectedProjectId && projects.length > 0) {
      const p = projects.find((x) => x.id === selectedProjectId);
      if (p) setSelectedProjectName(p.name);
    }
  }, [selectedProjectId, projects]);

  useEffect(() => {
    if (selectedQuestId && quests.length > 0) {
      const q = quests.find((x) => x.id === selectedQuestId);
      if (q) setSelectedQuestName(q.name);
    }
  }, [selectedQuestId, quests]);

  // Derive bible book/chapter label from quest metadata (e.g. "Gen 1")
  const bookChapterLabel = (() => {
    if (!selectedQuestId || quests.length === 0) return null;
    const q = quests.find((x) => x.id === selectedQuestId);
    if (!q?.metadata) return null;
    try {
      const meta =
        typeof q.metadata === 'string' ? JSON.parse(q.metadata) : q.metadata;
      const bible = meta?.bible;
      if (!bible?.book) return null;
      const bookLabel =
        bible.book.charAt(0).toUpperCase() + bible.book.slice(1);
      return bible.chapter ? `${bookLabel} ${bible.chapter}` : bookLabel;
    } catch {
      return null;
    }
  })();

  const safeJson = async (res: Response) => {
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error(
        !res.ok
          ? `Server error (${res.status}): ${text.slice(0, 120)}`
          : `Invalid response: ${text.slice(0, 120)}`
      );
    }
  };

  const handleExportQuest = async () => {
    if (!selectedQuestId || !session?.access_token || !user) return;
    setIsExporting(true);
    try {
      const createRes = await fetch('/api/export/chapter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          quest_id: selectedQuestId,
          export_type: 'feedback',
          environment
        })
      });
      const createData = await safeJson(createRes);
      if (!createRes.ok) throw new Error(createData.error || 'Export failed');

      const exportId = createData.id;
      if (!exportId) throw new Error('No export ID returned');

      if (createData.status === 'ready' && createData.audio_url) {
        await downloadAudio(createData.audio_url);
        setIsExporting(false);
        return;
      }

      const pollInterval = 2000;
      const maxAttempts = 60;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, pollInterval));
        const statusRes = await fetch(
          `/api/export/${exportId}?environment=${environment}`,
          {
            headers: { Authorization: `Bearer ${session.access_token}` }
          }
        );
        const statusData = await safeJson(statusRes);
        if (!statusRes.ok)
          throw new Error(statusData.error || 'Status check failed');

        if (statusData.status === 'ready' && statusData.audio_url) {
          await downloadAudio(statusData.audio_url);
          break;
        }
        if (statusData.status === 'failed') {
          throw new Error(statusData.error_message || 'Export failed');
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadAudio = async (audioUrl: string) => {
    let url: string;
    if (audioUrl.startsWith('http')) {
      try {
        const u = new URL(audioUrl);
        url = u.origin === window.location.origin ? audioUrl : u.pathname;
      } catch {
        url = audioUrl.startsWith('/')
          ? audioUrl
          : `/api/export/audio/${audioUrl}`;
      }
    } else {
      url = audioUrl.startsWith('/')
        ? audioUrl
        : `/api/export/audio/${audioUrl}`;
    }
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) {
      const body = await res.text();
      let msg = `Download failed (${res.status})`;
      try {
        const json = JSON.parse(body);
        if (json.error) msg = json.error;
      } catch {
        if (body) msg += `: ${body.slice(0, 100)}`;
      }
      if (res.status === 404) {
        msg += '. Make sure the audio worker (wrangler dev) is running.';
      } else if (res.status === 501) {
        msg += '. Audio download is not yet available in this environment.';
      }
      throw new Error(msg);
    }
    const blob = await res.blob();
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const safeQuest = sanitizeFilename(selectedQuestName || 'quest');
    const safeUser = sanitizeFilename(
      (user?.user_metadata?.username as string) ||
        user?.email?.split('@')[0] ||
        user?.id?.slice(0, 8) ||
        'user'
    );
    const ext = url.includes('.wav') ? 'wav' : 'mp3';
    const filename = `${safeQuest}-${timestamp}-${safeUser}.${ext}`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('Download started');
  };

  const selectorContent = (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-medium text-muted-foreground mb-2">
          Projects
        </h2>
        {projectsLoading ? (
          <Spinner className="size-5" />
        ) : (
          <ul className="space-y-1">
            {projects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    setSelectedProjectId(p.id);
                    setSelectedProjectName(p.name);
                    setSelectedQuestId(null);
                    setSelectedQuestName('');
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-md text-sm min-h-[44px] flex items-center',
                    selectedProjectId === p.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {selectedProjectId && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-2">
            Quests
          </h2>
          {questsLoading ? (
            <Spinner className="size-5" />
          ) : (
            <ul className="space-y-1">
              {quests.map((q) => (
                <li key={q.id}>
                  <button
                    onClick={() => {
                      setSelectedQuestId(q.id);
                      setSelectedQuestName(q.name);
                      setMobileSheetOpen(false);
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-md text-sm min-h-[44px] flex items-center',
                      selectedQuestId === q.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    {q.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-8">
      {/* Mobile: Sheet for project/quest selection */}
      <div className="md:hidden">
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              className="w-full justify-between min-h-[44px]"
            >
              <span className="truncate">
                {selectedQuestName
                  ? `${selectedProjectName} / ${selectedQuestName}`
                  : selectedProjectName
                    ? `Project: ${selectedProjectName}`
                    : 'Select project & quest'}
              </span>
              <ChevronDown className="size-4 shrink-0 ml-2" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="w-[85vw] max-w-sm overflow-y-auto"
          >
            <SheetHeader>
              <SheetTitle>Select project & quest</SheetTitle>
            </SheetHeader>
            <div className="mt-6">{selectorContent}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Sidebar */}
      <div className="hidden md:block w-64 shrink-0">{selectorContent}</div>

      {/* Main: Nested ACL lists */}
      <div className="flex-1 min-w-0">
        {selectedQuestId && (
          <>
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-sm text-muted-foreground hidden md:block">
                {selectedProjectName && <span>{selectedProjectName} / </span>}
                {selectedQuestName}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportQuest}
                      disabled={isExporting || !session || !workerReady}
                      className="gap-2 shrink-0 min-h-[44px] sm:min-h-0"
                    >
                      <span
                        className={cn(
                          'size-2 rounded-full shrink-0',
                          workerReady && 'bg-emerald-500',
                          workerChecking && 'bg-amber-500 animate-pulse',
                          !workerReady && !workerChecking && 'bg-red-500'
                        )}
                        aria-hidden
                      />
                      {isExporting ? (
                        <Spinner className="size-4" />
                      ) : (
                        <Download className="size-4" />
                      )}
                      {isExporting
                        ? 'Exporting…'
                        : workerChecking
                          ? 'Checking worker…'
                          : workerFailed
                            ? 'Worker unavailable'
                            : 'Export quest as audio'}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {workerFailed
                    ? `Export worker unavailable: ${workerStatus?.error ?? 'Not running'}. Start with: cd cloud-services/audio-concat-worker && pnpm exec wrangler dev`
                    : workerChecking
                      ? 'Checking export worker…'
                      : workerReady
                        ? 'Export quest as concatenated audio'
                        : 'Select a quest to check worker status'}
                </TooltipContent>
              </Tooltip>
            </div>
            {assetsLoading ? (
              <Spinner className="size-6" />
            ) : assetsWithAcls.length === 0 ? (
              <p className="text-muted-foreground">
                No assets with content links in this quest.
              </p>
            ) : (
              <div className="space-y-6">
                {assetsWithAcls.map((asset) => (
                  <AssetAclList
                    key={asset.id}
                    asset={asset}
                    bookChapterLabel={bookChapterLabel}
                    playingAclId={audioPlayer.playingAclId}
                    movingAclId={movingAclId}
                    onPlaySingle={audioPlayer.playSingle}
                    onPlayAll={audioPlayer.playAll}
                    onMoveUp={handleMoveUp}
                    onMoveDown={handleMoveDown}
                  />
                ))}
              </div>
            )}
          </>
        )}
        {!selectedProjectId && (
          <p className="text-muted-foreground">
            Select a project to view quests and reorder ACLs.
          </p>
        )}
        {selectedProjectId && !selectedQuestId && (
          <p className="text-muted-foreground">
            Select a quest to view assets and reorder ACLs.
          </p>
        )}
      </div>
    </div>
  );
}
