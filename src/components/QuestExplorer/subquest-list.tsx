'use client';

import { DisplayNode } from './model';
import { SubquestListItem } from './subquest-list-item';

interface SubquestListProps {
  nodes: DisplayNode[];
  selectedKey?: string | null;
  emptyMessage: string;
  onSelect: (node: DisplayNode) => void;
}

export function SubquestList({
  nodes,
  selectedKey,
  emptyMessage,
  onSelect
}: SubquestListProps) {
  if (nodes.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-8 text-center">
        {emptyMessage}
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2 p-2">
      {nodes.map((node) => {
        const isSelected = selectedKey === node.key;

        return (
          <li key={node.key} className="relative">
            <SubquestListItem
              node={node}
              isSelected={isSelected}
              onSelect={onSelect}
            />
          </li>
        );
      })}
    </ul>
  );
}
