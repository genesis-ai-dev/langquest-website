'use client';

import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useState
} from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { FileIcon, FolderIcon, FolderOpenIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox2 } from '@/components/ui/checkbox-2';
import { Badge } from '@/components/ui/badge';

type TreeViewElement = {
  id: string;
  name: string;
  label?: string;
  extraContent?: React.ReactNode;
  created_at?: string;
  type?: 'file' | 'folder';
  isSelectable?: boolean;
  children?: TreeViewElement[];
};

type TreeSortMode =
  | 'default'
  | 'none'
  | ((a: TreeViewElement, b: TreeViewElement) => number);

type TreeCheckedState = boolean | 'indeterminate';

type TreeContextProps = {
  selectedId: string | undefined;
  expandedItems: string[] | undefined;
  indicator: boolean;
  handleExpand: (id: string) => void;
  selectItem: (id: string) => void;
  setExpandedItems?: React.Dispatch<React.SetStateAction<string[] | undefined>>;
  getCheckedState?: (element: TreeViewElement) => TreeCheckedState;
  onCheckedChange?: (element: TreeViewElement, checked: boolean) => void;
  showIcons: boolean;
  showLabels: boolean;
  showExtraContent: boolean;
  showDates: boolean;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
  fileIcon?: React.ReactNode;
  direction: 'rtl' | 'ltr';
};

const TreeContext = createContext<TreeContextProps | null>(null);

const useTree = () => {
  const context = useContext(TreeContext);
  if (!context) {
    throw new Error('useTree must be used within a TreeProvider');
  }
  return context;
};

type Direction = 'rtl' | 'ltr' | undefined;

const isFolderElement = (element: TreeViewElement) => {
  if (element.type) {
    return element.type === 'folder';
  }

  return Array.isArray(element.children);
};

const mergeExpandedItems = (
  currentItems: string[] | undefined,
  nextItems: string[]
) => [...new Set([...(currentItems ?? []), ...nextItems])];

const treeCollator = new Intl.Collator('en', {
  numeric: true,
  sensitivity: 'base'
});

const defaultTreeComparator = (a: TreeViewElement, b: TreeViewElement) => {
  const aIsFolder = isFolderElement(a);
  const bIsFolder = isFolderElement(b);

  if (aIsFolder !== bIsFolder) {
    return aIsFolder ? -1 : 1;
  }

  return treeCollator.compare(a.name, b.name);
};

const getTreeComparator = (sort: TreeSortMode) => {
  if (sort === 'none') {
    return undefined;
  }

  if (sort === 'default') {
    return defaultTreeComparator;
  }

  return sort;
};

const sortTreeElements = (
  elements: TreeViewElement[],
  sort: TreeSortMode
): TreeViewElement[] => {
  const comparator = getTreeComparator(sort);

  const nextElements = elements.map((element) => {
    if (!Array.isArray(element.children)) {
      return element;
    }

    return {
      ...element,
      children: sortTreeElements(element.children, sort)
    };
  });

  if (!comparator) {
    return nextElements;
  }

  return [...nextElements].sort(comparator);
};

const formatCreatedAt = (value?: string) => {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short'
  });
};

const renderTreeElements = (
  elements: TreeViewElement[],
  sort: TreeSortMode
): React.ReactNode =>
  sortTreeElements(elements, sort).map((element) => {
    if (isFolderElement(element)) {
      return (
        <Folder
          key={element.id}
          value={element.id}
          element={element.name}
          treeElement={element}
          label={element.label}
          extraContent={element.extraContent}
          createdAt={element.created_at}
          isSelectable={element.isSelectable}
        >
          {Array.isArray(element.children)
            ? renderTreeElements(element.children, sort)
            : null}
        </Folder>
      );
    }

    return (
      <File
        key={element.id}
        value={element.id}
        treeElement={element}
        label={element.label}
        extraContent={element.extraContent}
        createdAt={element.created_at}
        isSelectable={element.isSelectable}
      >
        <span>{element.name}</span>
      </File>
    );
  });

