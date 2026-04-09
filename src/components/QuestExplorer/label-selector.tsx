'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AvailableLabel, LabelSelection } from './template-strategies/types';

export type LabelSelectorSelection = LabelSelection;

interface LabelSelectorProps {
  labels: AvailableLabel[];
  allowRange?: boolean;
  onApply: (selection: LabelSelectorSelection | null) => void;
  className?: string;
}

export function LabelSelector({
  labels,
  allowRange = false,
  onApply,
  className
}: LabelSelectorProps) {
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [endIndex, setEndIndex] = useState<number | null>(null);

  const selectedIndexes = useMemo(() => {
    if (startIndex === null) {
      return new Set<number>();
    }

    const toIndex = endIndex ?? startIndex;
    const min = Math.min(startIndex, toIndex);
    const max = Math.max(startIndex, toIndex);
    const output = new Set<number>();

    for (let index = min; index <= max; index += 1) {
      output.add(index);
    }

    return output;
  }, [endIndex, startIndex]);

  const buildSelection = (
    fromIndex: number,
    toIndex: number
  ): LabelSelectorSelection | null => {
    const min = Math.min(fromIndex, toIndex);
    const max = Math.max(fromIndex, toIndex);
    const items = labels.slice(min, max + 1);
    const from = items[0];
    const to = items[items.length - 1];

    if (!from || !to) {
      return null;
    }

    return {
      from,
      to,
      items,
      isRange: items.length > 1
    };
  };

  const canBuildRange = (from: number, to: number) => {
    const min = Math.min(from, to);
    const max = Math.max(from, to);

    for (let index = min; index <= max; index += 1) {
      if (labels[index]?.inUse) {
        return false;
      }
    }

    return true;
  };

  const handleSelect = (index: number) => {
    const current = labels[index];
    if (!current) {
      return;
    }
    const isAlreadySelected = selectedIndexes.has(index);
    if (isAlreadySelected) {
      setStartIndex(null);
      setEndIndex(null);
      onApply(null);
      return;
    }

    if (current.inUse) {
      setStartIndex(index);
      setEndIndex(index);
      const selection = buildSelection(index, index);
      if (selection) {
        onApply(selection);
      }
      return;
    }

    if (!allowRange) {
      setStartIndex(index);
      setEndIndex(index);
      const selection = buildSelection(index, index);
      if (selection) {
        onApply(selection);
      }
      return;
    }

    if (startIndex === null || (startIndex !== null && endIndex !== null)) {
      setStartIndex(index);
      setEndIndex(null);
      const selection = buildSelection(index, index);
      if (selection) {
        onApply(selection);
      }
      return;
    }

    if (!canBuildRange(startIndex, index)) {
      setStartIndex(index);
      setEndIndex(index);
      const selection = buildSelection(index, index);
      if (selection) {
        onApply(selection);
      }
      return;
    }

    setEndIndex(index);
    const selection = buildSelection(startIndex, index);
    if (selection) {
      onApply(selection);
    }
  };

  return (
    <div
      className={cn(
        'w-[440px] max-w-full overflow-hidden space-y-2 ',
        className
      )}
    >
      <div className="rounded-lg border border-border/70 bg-muted/20 p-2 py-4">
        <div className="scroll-thin-soft w-full min-w-0 overflow-x-auto overflow-y-hidden">
          <div className="inline-flex min-w-max items-center gap-0 pb-1">
            {labels.map((label, index) => {
              const isSelected = selectedIndexes.has(index);
              const isPrevSelected = selectedIndexes.has(index - 1);
              const isNextSelected = selectedIndexes.has(index + 1);

              return (
                <Button
                  key={`${label.name}:${index}`}
                  type="button"
                  size="sm"
                  variant={isSelected ? 'default' : 'outline'}
                  onClick={() => handleSelect(index)}
                  className={cn(
                    'h-7 px-2 text-xs',
                    isSelected ? 'rounded-none' : 'rounded-md',
                    isSelected && !isPrevSelected && 'rounded-l-md',
                    isSelected && !isNextSelected && 'rounded-r-md',
                    isSelected && !isPrevSelected && 'ml-2',
                    isSelected && isPrevSelected && '-ml-px',
                    !isSelected && isPrevSelected && 'ml-1',
                    isSelected && !isNextSelected && 'mr-1',
                    label.inUse && !isSelected && 'opacity-80'
                  )}
                >
                  {label.name}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
