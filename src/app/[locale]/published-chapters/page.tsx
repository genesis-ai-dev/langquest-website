'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import WebPageWrapper from '@/components/WebPageWrapper';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Clock, Globe, TrendingUp, RefreshCw } from 'lucide-react';

// LangQuest Supabase credentials (public read-only access)
// Use LangQuest Supabase directly (not the EveryLanguage Supabase)
// Hardcoded since this is public data and the key is publishable (safe for client-side)
const LANGQUEST_SUPABASE_URL = 'https://unsxkmlcyxgtgmtzfonb.supabase.co';
const LANGQUEST_SUPABASE_KEY = 'sb_publishable_0R44K06is7-Z_Hrz_fRgKw_asps9S-w';

interface PublishedChapter {
  id: string;
  quest_id: string;
  project_id: string;
  audio_url: string | null;
  metadata: {
    manifest: {
      project_id: string;
      language_id: string;
      languoid: {
        id: string;
        name: string | null;
        level: 'family' | 'language' | 'dialect' | null;
      } | null;
      total_duration_ms: number;
      exported_at: string;
    };
    bible?: {
      book_id: string;
      chapter_num: number;
      chapter_ref: string;
      verses: Record<string, { start_ms: number; end_ms: number }>;
    };
  };
  export_type: string;
  status: string;
  checksum: string;
  created_at: string;
}

interface ChapterStats {
  totalChapters: number;
  totalLanguages: number;
  totalDurationHours: number;
  totalVerses: number;
}

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h ${remainingMinutes}m`;
  }
  return `${minutes}m`;
}

function formatDurationShort(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${seconds}s`;
}

export default function PublishedChaptersPage() {
  const [chapters, setChapters] = useState<PublishedChapter[]>([]);
  const [stats, setStats] = useState<ChapterStats>({
    totalChapters: 0,
    totalLanguages: 0,
    totalDurationHours: 0,
    totalVerses: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force re-fetch on refresh

  useEffect(() => {
    async function fetchPublishedChapters() {
      try {
        setIsLoading(true);
        const supabase = createClient(
          LANGQUEST_SUPABASE_URL,
          LANGQUEST_SUPABASE_KEY
        );

        // Fetch all ready distribution exports (these are published/ready for distribution)
        // Note: 'ready' means the export is complete and ready, 'ingested' means it's been imported to EveryLanguage
        // For the public page, we show 'ready' exports as they represent published work
        const { data, error: fetchError } = await supabase
          .from('export_quest_artifact')
          .select('*')
          .eq('export_type', 'distribution')
          .eq('status', 'ready') // Show only ready exports
          .order('created_at', { ascending: false });

        if (fetchError) {
          throw new Error(`Failed to fetch chapters: ${fetchError.message}`);
        }

        const publishedChapters = (data || []) as PublishedChapter[];
        setChapters(publishedChapters);

        // Calculate stats
        const uniqueLanguages = new Set(
          publishedChapters
            .map((c) => c.metadata.manifest.languoid?.id)
            .filter(Boolean)
        );

        const totalDurationMs = publishedChapters.reduce(
          (sum, c) => sum + c.metadata.manifest.total_duration_ms,
          0
        );

        const totalVerses = publishedChapters.reduce((sum, c) => {
          const verseCount = c.metadata.bible
            ? Object.keys(c.metadata.bible.verses || {}).length
            : 0;
          return sum + verseCount;
        }, 0);

        setStats({
          totalChapters: publishedChapters.length,
          totalLanguages: uniqueLanguages.size,
          totalDurationHours:
            Math.round((totalDurationMs / (1000 * 60 * 60)) * 10) / 10,
          totalVerses
        });
      } catch (err) {
        console.error('Error fetching published chapters:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load published chapters'
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchPublishedChapters();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // Construct full audio URL if it's a relative path
  const getAudioUrl = (audioUrl: string | null) => {
    if (!audioUrl) return null;
    if (audioUrl.startsWith('exports/')) {
      return `https://pub-e087d5324cc04baeb348956846543c2e.r2.dev/${audioUrl}`;
    }
    return audioUrl;
  };

  return (
    <WebPageWrapper>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
              <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  Published Bible Chapters
                </h1>
                <p className="max-w-[900px] text-muted-foreground md:text-xl">
                  See the concrete results of translation work completed through
                  LangQuest
                </p>
              </div>
              <Button
                onClick={handleRefresh}
                disabled={isLoading}
                variant="outline"
                className="mt-4"
              >
                <RefreshCw
                  className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
                />
                Refresh
              </Button>
            </div>

            {/* Stats Cards */}
            {!isLoading && !error && (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Chapters
                    </CardTitle>
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.totalChapters}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Published chapters
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Languages
                    </CardTitle>
                    <Globe className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.totalLanguages}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Unique languages
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Audio
                    </CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.totalDurationHours}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Hours of audio
                    </p>
                  </CardContent>
                </Card>

                {/* <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Verses
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats.totalVerses.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">
                      Verses with timing
                    </p>
                  </CardContent>
                </Card> */}
              </div>
            )}

            {/* Chapters List */}
            {isLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-4 text-muted-foreground">
                  Loading published chapters...
                </p>
              </div>
            ) : error ? (
              <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
                <CardContent className="pt-6">
                  <p className="text-red-600 dark:text-red-400">{error}</p>
                </CardContent>
              </Card>
            ) : chapters.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground">
                    No published chapters yet. Check back soon!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {chapters.map((chapter) => {
                  const languoid = chapter.metadata.manifest.languoid;
                  const bible = chapter.metadata.bible;
                  const verseCount = bible
                    ? Object.keys(bible.verses || {}).length
                    : 0;
                  const audioUrl = getAudioUrl(chapter.audio_url);

                  return (
                    <Card
                      key={chapter.id}
                      className="hover:shadow-lg transition-shadow"
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-lg">
                              {bible ? bible.chapter_ref : 'Chapter'}
                            </CardTitle>
                            <CardDescription>
                              {languoid?.name || 'Unknown Language'}
                            </CardDescription>
                          </div>
                          {languoid?.level && (
                            <Badge variant="secondary" className="text-xs">
                              {languoid.level}
                            </Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Duration</p>
                            <p className="font-medium">
                              {formatDuration(
                                chapter.metadata.manifest.total_duration_ms
                              )}
                            </p>
                          </div>
                          {verseCount > 0 && (
                            <div>
                              <p className="text-muted-foreground">Verses</p>
                              <p className="font-medium">{verseCount}</p>
                            </div>
                          )}
                        </div>

                        {bible && (
                          <div className="text-sm">
                            <p className="text-muted-foreground">Book</p>
                            <p className="font-medium">{bible.book_id}</p>
                          </div>
                        )}

                        <div className="text-xs text-muted-foreground">
                          Published{' '}
                          {new Date(chapter.created_at).toLocaleDateString(
                            'en-US',
                            {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            }
                          )}
                        </div>

                        {audioUrl && (
                          <div className="pt-2 border-t">
                            <audio
                              controls
                              className="w-full h-8"
                              preload="none"
                            >
                              <source src={audioUrl} type="audio/mpeg" />
                              <source src={audioUrl} type="audio/wav" />
                              Your browser does not support the audio element.
                            </audio>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </main>
    </WebPageWrapper>
  );
}
