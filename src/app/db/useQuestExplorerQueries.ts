'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-provider';
import {
  createBibleChapterQuest,
  createFiaPericopeQuest,
  fetchAssetDetails,
  fetchProjectQuestTree,
  fetchQuestAssets
} from './questExplorer';
import { lookupFiaLanguageCode } from './languoid';

export interface FiaPericope {
  id: string;
  sequence: number;
  verseRange: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
}

export interface FiaBookPericopes {
  id: string;
  title: string;
  pericopes: FiaPericope[];
}

export interface FiaPericopesResponse {
  books: FiaBookPericopes[];
}

function normalizeFiaPericopesResponse(payload: unknown): FiaPericopesResponse {
  const booksInput =
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { books?: unknown[] }).books)
      ? (payload as { books: unknown[] }).books
      : [];

  const books: FiaBookPericopes[] = booksInput
    .map((book): FiaBookPericopes | null => {
      if (!book || typeof book !== 'object') {
        return null;
      }

      const bookObj = book as Record<string, unknown>;
      const id = typeof bookObj.id === 'string' ? bookObj.id : '';
      if (!id) {
        return null;
      }

      const title = typeof bookObj.title === 'string' ? bookObj.title : id;
      const pericopesInput = Array.isArray(bookObj.pericopes)
        ? bookObj.pericopes
        : [];
      const pericopes: FiaPericope[] = pericopesInput
        .map((pericope): FiaPericope | null => {
          if (!pericope || typeof pericope !== 'object') {
            return null;
          }

          const pericopeObj = pericope as Record<string, unknown>;
          const pericopeId =
            typeof pericopeObj.id === 'string' ? pericopeObj.id : '';
          const sequence =
            typeof pericopeObj.sequence === 'number' ? pericopeObj.sequence : 0;
          const verseRange =
            typeof pericopeObj.verseRange === 'string'
              ? pericopeObj.verseRange
              : '';
          const startChapter =
            typeof pericopeObj.startChapter === 'number'
              ? pericopeObj.startChapter
              : 0;
          const startVerse =
            typeof pericopeObj.startVerse === 'number'
              ? pericopeObj.startVerse
              : 0;
          const endChapter =
            typeof pericopeObj.endChapter === 'number'
              ? pericopeObj.endChapter
              : 0;
          const endVerse =
            typeof pericopeObj.endVerse === 'number' ? pericopeObj.endVerse : 0;

          if (!pericopeId || !sequence || !verseRange) {
            return null;
          }

          return {
            id: pericopeId,
            sequence,
            verseRange,
            startChapter,
            startVerse,
            endChapter,
            endVerse
          };
        })
        .filter((value): value is FiaPericope => Boolean(value))
        .sort((a, b) => a.sequence - b.sequence);

      return {
        id,
        title,
        pericopes
      };
    })
    .filter((value): value is FiaBookPericopes => Boolean(value));

  return { books };
}

export function useQuestTree(projectId: string) {
  const { user, supabase } = useAuth();

  return useQuery({
    queryKey: ['qe-tree', projectId],
    enabled: !!projectId && !!user,
    queryFn: () => fetchProjectQuestTree(supabase, projectId)
  });
}

export function useFiaPericopes(projectId: string, enabled = true) {
  const { user, supabase } = useAuth();

  return useQuery({
    queryKey: ['qe-fia-pericopes', projectId],
    enabled: enabled && !!projectId && !!user,
    queryFn: async (): Promise<FiaPericopesResponse | null> => {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;
      if (!accessToken) {
        return null;
      }

      const { data: sourceLanguageLink, error: sourceLanguageError } =
        await supabase
          .from('project_language_link')
          .select('languoid_id')
          .eq('project_id', projectId)
          .eq('language_type', 'source')
          .not('languoid_id', 'is', null)
          .limit(1)
          .maybeSingle();

      if (sourceLanguageError) {
        throw sourceLanguageError;
      }

      const sourceLanguoidId = sourceLanguageLink?.languoid_id || null;
      if (!sourceLanguoidId) {
        return null;
      }

      const fiaLanguageCode = await lookupFiaLanguageCode(
        supabase,
        sourceLanguoidId
      );
      if (!fiaLanguageCode) {
        return null;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fia-pericopes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ fiaLanguageCode })
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Failed to fetch FIA pericopes (${response.status}): ${text || 'Unknown error'}`
        );
      }

      const payload = (await response.json()) as unknown;
      return normalizeFiaPericopesResponse(payload);
    }
  });
}

export function useQuestAssets(questId: string | null) {
  const { user, supabase } = useAuth();

  return useQuery({
    queryKey: ['qe-assets', questId],
    enabled: !!questId && !!user,
    queryFn: () => fetchQuestAssets(supabase, questId || '')
  });
}

export function useAssetDetails(assetId: string | null) {
  const { user, supabase } = useAuth();

  return useQuery({
    queryKey: ['qe-asset-details', assetId],
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

interface CreateFiaPericopePayload {
  projectId: string;
  bookId: string;
  bookName: string;
  pericopeId: string;
  sequence: number;
  verseRange: string;
  existingBookQuestId?: string | null;
}

export function useCreateBibleChapter() {
  const queryClient = useQueryClient();
  const { user, supabase } = useAuth();

  return useMutation({
    mutationFn: (payload: CreateBibleChapterPayload) =>
      createBibleChapterQuest(supabase, {
        ...payload,
        userId: user?.id
      }),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({
        queryKey: ['qe-tree', payload.projectId]
      });
    }
  });
}

export function useCreateFiaPericope() {
  const queryClient = useQueryClient();
  const { user, supabase } = useAuth();

  return useMutation({
    mutationFn: (payload: CreateFiaPericopePayload) =>
      createFiaPericopeQuest(supabase, {
        ...payload,
        userId: user?.id
      }),
    onSuccess: (_data, payload) => {
      queryClient.invalidateQueries({
        queryKey: ['qe-tree', payload.projectId]
      });
      queryClient.invalidateQueries({
        queryKey: ['qe-fia-pericopes', payload.projectId]
      });
    }
  });
}