type TreeViewProps = {
  initialSelectedId?: string;
  indicator?: boolean;
  elements?: TreeViewElement[];
  initialExpandedItems?: string[];
  onSelectItem?: (id: string) => void;
  getCheckedState?: (element: TreeViewElement) => TreeCheckedState;
  onCheckedChange?: (element: TreeViewElement, checked: boolean) => void;
  showIcons?: boolean;
  showLabels?: boolean;
  showExtraContent?: boolean;
  showDates?: boolean;
  openIcon?: React.ReactNode;
  closeIcon?: React.ReactNode;
  fileIcon?: React.ReactNode;
  sort?: TreeSortMode;
} & Omit<
  React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Root>,
  'defaultValue' | 'onValueChange' | 'type' | 'value'
>;

const Tree = forwardRef<HTMLDivElement, TreeViewProps>(
  (
    {
      className,
      elements,
      initialSelectedId,
      initialExpandedItems,
      onSelectItem,
      getCheckedState,
      onCheckedChange,
      children,
      indicator = true,
      showIcons = false,
      showLabels = false,
      showExtraContent = false,
      showDates = false,
      openIcon,
      closeIcon,
      fileIcon,
      sort = 'default',
      dir,
      ...props
    },
    ref
  ) => {
    const [selectedId, setSelectedId] = useState<string | undefined>(
      initialSelectedId
    );
    const [expandedItems, setExpandedItems] = useState<string[] | undefined>(
      initialExpandedItems
    );

    const selectItem = useCallback(
      (id: string) => {
        setSelectedId(id);
        onSelectItem?.(id);
      },
      [onSelectItem]
    );

    const handleExpand = useCallback((id: string) => {
      setExpandedItems((prev) => {
        if (prev?.includes(id)) {
          return prev.filter((item) => item !== id);
        }
        return [...(prev ?? []), id];
      });
    }, []);

    const expandSpecificTargetedElements = useCallback(
      (elements?: TreeViewElement[], selectId?: string) => {
        if (!elements || !selectId) return;
        const findParent = (
          currentElement: TreeViewElement,
          currentPath: string[] = []
        ) => {
          const isSelectable = currentElement.isSelectable ?? true;
          const newPath = [...currentPath, currentElement.id];
          if (currentElement.id === selectId) {
            if (isSelectable) {
              setExpandedItems((prev) => mergeExpandedItems(prev, newPath));
            } else {
              if (newPath.includes(currentElement.id)) {
                newPath.pop();
                setExpandedItems((prev) => mergeExpandedItems(prev, newPath));
              }
            }
            return;
          }
          if (
            Array.isArray(currentElement.children) &&
            currentElement.children.length > 0
          ) {
            currentElement.children.forEach((child) => {
              findParent(child, newPath);
            });
          }
        };
        elements.forEach((element) => {
          findParent(element);
        });
      },
      []
    );

    useEffect(() => {
      if (initialSelectedId) {
        expandSpecificTargetedElements(elements, initialSelectedId);
      }
    }, [initialSelectedId, elements, expandSpecificTargetedElements]);

    const direction = dir === 'rtl' ? 'rtl' : 'ltr';
    const treeChildren =
      children ?? (elements ? renderTreeElements(elements, sort) : null);

    return (
      <TreeContext.Provider
        value={{
          selectedId,
          expandedItems,
          handleExpand,
          selectItem,
          setExpandedItems,
          indicator,
          getCheckedState,
          onCheckedChange,
          showIcons,
          showLabels,
          showExtraContent,
          showDates,
          openIcon,
          closeIcon,
          fileIcon,
          direction
        }}
      >
        <div className={cn('size-full', className)}>
          <ScrollArea
            ref={ref}
            className="relative h-full px-2"
            dir={dir as Direction}
            horizontal
          >
            <AccordionPrimitive.Root
              {...props}
              type="multiple"
              value={expandedItems}
              className="flex w-max min-w-full flex-col gap-1"
              dir={dir as Direction}
            >
              {treeChildren}
            </AccordionPrimitive.Root>
          </ScrollArea>
        </div>
      </TreeContext.Provider>
    );
  }
);

Tree.displayName = 'Tree';

