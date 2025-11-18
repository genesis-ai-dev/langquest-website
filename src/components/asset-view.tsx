'use client';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel';
import {
  ThumbsDownIcon,
  ThumbsUpIcon,
  //  ImageIcon,
  PlayIcon,
  PauseIcon,
  MapPinIcon,
  TagIcon,
  ExpandIcon,
  //  XIcon,
  VolumeIcon,
  BookOpenIcon
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from './ui/dialog';
import { useAuth } from '@/components/auth-provider';
import { getSupabaseCredentials } from '@/lib/supabase';
import { env } from '@/lib/env';
import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';

// Types based on the existing data-view.tsx types
export interface Vote {
  id: string;
  polarity: string;
}

export interface TargetLanguage {
  id: string;
  english_name: string;
}

export interface Content {
  id: string;
  text: string;
  audio: [string] | string;
}

export interface Tag {
  tag:
    | {
        id: string;
        key: string;
        value: string;
      }
    | string;
}

export interface Asset {
  id: string;
  name: string;
  translations: {
    id: string;
    // text: string;
    // audio: string;
    // target_language: TargetLanguage;
    content?: {
      text: string;
      audio: string;
    }[];
    votes: Vote[];
  }[];
  content: Content[];
  tags: Tag[];
  quests: {
    quest?: {
      id: string;
      name: string;
      tags: Tag[];
      project: {
        id: string;
        name: string;
        description: string;
      };
      description: string;
    };
  }[];
  images?: string[];
}

interface AssetViewProps {
  asset: Asset;
}

// Custom Audio Player Component with Progress
interface AudioPlayerProps {
  src: string;
  className?: string;
}

function AudioPlayer({ src, className = '' }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateProgress = () => {
      if (audio.duration) {
        setProgress((audio.currentTime / audio.duration) * 100);
        setCurrentTime(audio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };

    const handleError = (e: Event) => {
      console.error('Audio loading error:', e, 'src:', src);
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', updateProgress);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;

    audio.currentTime = newTime;
    setCurrentTime(newTime);
    setProgress((newTime / duration) * 100);
  };

  // Don't render if src is invalid
  if (!src || src.trim() === '') {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-3 p-3 bg-muted/30 rounded-lg ${className}`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      <Button
        size="sm"
        variant="outline"
        onClick={togglePlay}
        className="h-8 w-8 p-0 rounded-full"
      >
        {isPlaying ? (
          <PauseIcon className="size-4" />
        ) : (
          <PlayIcon className="size-4" />
        )}
      </Button>

      <div className="flex-1 flex items-center gap-2">
        <div
          className="flex-1 h-2 bg-muted rounded-full cursor-pointer overflow-hidden"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-primary transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {duration > 0 && (
          <span className="text-xs text-muted-foreground tabular-nums min-w-fit">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        )}
      </div>
    </div>
  );
}

export function AssetView({ asset }: AssetViewProps) {
  const t = useTranslations('data_view');
  const { environment } = useAuth();
  const credentials = getSupabaseCredentials(environment);

  console.log('Rendering AssetView for asset:', asset);

  if (!asset) return <div>No asset data available.</div>;

  return (
    <div className="space-y-6 p-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div className="pb-3 border-b-2 border-primary/20">
          <h2 className="text-2xl font-bold text-foreground leading-tight">
            {asset.name}
          </h2>
        </div>

        {/* Tags */}
        {asset.tags && asset.tags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TagIcon className="size-4" />
              <span className="text-sm font-medium">Tags:</span>
            </div>
            {asset.tags.map((tag) => (
              <Badge
                variant="secondary"
                key={typeof tag.tag === 'string' ? tag.tag : tag.tag?.id}
                className="text-xs px-2 py-1 bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                {typeof tag.tag === 'string'
                  ? tag.tag
                  : `${tag.tag?.key}: ${tag.tag?.value || 'Unknown Tag'}`}
              </Badge>
            ))}
          </div>
        )}

        {/* Quests */}
        {asset.quests && asset.quests.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPinIcon className="size-4" />
              <span className="text-sm font-medium">Quests:</span>
            </div>
            {asset.quests.map((questLink, index) =>
              questLink.quest ? (
                <Badge
                  variant="secondary"
                  key={index}
                  className="text-xs px-2 py-1 bg-green-500/10 hover:bg-green-500/20 transition-colors border-green-500/20"
                >
                  {questLink.quest.name || 'Unnamed Quest'}
                </Badge>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* Source Content Section */}
      {((asset.content && asset.content.length > 0) ||
        (asset.images && asset.images.length > 0)) && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-2 border-b border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 text-white">
              <BookOpenIcon className="size-4" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {t('sourceContent', {
                count:
                  (asset.content ? asset.content.length : 0) +
                  (asset.images ? asset.images.length : 0)
              })}
            </h3>
          </div>

          <div className="bg-muted/15 rounded-lg p-3 space-y-4">
            {/* Images within Source Content */}
            {asset.images && asset.images.length > 0 && (
              <div className="space-y-3">
                {/* <div className="flex items-center gap-2 text-muted-foreground">
                  <ImageIcon className="size-4" />
                  <span className="text-sm font-medium">
                    {t('images', { count: asset.images.length })}
                  </span>
                </div> */}
                <div className="bg-muted/20 rounded-lg p-3">
                  <Carousel className="w-full max-w-xl mx-auto">
                    <CarouselContent>
                      {asset.images.map((image, index) => (
                        <CarouselItem key={index}>
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="relative aspect-video rounded-xl overflow-hidden bg-muted cursor-pointer group">
                                <img
                                  src={`${credentials.url.replace(/\/$/, '')}/storage/v1/object/public/${env.NEXT_PUBLIC_SUPABASE_BUCKET}/${image}`}
                                  alt={`${asset.name} - Image ${index + 1}`}
                                  className="w-full h-full object-contain transition-all duration-300 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                                  <ExpandIcon className="size-8 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                </div>
                              </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl w-full p-4">
                              <DialogTitle>
                                {asset.name} - Image {index + 1}
                              </DialogTitle>
                              <img
                                src={`${credentials.url.replace(/\/$/, '')}/storage/v1/object/public/${env.NEXT_PUBLIC_SUPABASE_BUCKET}/${image}`}
                                alt={`${asset.name} - Image ${index + 1}`}
                                className="w-full h-auto"
                              />
                            </DialogContent>
                          </Dialog>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </Carousel>
                </div>
              </div>
            )}

            {/* Text Content within Source Content */}
            {asset.content &&
              asset.content.length > 0 &&
              asset.content.map((content, index) => (
                <div
                  key={index}
                  className="bg-background/60 rounded-lg p-4 border border-border/50"
                >
                  <div className="space-y-3">
                    <p className="text-sm text-foreground leading-relaxed font-medium">
                      {content.text || <i>{t('noText')}</i>}
                    </p>
                    {Array.isArray(content.audio) && content.audio[0] ? (
                      <AudioPlayer
                        src={`${credentials.url.replace(/\/$/, '')}/storage/v1/object/public/${env.NEXT_PUBLIC_SUPABASE_BUCKET}/${content.audio[0]}`}
                      />
                    ) : typeof content.audio === 'string' && content.audio ? (
                      <AudioPlayer
                        src={`${credentials.url.replace(/\/$/, '')}/storage/v1/object/public/${env.NEXT_PUBLIC_SUPABASE_BUCKET}/${content.audio}`}
                      />
                    ) : null}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Translations Section with Scroll */}
      {asset.translations && asset.translations.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 pb-2 border-b border-orange-200 dark:border-orange-800">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 text-white">
              <VolumeIcon className="size-4" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              {t('translations', { count: asset.translations.length })}
            </h3>
          </div>

          <div className="bg-muted/15 rounded-lg p-3 ">
            <ScrollArea className="h-80 w-full">
              <div className="space-y-2 pr-3 bf">
                {asset.translations.map((translation, index) => (
                  <div
                    key={index}
                    className="flex w-full justify-betweenbg-background border border-border/50 rounded-md p-3 space-y-2 hover:border-border hover:bg-background/80 transition-all duration-200"
                  >
                    {/* Translation Header */}
                    {(translation.content?.length ?? 0) > 0 &&
                      translation.content?.map((item, itemIndex) => (
                        <div key={itemIndex} className="space-y-2 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p
                                className={`font-medium text-foreground text-sm line-clamp-2 leading-snug ${
                                  !item.text || item.text.trim() === ''
                                    ? 'italic text-muted-foreground'
                                    : ''
                                }`}
                              >
                                {item.text || t('noText')}
                              </p>
                            </div>
                          </div>

                          {/* Audio Player and Voting Row */}
                          <div className="flex items-center justify-between gap-3">
                            {/* Audio Player - Same width as text above */}
                            {item.audio ? (
                              <div className="flex-1 min-w-0">
                                <AudioPlayer
                                  src={`${credentials.url.replace(/\/$/, '')}/storage/v1/object/public/${env.NEXT_PUBLIC_SUPABASE_BUCKET}/${item.audio}`}
                                />
                              </div>
                            ) : (
                              <div className="flex-1"></div>
                            )}
                          </div>
                        </div>
                      ))}
                    {/* Voting - Right side (flex-shrink-0 to maintain size) */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-950 rounded-full">
                          <ThumbsUpIcon className="size-3 text-green-600" />
                          <span className="text-xs font-medium text-green-600">
                            {translation?.votes && translation.votes?.length > 0
                              ? translation.votes.filter(
                                  (vote) => vote.polarity === 'up'
                                ).length
                              : 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-red-50 dark:bg-red-950 rounded-full">
                          <ThumbsDownIcon className="size-3 text-red-500" />
                          <span className="text-xs font-medium text-red-500">
                            {translation?.votes && translation.votes?.length > 0
                              ? translation.votes.filter(
                                  (vote) => vote.polarity === 'down'
                                ).length
                              : 0}
                          </span>
                        </div>
                      </>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
