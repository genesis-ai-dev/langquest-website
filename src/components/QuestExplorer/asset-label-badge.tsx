'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AssetLabelBadgeProps {
  text: string;
  className?: string;
}

export function AssetLabelBadge({ text, className }: AssetLabelBadgeProps) {
  if (!text?.trim()) {
    return null;
  }

  return (
    <div className={cn('py-1.5 flex justify-center', className)}>
      <Badge
        variant="outline"
        className="h-7 rounded-full border-border/60 bg-background/80 px-3 text-[11px] font-semibold tracking-wide text-muted-foreground shadow-sm backdrop-blur-[1px]"
      >
        {text}
      </Badge>
    </div>
  );
}