const TreeIndicator = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  const { direction } = useTree();

  return (
    <div
      dir={direction}
      ref={ref}
      className={cn(
        'bg-muted absolute left-1.5 h-full w-px rounded-md py-3 duration-300 ease-in-out hover:bg-slate-300 rtl:right-1.5',
        className
      )}
      {...props}
    />
  );
});

TreeIndicator.displayName = 'TreeIndicator';

type FolderProps = {
  expandedItems?: string[];
  element: string;
  treeElement: TreeViewElement;
  label?: string;
  extraContent?: React.ReactNode;
  createdAt?: string;
  isSelectable?: boolean;
  isSelect?: boolean;
} & React.ComponentPropsWithoutRef<typeof AccordionPrimitive.Item>;

const Folder = forwardRef<
  HTMLDivElement,
  FolderProps & React.HTMLAttributes<HTMLDivElement>
>(
  (
    {
      className,
      element,
      treeElement,
      label,
      extraContent,
      createdAt,
      value,
      isSelectable = true,
      isSelect,
      children,
      ...props
    },
    ref
  ) => {
    const {
      direction,
      handleExpand,
      expandedItems,
      indicator,
      selectedId,
      selectItem,
      getCheckedState,
      onCheckedChange,
      showIcons,
      showLabels,
      showExtraContent,
      showDates,
      openIcon,
      closeIcon
    } = useTree();
    const isSelected = isSelect ?? selectedId === value;
    const formattedCreatedAt = showDates ? formatCreatedAt(createdAt) : null;

    return (
      <AccordionPrimitive.Item
        ref={ref}
        {...props}
        value={value}
        className="relative h-full w-max min-w-full overflow-hidden"
      >
        <div
          className={cn(
            `flex w-max min-w-full items-center gap-1 rounded-md text-sm`,
            className,
            {
              'bg-accent/60 rounded-xs': isSelected && isSelectable,
              'cursor-pointer': isSelectable,
              'cursor-not-allowed opacity-50': !isSelectable
            }
          )}
        >
          <Checkbox2
            className="mr-1"
            checked={getCheckedState?.(treeElement) ?? false}
            disabled={!isSelectable}
            onCheckedChange={(checked) =>
              onCheckedChange?.(treeElement, checked === true)
            }
          />
          <AccordionPrimitive.Trigger
            className="flex min-w-0 flex-1 items-center gap-1 text-left"
            disabled={!isSelectable}
            onClick={() => {
              selectItem(value);
              handleExpand(value);
            }}
          >
            {showIcons &&
              (expandedItems?.includes(value)
                ? (openIcon ?? <FolderOpenIcon className="size-4" />)
                : (closeIcon ?? <FolderIcon className="size-4" />))}
            <span>{element}</span>
            {showExtraContent && extraContent ? (
              <Badge variant="outline" className="ml-1 rounded-sm text-[10px]">
                {extraContent}
              </Badge>
            ) : null}
            {showLabels && label ? (
              <Badge variant="outline" className="ml-1 rounded-sm text-[10px]">
                {label}
              </Badge>
            ) : null}
            {formattedCreatedAt ? (
              <Badge
                variant="secondary"
                className="ml-1 text-[10px] rounded-sm"
              >
                {formattedCreatedAt}
              </Badge>
            ) : null}
          </AccordionPrimitive.Trigger>
        </div>
        <AccordionPrimitive.Content className="data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down relative h-full overflow-hidden text-sm">
          {element && indicator && <TreeIndicator aria-hidden="true" />}
          <AccordionPrimitive.Root
            dir={direction}
            type="multiple"
            className="ml-5 flex w-max min-w-full flex-col gap-1 py-1 rtl:mr-5"
            value={expandedItems}
          >
            {children}
          </AccordionPrimitive.Root>
        </AccordionPrimitive.Content>
      </AccordionPrimitive.Item>
    );
  }
);

Folder.displayName = 'Folder';

const File = forwardRef<
  HTMLDivElement,
  {
    value: string;
    treeElement: TreeViewElement;
    label?: string;
    extraContent?: React.ReactNode;
    createdAt?: string;
    handleSelect?: (id: string) => void;
    isSelectable?: boolean;
    isSelect?: boolean;
  } & React.HTMLAttributes<HTMLDivElement>
