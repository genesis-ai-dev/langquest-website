'use client';

import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Car, File, FileText, Image, Volume2, Languages } from 'lucide-react';

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
      className={`gap-4 h-36 hover:shadow-md transition-shadow cursor-pointer p-0 overflow-hidden  ${
        isSelected ? 'ring-2 ring-primary' : ''
      }`}
      onClick={onClick}
    >
      <CardHeader className="p-2 px-4 bg-primary text-primary-foreground h-12">
        <CardTitle className="text-base flex items-center gap-2 mt-1">
          {asset.content &&
            asset.content.some(
              (item) => item.text && item.text.trim() !== ''
            ) && (
              <div className="bg-primary-foreground/30 rounded p-1">
                <FileText className="w-4 h-4" />
              </div>
            )}
          {asset.images && asset.images.length > 0 && (
            <div className="bg-primary-foreground/30 rounded p-1">
              <Image className="w-4 h-4" />
            </div>
          )}
          {asset.content && asset.content?.some((item) => item.audio) && (
            <div className="bg-primary-foreground/30 rounded p-1">
              <Volume2 className="w-4 h-4" />
            </div>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-4 max-h-4">
        <p className="text-muted-foreground line-clamp-3 overflow-clip font-semibold truncate">
          {asset.name}
        </p>
        <div className="text-xs text-muted-foreground truncate">
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
      <CardFooter className="mt-4 text-xs text-muted-foreground pt-1 border-t flex justify-between">
        <div className="flex items-center gap-1">
          <Languages className="w-3 h-3" />
          <span>
            {asset.translations && asset.translations.length > 0
              ? `${asset.translations[0].count} Translation${
                  asset.translations[0].count !== 1 ? 's' : ''
                }`
              : '0 Translations'}
          </span>
        </div>
        <div>
          <span>{new Date(asset.created_at).toLocaleDateString()}</span>
        </div>
      </CardFooter>
    </Card>
  );
}
