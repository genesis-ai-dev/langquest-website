'use client';

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import {
  createBibleChapterQuest,
  fetchAssetDetails,
  fetchProjectQuestTree,
  fetchQuestAssets
} from './questExplorer';

export function useQuestTree(projectId: string) {
  const { user, environment } = useAuth();
  const supabase = useMemo(
    () => createBrowserClient(environment),
    [environment]
  );

  return useQuery({
    queryKey: ['qe-tree', projectId, environment],
    enabled: !!projectId && !!user,
    queryFn: () => fetchProjectQuestTree(supabase, projectId)
  });
}

export function useQuestAssets(questId: string | null) {
  const { user, environment } = useAuth();
  const supabase = useMemo(
    () => createBrowserClient(environment),
    [environment]
  );

  return useQuery({
    queryKey: ['qe-assets', questId, environment],
    enabled: !!questId && !!user,
    queryFn: () => fetchQuestAssets(supabase, questId || '')
  });
}

export function useAssetDetails(assetId: string | null) {
  const { user, environment } = useAuth();
  const supabase = useMemo(
    () => createBrowserClient(environment),
    [environment]
  );

  return useQuery({
    queryKey: ['qe-asset-details', assetId, environment],
    enabled: !!assetId && !!user,
    queryFn: () => fetchAssetDetails(supabase, assetId || '')
  });
}

interface CreateBibleChapterPayload {
  projectId: string;
  bookId: string;
  bookName: string;
  chapterNumber: number;
  verseCount: number;
  existingBookQuestId?: string | null;
}

export function useCreateBibleChapter() {
  const queryClient = useQueryClient();
  const { user, environment } = useAuth();
  const supabase = useMemo(
    () => createBrowserClient(environment),
    [environment]
  );

  return useMutation({
    mutationFn: (payload: CreateBibleChapterPayload) =>
      createBibleChapterQuest(supabase, {
        ...payload,
        userId: user?.id
      }),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({
        queryKey: ['qe-tree', payload.projectId, environment]
      });
    }
  });
}