>(
  (
    {
      value,
      treeElement,
      label,
      extraContent,
      createdAt,
      className,
      handleSelect,
      onClick,
      isSelectable = true,
      isSelect,
      children,
      ...props
    },
    ref
  ) => {
    const {
      direction,
      selectedId,
      selectItem,
      getCheckedState,
      onCheckedChange,
      showIcons,
      showLabels,
      showExtraContent,
      showDates,
      fileIcon
    } = useTree();
    const isSelected = isSelect ?? selectedId === value;
    const formattedCreatedAt = showDates ? formatCreatedAt(createdAt) : null;
    return (
      <div
        ref={ref}
        role="button"
        tabIndex={isSelectable ? 0 : -1}
        aria-disabled={!isSelectable}
        className={cn(
          'flex w-max min-w-full items-center gap-1 rounded-md pr-1 text-sm duration-200 ease-in-out rtl:pr-0 rtl:pl-1',
          {
            'bg-accent rounded-sm': isSelected && isSelectable
          },
          isSelectable ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
          direction === 'rtl' ? 'rtl' : 'ltr',
          className
        )}
        onClick={(event) => {
          if (!isSelectable) return;
          selectItem(value);
          handleSelect?.(value);
          onClick?.(event);
        }}
        onKeyDown={(event) => {
          if (!isSelectable) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            selectItem(value);
            handleSelect?.(value);
          }
        }}
        {...props}
      >
        <Checkbox2
          className="mr-1"
          checked={getCheckedState?.(treeElement) ?? false}
          disabled={!isSelectable}
          onCheckedChange={(checked) =>
            onCheckedChange?.(treeElement, checked === true)
          }
        />
        {showIcons && (fileIcon ?? <FileIcon className="size-4" />)}
        {children}
        {showExtraContent && extraContent ? (
          <Badge variant="outline" className="ml-1 rounded-sm text-[9px]">
            {extraContent}
          </Badge>
        ) : null}
        {showLabels && label ? (
          <Badge variant="outline" className="ml-1 rounded-sm text-[9px]">
            {label}
          </Badge>
        ) : null}
        {formattedCreatedAt ? (
          <Badge variant="secondary" className="ml-1 text-[9px] rounded-sm">
            {formattedCreatedAt}
          </Badge>
        ) : null}
      </div>
    );
  }
);

File.displayName = 'File';

const CollapseButton = forwardRef<
  HTMLButtonElement,
  {
    elements: TreeViewElement[];
    expandAll?: boolean;
  } & React.HTMLAttributes<HTMLButtonElement>
>(({ className, elements, expandAll = false, children, ...props }, ref) => {
  const { expandedItems, setExpandedItems } = useTree();

  const expendAllTree = useCallback((elements: TreeViewElement[]) => {
    const expandedElementIds: string[] = [];

    const expandTree = (element: TreeViewElement) => {
      const isSelectable = element.isSelectable ?? true;
      if (isSelectable && element.children && element.children.length > 0) {
        expandedElementIds.push(element.id);
        for (const child of element.children) {
          expandTree(child);
        }
      }
    };

    for (const element of elements) {
      expandTree(element);
    }

    return [...new Set(expandedElementIds)];
  }, []);

  const closeAll = useCallback(() => {
    setExpandedItems?.([]);
  }, [setExpandedItems]);

  useEffect(() => {
    if (expandAll) {
      setExpandedItems?.(expendAllTree(elements));
    }
  }, [expandAll, elements, expendAllTree, setExpandedItems]);

  return (
    <Button
      variant={'ghost'}
      className={cn('absolute right-2 bottom-1 h-8 w-fit p-1', className)}
      onClick={
        expandedItems && expandedItems.length > 0
          ? closeAll
          : () => setExpandedItems?.(expendAllTree(elements))
      }
      ref={ref}
      {...props}
    >
      {children}
      <span className="sr-only">Toggle</span>
    </Button>
  );
});

CollapseButton.displayName = 'CollapseButton';

export { CollapseButton, File, Folder, Tree, type TreeViewElement };
export type { TreeCheckedState, TreeSortMode };
