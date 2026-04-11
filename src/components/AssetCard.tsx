'use client';

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { FileText, Image, Volume2, Languages } from 'lucide-react';

interface Asset {
  id: string;
  name: string | null;
  active: boolean;
  created_at: string;
  last_updated?: string;
  description?: string | null;
  images?: string[] | null;
  content?: Array<{
    id: string;
    text: string;
    audio?: string | null;
  }>;
  tags?: Array<{
    tag: {
      id: string;
      key: string;
      value: string;
    };
  }>;
  translations?: Array<{ count: number }>;
}

interface AssetCardProps {
  asset: Asset;
  isSelected?: boolean;
  onClick?: () => void;
  // icon?: React.ComponentType<{ className?: string }>;
}

export function AssetCard({
  asset,
  isSelected,
  onClick
  // icon: Icon = File
}: AssetCardProps) {
  return (
    <Card
      className={`flex h-36 min-h-36 max-h-36 flex-col gap-0 overflow-hidden p-0 hover:shadow-md transition-shadow cursor-pointer ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="p-2 px-4 bg-primary dark:bg-primary/40 text-primary-foreground h-12">
        <CardTitle className="text-base flex items-center gap-2 mt-1">
          {asset.content &&
            asset.content.some(
              (item) => item.text && item.text.trim() !== ''
            ) && (
              <div className="bg-primary-foreground/30 dark:bg-secondary-foreground/30 rounded p-1">
                <FileText className="w-4 h-4 dark:invert dark:text-primary-foreground/60" />
              </div>
            )}
          {asset.images && asset.images.length > 0 && (
            <div className="bg-primary-foreground/30 dark:bg-secondary-foreground/30 rounded p-1">
              <Image className="w-4 h-4 dark:invert dark:text-primary-foreground/60" />
            </div>
          )}
          {asset.content && asset.content?.some((item) => item.audio) && (
            <div className="bg-primary-foreground/30 dark:bg-secondary-foreground/30 rounded p-1">
              <Volume2 className="w-4 h-4 dark:invert dark:text-primary-foreground/60" />
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 overflow-hidden py-2">
        <p className="text-muted-foreground line-clamp-2 overflow-hidden font-semibold">
          {asset.name}
        </p>
        <div className="mt-1 text-xs text-muted-foreground truncate">
          {asset.tags && asset.tags.length > 0
            ? asset.tags
                .map((tagLink) => `${tagLink.tag.key}:${tagLink.tag.value}`)
                .join(' • ')
            : ''}
        </div>

        {/* <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Created: {new Date(asset.created_at).toLocaleDateString()}
          </span>
          <Badge
            variant={asset.active ? 'default' : 'secondary'}
            className="text-xs"
          >
            {asset.active ? 'Active' : 'Inactive'}
          </Badge>
        </div> */}
      </CardContent>
      <CardFooter className="h-8 border-t px-4 text-xs text-muted-foreground flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <Languages className="w-3 h-3" />
          <span className="truncate">
            {asset.translations && asset.translations.length > 0
              ? `${asset.translations[0].count} Translation${
                  asset.translations[0].count !== 1 ? 's' : ''
                }`
              : '0 Translations'}
          </span>
        </div>
        <div className="shrink-0">
          <span className="whitespace-nowrap">
            {new Date(asset.created_at).toLocaleDateString()}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}
