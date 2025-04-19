'use client';

import { AudioButton } from '@/components/ui/audio-button';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { env } from '@/lib/env';
import { supabase } from '@/lib/supabase/client';
import { cn, toProperCase } from '@/lib/utils';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable
} from '@tanstack/react-table';
import { format } from 'date-fns';
import JSZip from 'jszip';
import {
  AlignJustify,
  ArrowLeft,
  ArrowRight,
  CalendarIcon,
  ChevronDown,
  ChevronRight,
  Columns3,
  Download,
  FileJson,
  FileSpreadsheet,
  Filter,
  List,
  PanelLeft,
  Plus,
  X
} from 'lucide-react';
import {
  createParser,
  parseAsBoolean,
  parseAsInteger,
  parseAsJson,
  useQueryState
} from 'nuqs';
import * as React from 'react';
import { z } from 'zod';
import { Database } from '../../database.types';
import { Spinner } from './spinner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from './ui/sheet';

// Define base types

import { Num, Plural, T, Var } from 'gt-next';
import { useGT } from 'gt-next/client';
type ColumnType = 'string' | 'number' | 'boolean' | 'timestamp' | 'uuid';

const visibilityStateSchema = z.record(z.boolean());

interface TableSchema {
  name: string;
  columns: {
    key: string;
    header: string;
    type: ColumnType;
    required: boolean;
    foreignKey?: {
      table: keyof Database['public']['Tables'];
      column: string;
    };
    isVirtual?: boolean;
    reverseRelationship?: {
      sourceTable: keyof Database['public']['Tables'];
      sourceColumn: string;
      isLinkTable?: boolean;
      throughTable?: keyof Database['public']['Tables'];
      throughSourceColumn?: string;
      throughTargetColumn?: string;
    };
  }[];
}

interface TableData {
  data: { [key: string]: string | number | boolean | null }[];
  count: number;
}

// Convert the JSON schema to our table schema format
const convertJsonSchemaToTableSchema = (
  name: keyof Database['public']['Tables'],
  schema: any
): TableSchema => {
  const columns = Object.entries(schema.properties).map(
    ([key, value]: [string, any]) => {
      let type: ColumnType = 'string';

      if (value.format === 'uuid') type = 'uuid';
      else if (value.format === 'timestamp with time zone') type = 'timestamp';
      else if (value.format === 'boolean') type = 'boolean';
      else if (value.type === 'number') type = 'number';

      const description = value.description?.toString() ?? '';
      let foreignKey:
        | { table: keyof Database['public']['Tables']; column: string }
        | undefined;
      if (description) {
        const match = description.match(
          /<fk table='([^']+)' column='([^']+)'\/>/
        );
        if (match) {
          foreignKey = {
            table: match[1],
            column: match[2]
          };
        }
      }

      return {
        key,
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        type,
        required: schema.required.includes(key),
        foreignKey
      };
    }
  );
  return {
    name,
    columns
  };
};

interface FilterCondition {
  column: string;
  operator: string;
  value: string;
}

// Update the Operator interface to remove icon
interface Operator {
  value: string;
  label: string;
}

const OPERATORS: Operator[] = [
  {
    value: '=',
    label: 'equals'
  },
  {
    value: '<>',
    label: 'not equal'
  },
  {
    value: '>',
    label: 'greater than'
  },
  {
    value: '<',
    label: 'less than'
  },
  {
    value: '>=',
    label: 'greater than or equal'
  },
  {
    value: '<=',
    label: 'less than or equal'
  },
  {
    value: 'LIKE',
    label: 'like operator'
  },
  {
    value: 'ILIKE',
    label: 'ilike operator'
  },
  {
    value: 'IN',
    label: 'one of a list of values'
  }
];

// Add helper function to compute symbol
const getOperatorSymbol = (value: string) => {
  switch (value) {
    case 'LIKE':
      return '[~~]';
    case 'ILIKE':
      return '[~~*]';
    case 'IN':
      return '[in]';
    default:
      return `[${value}]`;
  }
};

const getJavascriptEvaluationOperator = (operator: string) => {
  switch (operator) {
    case '=':
      return '==';
    case '<>':
      return '!=';
    default:
      return operator;
  }
};

// Add API fetching functions
const fetchTableSchemas = async () => {
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error('Missing API configuration');
  }

  const response = await fetch(`${url}/rest/v1/?apikey=${anon}`);
  if (!response.ok) {
    throw new Error('Failed to fetch schemas');
  }

  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/openapi+json')) {
    throw new Error('Invalid content type');
  }

  const data = await response.json();
  if (!data.definitions) {
    throw new Error('Invalid schema format');
  }

  // Convert schemas to our format
  const convertedSchemas: Record<string, TableSchema> = {};
  Object.entries(data.definitions).forEach(
    ([tableName, schema]: [string, any]) => {
      convertedSchemas[tableName] = convertJsonSchemaToTableSchema(
        tableName as keyof Database['public']['Tables'],
        schema
      );
    }
  );

  // Add reverse relationship columns
  addReverseRelationships(convertedSchemas);

  return convertedSchemas;
};

// Function to add reverse relationship columns to schemas
const addReverseRelationships = (schemas: Record<string, TableSchema>) => {
  // First pass: find all foreign keys
  const reverseRelationships: Record<
    string,
    Array<{
      targetTable: keyof Database['public']['Tables'];
      targetColumn: string;
      sourceTable: keyof Database['public']['Tables'];
      sourceColumn: string;
    }>
  > = {};

  // Collect all foreign keys
  Object.values(schemas).forEach((schema) => {
    schema.columns.forEach((column) => {
      if (column.foreignKey) {
        const targetTable = column.foreignKey.table;
        const targetColumn = column.foreignKey.column;

        if (!reverseRelationships[targetTable]) {
          reverseRelationships[targetTable] = [];
        }

        reverseRelationships[targetTable].push({
          targetTable,
          targetColumn,
          sourceTable: schema.name as keyof Database['public']['Tables'],
          sourceColumn: column.key
        });
      }
    });
  });

  // Identify link tables (tables with multiple foreign keys and few other columns)
  const linkTables = new Map<
    string,
    {
      foreignKeys: Array<{
        key: string;
        foreignKey: { table: string; column: string };
      }>;
      isLinkTable: boolean;
    }
  >();

  Object.entries(schemas).forEach(([tableName, schema]) => {
    const foreignKeyColumns = schema.columns.filter((col) => col.foreignKey);
    const nonForeignKeyColumns = schema.columns.filter(
      (col) =>
        !col.foreignKey && !['id', 'created_at', 'updated_at'].includes(col.key)
    );

    // A table is a link table if it has at least 2 foreign keys and few other columns
    const isLinkTable =
      foreignKeyColumns.length >= 2 && nonForeignKeyColumns.length <= 2;

    linkTables.set(tableName, {
      foreignKeys: foreignKeyColumns.map((col) => ({
        key: col.key,
        foreignKey: col.foreignKey!
      })),
      isLinkTable
    });
  });

  // Second pass: add virtual columns for reverse relationships
  Object.entries(reverseRelationships).forEach(
    ([targetTable, relationships]) => {
      relationships.forEach((rel) => {
        // const sourceSchema = schemas[rel.sourceTable];
        const linkTableInfo = linkTables.get(rel.sourceTable);
        const isLinkTable = linkTableInfo?.isLinkTable || false;

        // Generate a better column name for link tables
        let columnKey = `${rel.sourceTable}s`;

        // For link tables, use a more intuitive name based on the target table
        if (isLinkTable) {
          // Extract the name from the link table (e.g., "asset_tag_link" -> "tags")
          const tableParts = rel.sourceTable.split('_');
          if (
            tableParts.length >= 3 &&
            (tableParts[tableParts.length - 1] === 'link' ||
              tableParts[tableParts.length - 1] === 'links')
          ) {
            // Find the part that's not the current table and not "link"
            for (const part of tableParts) {
              if (
                part !== 'link' &&
                part !== 'links' &&
                !targetTable.includes(part)
              ) {
                columnKey = `${part}s`;
                break;
              }
            }
          }

          // If we have throughInfo, we can get an even better name
          const otherForeignKeys = linkTableInfo?.foreignKeys.filter(
            (fk) =>
              fk.foreignKey.table !== targetTable && fk.key !== rel.sourceColumn
          );

          if (otherForeignKeys && otherForeignKeys.length > 0) {
            const otherForeignKey = otherForeignKeys[0];
            const otherTable = otherForeignKey.foreignKey.table;

            // Use the other table's name for the column
            if (otherTable) {
              // Remove trailing 's' if it exists and add it back to make it plural
              const baseName = otherTable.endsWith('s')
                ? otherTable.slice(0, -1)
                : otherTable;
              columnKey = `${baseName}s`;
            }
          }
        }

        // Skip if the column already exists
        const existingColumn = schemas[targetTable].columns.find(
          (col) => col.key === columnKey
        );
        if (existingColumn) return;

        // For link tables, find the other foreign keys
        let throughInfo = undefined;
        if (isLinkTable) {
          const otherForeignKeys = linkTableInfo?.foreignKeys.filter(
            (fk) =>
              fk.foreignKey.table !== targetTable && fk.key !== rel.sourceColumn
          );

          if (otherForeignKeys && otherForeignKeys.length > 0) {
            // For simplicity, we'll use the first "other" foreign key
            // In a more complex implementation, we might want to create multiple columns
            const otherForeignKey = otherForeignKeys[0];

            throughInfo = {
              throughTable: rel.sourceTable,
              throughSourceColumn: rel.sourceColumn,
              throughTargetColumn: otherForeignKey.key,
              targetTable: otherForeignKey.foreignKey.table
            };
          }
        }

        // Add virtual column for reverse relationship
        schemas[targetTable].columns.push({
          key: columnKey,
          header: columnKey,
          type: 'string',
          required: false,
          isVirtual: true,
          reverseRelationship: {
            sourceTable: rel.sourceTable,
            sourceColumn: rel.sourceColumn,
            isLinkTable,
            ...(throughInfo && {
              throughTable: throughInfo.throughTable,
              throughSourceColumn: throughInfo.throughSourceColumn,
              throughTargetColumn: throughInfo.throughTargetColumn
            })
          }
        });
      });
    }
  );
};

const fetchTableData = async (
  tableName: string,
  page: number,
  pageSize: number
) => {
  const { data, error, count } = await supabase
    .from(tableName as keyof Database['public']['Tables'])
    .select('*', { count: 'exact' })
    .range(page * pageSize, (page + 1) * pageSize - 1);

  if (error) {
    throw error;
  }
  return { data, count } as unknown as TableData;
};

interface ForeignKeyTarget {
  table: string;
  column: string;
  value: string;
  sourceTable?: string;
  sourceColumn?: string;
  sourceValue?: string;
}

// Add a component to fetch and display the count of related records
function RelatedRecordsCount({
  tableName,
  columnName,
  recordId
}: {
  tableName: keyof Database['public']['Tables'];
  columnName: string;
  recordId: string;
  isLinkTable?: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['relatedRecordsCount', tableName, columnName, recordId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true })
        .eq(columnName, recordId);

      if (error) throw error;
      return count || 0;
    }
  });

  if (isLoading) return <span className="text-muted-foreground">...</span>;

  return (
    <span className="text-muted-foreground">
      <T id="components.database_viewer.0">
        <Plural
          n={data}
          one={
            <>
              <Num>1</Num> record.
            </>
          }
          other={
            <>
              <Num>{data}</Num> records.
            </>
          }
        />
      </T>
    </span>
  );
}

function useTransformedColumns({
  schema,
  onForeignKeySelect,
  isPreview = false,
  tableSchemas
}: {
  schema?: TableSchema;
  tableName: string;
  onForeignKeySelect?: (target: ForeignKeyTarget) => void;
  isPreview?: boolean;
  tableSchemas?: Record<string, TableSchema>;
}) {
  return React.useMemo(() => {
    if (!schema) return [];
    return [
      ...(isPreview
        ? []
        : [
            {
              accessorKey: 'select',
              header: ({ table }: { table: any }) => (
                <Checkbox
                  checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && 'indeterminate')
                  }
                  onCheckedChange={(value) =>
                    table.toggleAllPageRowsSelected(!!value)
                  }
                  aria-label="Select all"
                />
              ),
              cell: ({ row }: { row: any }) => (
                <Checkbox
                  checked={row.getIsSelected()}
                  onCheckedChange={(value) => row.toggleSelected(!!value)}
                  aria-label="Select row"
                />
              ),
              enableSorting: false,
              enableHiding: false,
              enableColumnFilter: false
            }
          ]),
      ...schema.columns.map((col) => ({
        accessorKey: col.key,
        header:
          col.isVirtual &&
          col.reverseRelationship?.isLinkTable &&
          col.reverseRelationship?.throughTargetColumn &&
          tableSchemas
            ? (() => {
                // Get the actual target table name from the foreign key
                const throughTable = col.reverseRelationship.throughTable!;
                const throughTargetColumn =
                  col.reverseRelationship.throughTargetColumn!;
                const foreignKeyInfo = tableSchemas[throughTable]?.columns.find(
                  (c) => c.key === throughTargetColumn
                )?.foreignKey;

                if (foreignKeyInfo) {
                  return foreignKeyInfo.table;
                }

                return col.key;
              })()
            : col.key,
        cell: ({ row }: { row: any }) => {
          // For virtual reverse relationship columns
          if (col.isVirtual && col.reverseRelationship) {
            const recordId = row.getValue('id');
            if (!recordId) return 'N/A';

            return (
              <div className="flex items-center gap-2">
                <RelatedRecordsCount
                  tableName={col.reverseRelationship.sourceTable}
                  columnName={col.reverseRelationship.sourceColumn}
                  recordId={String(recordId)}
                  isLinkTable={col.reverseRelationship.isLinkTable}
                />

                {!isPreview && (
                  <T id="components.database_viewer.4">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="size-6">
                          <ChevronRight className="size-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-100 p-0 flex flex-col"
                        align="end"
                      >
                        <div className="p-2 border-b border-border text-sm">
                          <span className="text-muted-foreground">
                            <Var>
                              {col.reverseRelationship.isLinkTable ? (
                                <T id="components.database_viewer.2">
                                  {'Related records from'}
                                </T>
                              ) : (
                                <T id="components.database_viewer.3">
                                  {'Referencing records from'}
                                </T>
                              )}
                            </Var>
                          </span>{' '}
                          <Var>
                            {(() => {
                              if (
                                col.reverseRelationship.isLinkTable &&
                                col.reverseRelationship.throughTable &&
                                col.reverseRelationship.throughTargetColumn &&
                                tableSchemas
                              ) {
                                // Get the actual target table name from the foreign key
                                const throughTable =
                                  col.reverseRelationship.throughTable;
                                const throughTargetColumn =
                                  col.reverseRelationship.throughTargetColumn;
                                const foreignKeyInfo = tableSchemas[
                                  throughTable
                                ]?.columns.find(
                                  (c) => c.key === throughTargetColumn
                                )?.foreignKey;

                                if (foreignKeyInfo) {
                                  return foreignKeyInfo.table;
                                }
                              }

                              // Fallback to the source table name
                              return col.reverseRelationship.sourceTable;
                            })()}
                          </Var>
                          :
                        </div>
                        <ReverseRelationshipPreview
                          tableName={col.reverseRelationship.sourceTable}
                          columnName={col.reverseRelationship.sourceColumn}
                          recordId={String(recordId)}
                          isLinkTable={col.reverseRelationship.isLinkTable}
                          throughTable={col.reverseRelationship.throughTable}
                          throughSourceColumn={
                            col.reverseRelationship.throughSourceColumn
                          }
                          throughTargetColumn={
                            col.reverseRelationship.throughTargetColumn
                          }
                        />

                        <div className="flex justify-end p-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-sm"
                            onClick={() => {
                              // For link tables, we want to navigate to the target table, not the link table
                              if (
                                col.reverseRelationship!.isLinkTable &&
                                col.reverseRelationship!.throughTable &&
                                col.reverseRelationship!.throughTargetColumn &&
                                tableSchemas
                              ) {
                                // Find the foreign key that this column points to
                                const throughTable =
                                  col.reverseRelationship!.throughTable;
                                const throughTargetColumn =
                                  col.reverseRelationship!.throughTargetColumn;
                                const foreignKeyInfo = tableSchemas[
                                  throughTable
                                ]?.columns.find(
                                  (c) => c.key === throughTargetColumn
                                )?.foreignKey;

                                if (foreignKeyInfo) {
                                  // Navigate to the target table
                                  onForeignKeySelect?.({
                                    table: foreignKeyInfo.table,
                                    column: foreignKeyInfo.column,
                                    value: '' // We don't have a specific value to filter by
                                  });
                                  return;
                                }
                              }

                              // Default behavior for non-link tables
                              onForeignKeySelect?.({
                                table: col.reverseRelationship!.sourceTable,
                                column: col.reverseRelationship!.sourceColumn,
                                value: String(recordId)
                              });
                            }}
                          >
                            Open table
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </T>
                )}
              </div>
            );
          }

          const value = row.getValue(col.key);
          if (value === null || value === undefined) return 'NULL';
          if (col.type === 'timestamp') {
            return new Date(value as string).toLocaleString();
          }
          if (col.type === 'boolean')
            return <Checkbox checked={value} disabled />;
          if (col.key.includes('image')) {
            let imageSources: string[] = [];
            try {
              const json = JSON.parse(value as string);
              if (Array.isArray(json)) {
                imageSources = json;
              }
            } catch {
              if (!value.includes('[')) imageSources = [value as string];
            }

            return (
              <div className="flex w-30 justify-center">
                {imageSources.map((item, index) => {
                  const source = supabase.storage
                    .from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
                    .getPublicUrl(item).data.publicUrl;

                  return (
                    <a
                      key={index}
                      href={source}
                      target="_blank"
                      className="size-8 block not-last:-mr-4 hover:mr-0 hover:z-10 transition-[margin]"
                    >
                      <img
                        className="size-full rounded-md"
                        src={source}
                        alt={col.key}
                      />
                    </a>
                  );
                })}
              </div>
            );
          }
          if (col.key.includes('audio')) {
            let audioSources: string[] = [];
            try {
              const json = JSON.parse(value as string);
              if (Array.isArray(json)) {
                audioSources = json;
              }
            } catch {
              if (!value.includes('[')) audioSources = [value as string];
            }
            return (
              <div className="flex gap-2">
                {audioSources.map((item) => (
                  <AudioButton
                    key={item}
                    src={
                      supabase.storage
                        .from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
                        .getPublicUrl(item).data.publicUrl
                    }
                  />
                ))}
              </div>
            );
          }
          if (col.foreignKey && !isPreview) {
            return (
              <T id="components.database_viewer.5">
                <div className="flex items-center gap-2">
                  <span className="truncate">
                    <Var>{String(value)}</Var>
                  </span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="size-6 ml-auto"
                      >
                        <ChevronRight className="size-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent
                      className="w-100 p-0 flex flex-col"
                      align="end"
                    >
                      <div className="p-2 border-b border-border text-sm">
                        <span className="text-muted-foreground">
                          Referencing record from
                        </span>{' '}
                        <Var>{col.foreignKey.table}</Var>:
                      </div>
                      <PreviewTable
                        tableName={col.foreignKey.table}
                        filterColumn={col.foreignKey.column}
                        filterValue={String(value)}
                      />

                      <div className="flex justify-end p-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-sm"
                          onClick={() => {
                            onForeignKeySelect?.({
                              table: col.foreignKey!.table,
                              column: col.foreignKey!.column,
                              value: String(value),
                              sourceTable: col.foreignKey!.table,
                              sourceColumn: col.key,
                              sourceValue: String(value)
                            });
                          }}
                        >
                          Open table
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </T>
            );
          } else if (col.foreignKey && isPreview) {
            // For foreign keys in preview mode, just show the value without the popover button
            return <span className="truncate">{String(value)}</span>;
          }
          return String(value);
        }
      }))
    ];
  }, [schema, onForeignKeySelect, isPreview, tableSchemas]);
}

function PreviewTable({
  tableName,
  filterColumn,
  filterValue
}: {
  tableName: keyof Database['public']['Tables'];
  filterColumn: string;
  filterValue: string;
}) {
  const { data: tableSchemas } = useQuery<Record<string, TableSchema>, Error>({
    queryKey: ['tableSchemas'],
    queryFn: fetchTableSchemas
  });

  const { data, isLoading } = useQuery({
    queryKey: ['previewData', tableName, filterColumn, filterValue],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .eq(filterColumn, filterValue);

      if (error) throw error;
      return data;
    }
  });

  const schema = tableSchemas?.[tableName];
  const columns = useTransformedColumns({
    schema: schema!,
    tableName: tableName,
    isPreview: true,
    tableSchemas
  });

  if (!schema || isLoading) {
    return (
      <div className="h-20 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <T id="components.database_viewer.6">
        <div className="h-20 text-sm flex items-center text-center justify-center p-2 text-muted-foreground">
          No matching records found.
        </div>
      </T>
    );
  }

  return (
    <Table containerClassName="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-background">
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead key={col.accessorKey}>{col.accessorKey}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row, i) => (
          <TableRow key={i}>
            {columns.map((col) => (
              <TableCell key={col.accessorKey} className="truncate">
                {col.cell({
                  row: {
                    getValue: (key: string) => row[key as keyof typeof row]
                  }
                })}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const parseAsSorting = createParser({
  parse(queryValue) {
    const parseB = (queryValue: string | null) => {
      if (!queryValue) return [];
      try {
        return queryValue.split(',').map((part) => {
          const [id, direction] = part.split(':');
          return {
            id,
            desc: direction === 'desc'
          };
        });
      } catch {
        return null;
      }
    };
    return parseB(queryValue);
  },
  serialize(value) {
    if (!value?.length) return '';
    return value
      .map((sort) => `${sort.id}:${sort.desc ? 'desc' : 'asc'}`)
      .join(',');
  },
  eq(a, b) {
    // simpler check to clearOnDefault
    return a.length === b.length;
  }
});

// Add export functions
const downloadAsFile = (
  content: string,
  fileName: string,
  contentType: string
) => {
  const a = document.createElement('a');
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
};

const downloadAsZip = async (
  content: string,
  attachments: { path: string; url: string }[],
  fileName: string,
  contentType: string
) => {
  const zip = new JSZip();

  // Add the main data file
  zip.file(
    contentType === 'application/json' ? 'data.json' : 'data.csv',
    content
  );

  // Create attachments folder and add files
  if (attachments.length > 0) {
    const attachmentsFolder = zip.folder('attachments');
    if (attachmentsFolder) {
      for (const { path, url } of attachments) {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          attachmentsFolder.file(path, blob);
        } catch (error) {
          console.error(`Error downloading attachment ${path}:`, error);
        }
      }
    }
  }

  // Generate and download the zip
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = fileName.replace(/\.(json|csv)$/, '.zip');
  a.click();
  URL.revokeObjectURL(a.href);
};

const processAttachments = async (
  data: any[],
  includeAttachments: boolean
): Promise<{
  transformedData: any[];
  attachments: { path: string; url: string }[];
}> => {
  const attachments: { path: string; url: string }[] = [];

  if (!includeAttachments) {
    return { transformedData: data, attachments };
  }

  const transformedData = await Promise.all(
    data.map(async (row) => {
      const transformedRow = { ...row };
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'string') {
          if (key.includes('image') || key.includes('audio')) {
            try {
              const fileExtension = key.includes('image') ? 'jpg' : 'm4a';
              let sources = [];
              try {
                sources = JSON.parse(value);
              } catch {
                sources = [value];
              }

              // Store original paths in data
              transformedRow[key] = sources.map(
                (source: string) => `attachments/${source}.${fileExtension}`
              );

              // Collect attachments for download
              sources.forEach((source: string) => {
                const url = supabase.storage
                  .from(env.NEXT_PUBLIC_SUPABASE_BUCKET)
                  .getPublicUrl(source).data.publicUrl;
                attachments.push({ path: `${source}.${fileExtension}`, url });
              });
            } catch (error) {
              console.error(`Error processing attachment for ${key}:`, error);
            }
          }
        }
      }
      return transformedRow;
    })
  );

  return { transformedData, attachments };
};

const exportAllTables = async (
  format: 'json' | 'csv',
  includeAttachments: boolean,
  tables: string[],
  onProgress?: (tableName: string) => void
) => {
  const zip = new JSZip();
  const allAttachments = new Map<string, { path: string; url: string }>();

  for (const tableName of tables) {
    onProgress?.(tableName);
    const { data } = await supabase
      .from(tableName as keyof Database['public']['Tables'])
      .select('*');
    if (!data) continue;

    const { transformedData, attachments } = await processAttachments(
      data,
      includeAttachments
    );

    // Add table data to zip
    const content =
      format === 'json'
        ? JSON.stringify(transformedData, null, 2)
        : [
            Object.keys(transformedData[0] || {}).join(','),
            ...transformedData.map((row) =>
              Object.values(row)
                .map((cell) => {
                  if (cell === null) return '';
                  if (typeof cell === 'string' && cell.includes(',')) {
                    return `"${cell.replace(/"/g, '""')}"`;
                  }
                  return cell;
                })
                .join(',')
            )
          ].join('\n');

    zip.file(`tables/${tableName}.${format}`, content);

    // Collect unique attachments
    attachments.forEach((attachment) => {
      allAttachments.set(attachment.path, attachment);
    });
  }

  // Add all attachments to zip
  if (includeAttachments && allAttachments.size > 0) {
    const attachmentsFolder = zip.folder('attachments');
    if (attachmentsFolder) {
      for (const { path, url } of allAttachments.values()) {
        try {
          const response = await fetch(url);
          const blob = await response.blob();
          attachmentsFolder.file(path, blob);
        } catch (error) {
          console.error(`Error downloading attachment ${path}:`, error);
        }
      }
    }
  }

  // Generate and download the zip
  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `database_export.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
};

const exportToJson = async (
  data: any[],
  includeAttachments: boolean,
  tableName: string
) => {
  const { transformedData, attachments } = await processAttachments(
    data,
    includeAttachments
  );
  const jsonStr = JSON.stringify(transformedData, null, 2);

  if (includeAttachments) {
    await downloadAsZip(
      jsonStr,
      attachments,
      `${tableName}_export.json`,
      'application/json'
    );
  } else {
    downloadAsFile(jsonStr, `${tableName}_export.json`, 'application/json');
  }
};

const exportToCsv = async (
  data: any[],
  includeAttachments: boolean,
  tableName: string
) => {
  if (!data.length) return;

  const { transformedData, attachments } = await processAttachments(
    data,
    includeAttachments
  );
  const headers = Object.keys(transformedData[0]);
  const csvContent = [
    headers.join(','),
    ...transformedData.map((row) =>
      headers
        .map((header) => {
          const cell = row[header];
          if (cell === null) return '';
          if (typeof cell === 'string' && cell.includes(',')) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(',')
    )
  ].join('\n');

  if (includeAttachments) {
    await downloadAsZip(
      csvContent,
      attachments,
      `${tableName}_export.csv`,
      'text/csv'
    );
  } else {
    downloadAsFile(csvContent, `${tableName}_export.csv`, 'text/csv');
  }
};

// Add a component to display reverse relationships
function ReverseRelationshipPreview({
  tableName,
  columnName,
  recordId,
  isLinkTable = false,
  throughTable,
  throughSourceColumn,
  throughTargetColumn
}: {
  tableName: keyof Database['public']['Tables'];
  columnName: string;
  recordId: string;
  isLinkTable?: boolean;
  throughTable?: keyof Database['public']['Tables'];
  throughSourceColumn?: string;
  throughTargetColumn?: string;
}) {
  const { data, isLoading } = useQuery({
    queryKey: [
      'reverseRelationship',
      tableName,
      columnName,
      recordId,
      isLinkTable,
      throughTable,
      throughSourceColumn,
      throughTargetColumn
    ],

    queryFn: async () => {
      if (
        isLinkTable &&
        throughTable &&
        throughSourceColumn &&
        throughTargetColumn
      ) {
        // For link tables, we need to join through to the target table
        // First, get the foreign key table that the throughTargetColumn points to
        const { data: schemaData } = await supabase
          .from('_metadata')
          .select('*');

        const foreignKeyTable = schemaData?.find(
          (table: any) =>
            table.table === throughTable && table.column === throughTargetColumn
        )?.foreign_table;

        if (foreignKeyTable) {
          // Use a join to get the related records
          const { data: linkData, error: linkError } = await supabase
            .from(throughTable)
            .select(`*, ${foreignKeyTable}(*)`)
            .eq(throughSourceColumn, recordId);

          if (linkError) throw linkError;
          return { linkData, foreignKeyTable };
        } else {
          // Fallback to just getting the link table records
          const { data: linkData, error: linkError } = await supabase
            .from(throughTable)
            .select('*')
            .eq(throughSourceColumn, recordId);

          if (linkError) throw linkError;
          return { linkData, foreignKeyTable: null };
        }
      } else {
        // For direct relationships
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .eq(columnName, recordId);

        if (error) throw error;
        return { linkData: data, foreignKeyTable: null };
      }
    }
  });

  const { data: tableSchemas } = useQuery<Record<string, TableSchema>, Error>({
    queryKey: ['tableSchemas'],
    queryFn: fetchTableSchemas
  });

  // Determine which table's schema to use for displaying the data
  const targetTable = React.useMemo(() => {
    if (isLinkTable && throughTargetColumn && data?.foreignKeyTable) {
      return data.foreignKeyTable;
    } else if (
      isLinkTable &&
      throughTargetColumn &&
      tableSchemas &&
      throughTable
    ) {
      // Try to find the target table from the schema
      const foreignKeyInfo = tableSchemas[throughTable]?.columns.find(
        (col) => col.key === throughTargetColumn
      )?.foreignKey;

      if (foreignKeyInfo) {
        return foreignKeyInfo.table;
      }

      return (
        tableSchemas?.[tableName]?.columns.find(
          (col) => col.key === throughTargetColumn
        )?.foreignKey?.table || tableName
      );
    }
    return tableName;
  }, [
    isLinkTable,
    throughTargetColumn,
    data,
    tableSchemas,
    tableName,
    throughTable
  ]);

  const schema = tableSchemas?.[targetTable];

  // Process the data based on whether it's from a link table or direct relationship
  const displayData = React.useMemo(() => {
    if (!data?.linkData) return null;

    if (isLinkTable && data.foreignKeyTable) {
      // Extract the nested data from the link table response
      return data.linkData
        .map((item) => {
          // The nested data is in a property named after the foreign key table
          return item[data.foreignKeyTable as keyof typeof item];
        })
        .filter(Boolean);
    } else if (isLinkTable && throughTargetColumn) {
      // Just return the link table data
      return data.linkData;
    }

    return data.linkData;
  }, [data, isLinkTable, throughTargetColumn]);

  const columns = useTransformedColumns({
    schema: schema,
    tableName: targetTable,
    isPreview: true,
    tableSchemas
  });

  // Get the actual related table for the "Open table" button
  // const relatedTableInfo = React.useMemo(() => {
  //   if (isLinkTable && throughTable && throughTargetColumn && tableSchemas) {
  //     // Find the foreign key that this column points to
  //     const foreignKeyInfo = tableSchemas[throughTable]?.columns.find(
  //       (c) => c.key === throughTargetColumn
  //     )?.foreignKey;

  //     if (foreignKeyInfo) {
  //       return {
  //         table: foreignKeyInfo.table,
  //         column: foreignKeyInfo.column
  //       };
  //     }
  //   }

  //   return {
  //     table: tableName,
  //     column: columnName
  //   };
  // }, [
  //   isLinkTable,
  //   throughTable,
  //   throughTargetColumn,
  //   tableSchemas,
  //   tableName,
  //   columnName
  // ]);

  if (isLoading) {
    return (
      <div className="h-20 flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!data?.linkData?.length) {
    return (
      <T id="components.database_viewer.7">
        <div className="h-20 text-sm flex items-center text-center justify-center p-2 text-muted-foreground">
          No related records found.
        </div>
      </T>
    );
  }

  if (!displayData || !columns.length) {
    return (
      <T id="components.database_viewer.8">
        <div className="h-20 text-sm flex items-center text-center justify-center p-2 text-muted-foreground">
          Unable to display related records.
        </div>
      </T>
    );
  }

  // Limit to 5 records for display
  const MAX_DISPLAY_RECORDS = 3;
  const totalRecords = displayData.length;
  const limitedData = displayData.slice(0, MAX_DISPLAY_RECORDS);
  const hasMoreRecords = totalRecords > MAX_DISPLAY_RECORDS;

  return (
    <div className="flex flex-col">
      <Table containerClassName="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-background">
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.accessorKey}>{col.accessorKey}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {limitedData.map((row, i: number) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col.accessorKey} className="truncate">
                  {col.cell({
                    row: {
                      getValue: (key: string) => row[key as keyof typeof row]
                    }
                  })}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {hasMoreRecords && (
        <T id="components.database_viewer.9">
          <div className="p-2 text-sm text-right text-muted-foreground border-t border-border">
            <span>
              <Var>{totalRecords - MAX_DISPLAY_RECORDS}</Var> more records...
            </span>
          </div>
        </T>
      )}
    </div>
  );
}

export function DatabaseViewer() {
  // Fetch table schemas
  const {
    data: tableSchemas,
    isLoading: schemasLoading,
    error: schemasError
  } = useQuery<Record<string, TableSchema>, Error>({
    queryKey: ['tableSchemas'],
    queryFn: fetchTableSchemas
  });

  const [selectedTable, setSelectedTable] = useQueryState('table', {
    defaultValue: tableSchemas ? Object.keys(tableSchemas)[0] : ''
  });

  // Add state for showing link tables
  const [showLinkTables, setShowLinkTables] = useQueryState(
    'showLinks',
    parseAsBoolean.withDefault(false)
  );

  // Add pagination state
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(0));
  const [pageSize, setPageSize] = useQueryState(
    'size',
    parseAsInteger.withDefault(50)
  );

  const [sorting, setSorting] = useQueryState(
    'sort',
    parseAsSorting.withDefault([])
  );
  const [pendingSorting, setPendingSorting] = React.useState<SortingState>(
    sorting || []
  );

  // Replace URL state with normal React state for filters
  const [filters, setFilters] = React.useState<
    Record<string, FilterCondition[]>
  >({});
  const [columnFilters, setColumnFilters] = React.useState<
    Record<string, ColumnFiltersState>
  >({});
  const [rowSelection, setRowSelection] = React.useState({});

  const [columnVisibility, setColumnVisibility] = useQueryState(
    'visible',
    parseAsJson(z.record(visibilityStateSchema).parse).withDefault({})
  );

  const [includeAttachments, setIncludeAttachments] = React.useState(false);

  const [exportProgress, setExportProgress] = React.useState<string | null>(
    null
  );
  const [exportMode, setExportMode] = React.useState<'current' | 'all'>(
    'current'
  );

  const [isSheetOpen, setIsSheetOpen] = React.useState(false);

  React.useEffect(() => {
    if (!selectedTable || !columnVisibility[selectedTable]) return;
    // if all columns are visible, clear the column visibility state (shows all columns)
    const invisibleColumns = Object.values(
      columnVisibility[selectedTable]
    ).filter((visibility) => !visibility);

    if (invisibleColumns.length === 0)
      setColumnVisibility((prev) =>
        Object.fromEntries(
          Object.entries(prev).filter(([key]) => key !== selectedTable)
        )
      );
  }, [columnVisibility, selectedTable, setColumnVisibility]);

  // Fetch table data with pagination
  const {
    data: currentData,
    isLoading: dataLoading,
    error: dataError
  } = useQuery<TableData, Error>({
    queryKey: ['tableData', selectedTable, page, pageSize],
    queryFn: () => fetchTableData(selectedTable, page, pageSize),
    enabled: !!selectedTable && !!tableSchemas
  });

  const queryClient = useQueryClient();

  // Convert table schemas to table info list
  const tables = React.useMemo(() => {
    if (!tableSchemas) return [];

    // Identify link tables
    const linkTablesSet = new Set<string>();
    Object.entries(tableSchemas).forEach(([tableName, schema]) => {
      // const foreignKeyColumns = schema.columns.filter(
      //   (col) =>
      //     col.foreignKey ||
      //     (tableName === 'asset_content_link' && col.key === 'audio_id')
      // );

      if (schema.name.includes('_link') || schema.name.includes('_download'))
        linkTablesSet.add(tableName);
    });

    return Object.keys(tableSchemas)
      .filter(
        (name) =>
          showLinkTables || !linkTablesSet.has(name) || name === selectedTable
      )
      .map((name) => ({
        name,
        isLinkTable: linkTablesSet.has(name)
      }));
  }, [tableSchemas, showLinkTables, selectedTable]);

  // Get the schema for the selected table
  const currentSchema = React.useMemo(
    () => tableSchemas?.[selectedTable],
    [tableSchemas, selectedTable]
  );

  // Generate columns based on the schema
  const columns = useTransformedColumns({
    schema: currentSchema!,
    tableName: selectedTable,
    onForeignKeySelect: ({ table: targetTable, column, value }) => {
      setSelectedTable(targetTable);
      setFilters((prev) => ({
        ...prev,
        [targetTable]: [{ column, operator: '=', value }]
      }));
      setTimeout(() => {
        table.getColumn(column)?.setFilterValue(value);
      }, 0);
    },
    tableSchemas
  });

  const columnsWithFilters = React.useMemo(() => {
    return columns.map((col) => {
      const filter = filters[selectedTable]?.find(
        (filter) => filter.column === col.accessorKey
      );
      return {
        ...col,
        filterFn: (row, columnId, filterValue) => {
          if (!filter) return true;
          const rowValue = row.getValue(columnId)!;
          switch (filter?.operator) {
            case 'LIKE':
              return rowValue.toString().includes(filterValue);
            case 'ILIKE':
              return rowValue
                .toString()
                .toLowerCase()
                .includes(filterValue.toLowerCase());
            case 'IN':
              return rowValue.toString().includes(filterValue);
            case 'IS NULL':
              return rowValue === null;
            default:
              return Boolean(
                eval(
                  `"${rowValue}" ${getJavascriptEvaluationOperator(
                    filter.operator
                  )} "${filterValue}"`
                )
              );
          }
        }
      } satisfies ColumnDef<any>;
    });
  }, [columns, filters, selectedTable]);

  const table = useReactTable({
    data: currentData?.data ?? [],
    columns: columnsWithFilters,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: (updater) => {
      if (typeof updater === 'function') {
        setColumnVisibility((prev) => {
          return {
            ...prev,
            [selectedTable]: updater(prev[selectedTable] ?? {})
          };
        });
      } else {
        setColumnVisibility((prev) => ({
          ...prev,
          [selectedTable]: updater
        }));
      }
    },
    onRowSelectionChange: setRowSelection,
    pageCount: Math.ceil((currentData?.count ?? 0) / (pageSize || 10)),
    state: {
      sorting,
      columnFilters: columnFilters[selectedTable] ?? [],
      columnVisibility: columnVisibility[selectedTable] ?? {},
      rowSelection,
      pagination: {
        pageIndex: page || 0,
        pageSize: pageSize || 10
      }
    },
    onColumnFiltersChange: (updater) => {
      if (typeof updater === 'function') {
        setColumnFilters((prev) => ({
          ...prev,
          [selectedTable]: updater(prev[selectedTable] ?? [])
        }));
      } else {
        setColumnFilters((prev) => ({
          ...prev,
          [selectedTable]: updater
        }));
      }
    },
    onPaginationChange: (updater) => {
      if (typeof updater === 'function') {
        const newState = updater({
          pageIndex: page || 0,
          pageSize: pageSize || 10
        });
        setPage(newState.pageIndex);
        setPageSize(newState.pageSize);
      } else {
        setPage(updater.pageIndex);
        setPageSize(updater.pageSize);
      }
    },
    manualPagination: true
  });

  // Find the first filterable column for the current table
  const filterableColumn = React.useMemo(() => {
    return currentSchema?.columns.find(
      (col) =>
        table.getColumn(col.key)?.getIsVisible() &&
        table.getColumn(col.key)?.getCanFilter()
    )?.key;
  }, [currentSchema, table]);

  const handleRemoveFilter = (index: number) => {
    setFilters({
      ...filters,
      [selectedTable]: filters[selectedTable].filter((_, i) => i !== index)
    });
  };

  // Add state for showing "No filters" message
  const hasNoFilters =
    !filters[selectedTable] || filters[selectedTable].length === 0;

  const nonFilteredColumns = table
    .getAllColumns()
    .filter(
      (column) =>
        column.getCanSort() &&
        !pendingSorting.some((sort) => sort.id === column.id)
    );

  const Tables = ({ className }: { className?: string }) => (
    <ScrollArea className={cn('flex flex-col gap-2 p-2 flex-1', className)}>
      {tables.map((t) => (
        <button
          key={t.name}
          onClick={() => {
            setSelectedTable(t.name);
            setIsSheetOpen(false);
          }}
          className={cn(
            'w-full flex items-center justify-between px-4 py-2 text-sm rounded-md hover:bg-accent',
            t.isLinkTable && 'text-muted-foreground',
            selectedTable === t.name && 'bg-accent'
          )}
          disabled={schemasLoading || dataLoading}
        >
          <span className="">{toProperCase(t.name)}</span>
          <span className="text-muted-foreground">
            {queryClient.getQueryData<TableData>([
              'tableData',
              t.name,
              page,
              pageSize
            ])?.count ?? <T id="components.database_viewer.10">{0}</T>}
          </span>
        </button>
      ))}
    </ScrollArea>
  );

  const LinkTablesFooter = () => (
    <T id="components.database_viewer.11">
      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-between">
          <Label htmlFor="show-link-tables" className="text-sm cursor-pointer">
            Show link tables
          </Label>
          <Switch
            id="show-link-tables"
            checked={showLinkTables}
            onCheckedChange={setShowLinkTables}
          />
        </div>
      </div>
    </T>
  );

  const t = useGT();

  return (
    <div className="flex h-screen">
      <div className="w-64 border-r bg-background flex-col hidden md:flex">
        <Tables />
        <LinkTablesFooter />
      </div>

      {/* Main content */}
      <div className="p-4 w-full overflow-hidden">
        {schemasError || dataError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-destructive">
              {schemasError instanceof Error ? (
                schemasError.message
              ) : dataError instanceof Error ? (
                dataError.message
              ) : (
                <T id="components.database_viewer.12">{'An error occurred'}</T>
              )}
            </div>
          </div>
        ) : schemasLoading || dataLoading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        ) : (
          <T id="components.database_viewer.20">
            <div className="flex flex-col gap-4 h-full">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight md:block hidden">
                  <Var>{toProperCase(selectedTable)}</Var>
                </h2>
                <div className="flex items-center gap-2">
                  <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                    <SheetTrigger asChild className="md:hidden">
                      <Button variant="ghost" size="sm" className="px-0 w-auto">
                        <PanelLeft className="size-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left">
                      <SheetHeader>
                        <VisuallyHidden>
                          <SheetTitle>Tables</SheetTitle>
                        </VisuallyHidden>
                      </SheetHeader>
                      <Tables />
                      <LinkTablesFooter />
                    </SheetContent>
                  </Sheet>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Download className="size-4" />
                        <span className="hidden sm:block">Export</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-75" align="end">
                      <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-2">
                          <RadioGroup
                            value={exportMode}
                            onValueChange={(value) =>
                              setExportMode(value as 'current' | 'all')
                            }
                            className="gap-3"
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="current" id="current" />
                              <label
                                htmlFor="current"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Current Table
                              </label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem
                                value="all"
                                id="all"
                                disabled={!tableSchemas || !!exportProgress}
                              />

                              <label
                                htmlFor="all"
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                All Tables
                              </label>
                            </div>
                          </RadioGroup>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={includeAttachments}
                            onCheckedChange={(checked) =>
                              setIncludeAttachments(!!checked)
                            }
                          />
                          Download attachments
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="lg"
                            className="flex-1"
                            onClick={() => {
                              if (exportMode === 'all') {
                                if (!tableSchemas) return;
                                exportAllTables(
                                  'json',
                                  includeAttachments,
                                  Object.keys(tableSchemas),
                                  setExportProgress
                                ).finally(() => setExportProgress(null));
                              } else {
                                exportToJson(
                                  table
                                    .getFilteredRowModel()
                                    .rows.map((row) => row.original),
                                  includeAttachments,
                                  selectedTable
                                );
                              }
                            }}
                            disabled={!tableSchemas || !!exportProgress}
                          >
                            <FileJson className="size-5" /> JSON
                          </Button>
                          <Button
                            variant="outline"
                            size="lg"
                            className="flex-1"
                            onClick={() => {
                              if (exportMode === 'all') {
                                if (!tableSchemas) return;
                                exportAllTables(
                                  'csv',
                                  includeAttachments,
                                  Object.keys(tableSchemas),
                                  setExportProgress
                                ).finally(() => setExportProgress(null));
                              } else {
                                exportToCsv(
                                  table
                                    .getFilteredRowModel()
                                    .rows.map((row) => row.original),
                                  includeAttachments,
                                  selectedTable
                                );
                              }
                            }}
                            disabled={!tableSchemas || !!exportProgress}
                          >
                            <FileSpreadsheet className="size-5" /> CSV
                          </Button>
                        </div>
                        <Var>
                          {exportProgress && (
                            <T id="components.database_viewer.13">
                              <span className="ml-2 text-xs text-muted-foreground">
                                Exporting <Var>{exportProgress}</Var>...
                              </span>
                            </T>
                          )}
                        </Var>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          sorting?.length > 0 &&
                            'dark:text-green-400 text-green-700 hover:text-green-700 hover:bg-green-500/20 transition-[background-color] duration-100'
                        )}
                      >
                        <List className="size-4" />
                        <span className="hidden sm:block">
                          <Var>
                            {sorting?.length > 0 ? (
                              <T>
                                Sorted by <Var>{sorting.length}</Var> rule(s)
                              </T>
                            ) : (
                              <T>Sort</T>
                            )}
                          </Var>
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-100" align="end">
                      <div className="space-y-4">
                        <Var>
                          {pendingSorting.length === 0 && (
                            <T id="components.database_viewer.15">
                              <div className="text-sm text-muted-foreground mb-2">
                                No sorts applied to this view
                              </div>
                            </T>
                          )}
                        </Var>
                        <Var>
                          {pendingSorting.map((sort, index) => (
                            <T id="components.database_viewer.23" key={index}>
                              <div
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <div className="text-sm flex items-center gap-2 flex-1">
                                  <div className="text-muted-foreground flex items-center gap-2">
                                    <AlignJustify className="size-4" />
                                    <Var>
                                      {index === 0 ? (
                                        <T id="components.database_viewer.21">
                                          {'sort by'}
                                        </T>
                                      ) : (
                                        <T id="components.database_viewer.22">
                                          {'then by'}
                                        </T>
                                      )}
                                    </Var>
                                  </div>{' '}
                                  <Var>{sort.id}</Var>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">ascending</span>
                                  <Checkbox
                                    checked={!sort.desc}
                                    onCheckedChange={(checked) => {
                                      const newSorting = [...pendingSorting];
                                      newSorting[index] = {
                                        ...sort,
                                        desc: !checked
                                      };
                                      setPendingSorting(newSorting);
                                    }}
                                    className="translate-y-[1px]"
                                  />
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => {
                                    const newSorting = [...pendingSorting];
                                    newSorting.splice(index, 1);
                                    setPendingSorting(newSorting);
                                  }}
                                >
                                  <X className="size-4" />
                                </Button>
                              </div>
                            </T>
                          ))}
                        </Var>
                        <div className="flex items-center gap-2 border-t border-border pt-3">
                          <Var>
                            {nonFilteredColumns.length !== 0 ? (
                              <Select
                                value=""
                                onValueChange={(value) => {
                                  const column = table.getColumn(value);
                                  if (column) {
                                    setPendingSorting([
                                      ...pendingSorting,
                                      { id: value, desc: false }
                                    ]);
                                  }
                                }}
                              >
                                <SelectTrigger className="h-8 border-none pl-0 shadow-none">
                                  <SelectValue
                                    placeholder={t('Pick a column to sort by')}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {nonFilteredColumns.map((column) => (
                                    <SelectItem
                                      key={column.id}
                                      value={column.id}
                                    >
                                      {column.id}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <T id="components.database_viewer.16">
                                <span className="text-sm text-muted-foreground flex-1">
                                  All columns have been added
                                </span>
                              </T>
                            )}
                          </Var>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSorting(pendingSorting);
                            }}
                            disabled={!pendingSorting.length && !sorting.length}
                          >
                            Apply sorting
                          </Button>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          columnFilters[selectedTable]?.length > 0 &&
                            'dark:text-green-400 text-green-700 hover:text-green-700 hover:bg-green-500/20 transition-[background-color] duration-100'
                        )}
                      >
                        <Filter className="size-4" />
                        <span className="hidden sm:block">
                          <Var>
                            {columnFilters[selectedTable]?.length > 0 ? (
                              <T>
                                Filtered by{' '}
                                <Var>
                                  {columnFilters[selectedTable]?.length}
                                </Var>{' '}
                                rule(s)
                              </T>
                            ) : (
                              <T>Filter</T>
                            )}
                          </Var>
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-100" align="end">
                      <div className="space-y-4">
                        <Var>
                          {hasNoFilters && (
                            <T id="components.database_viewer.17">
                              <div className="text-sm text-muted-foreground">
                                No filters applied to this view
                              </div>
                            </T>
                          )}
                        </Var>

                        <Var>
                          {filters[selectedTable]?.map(
                            (filter: FilterCondition, index: number) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 text-sm"
                              >
                                <Select
                                  value={filter.column}
                                  defaultValue={filterableColumn}
                                  onValueChange={(value) => {
                                    const newFilters = [
                                      ...(filters[selectedTable] ?? [])
                                    ];

                                    newFilters[index] = {
                                      ...filter,
                                      column: value
                                    };
                                    setFilters({
                                      ...filters,
                                      [selectedTable]: newFilters
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {table
                                      .getAllColumns()
                                      .filter((column) => column.getCanFilter())
                                      .map((column) => (
                                        <SelectItem
                                          key={column.id}
                                          value={column.id}
                                        >
                                          {column.id}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>

                                <Select
                                  defaultValue={OPERATORS[0].value}
                                  value={filter.operator}
                                  onValueChange={(value) => {
                                    const newFilters = [
                                      ...(filters[selectedTable] ?? [])
                                    ];

                                    newFilters[index] = {
                                      ...filter,
                                      operator: value
                                    };
                                    setFilters({
                                      ...filters,
                                      [selectedTable]: newFilters
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-8 w-52">
                                    <SelectValue>{filter.operator}</SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    {OPERATORS.map((op) => (
                                      <SelectItem
                                        key={op.value}
                                        value={op.value}
                                        className="flex items-center gap-2"
                                      >
                                        <span className="text-sm text-muted-foreground">
                                          {getOperatorSymbol(op.value)}
                                        </span>
                                        {op.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>

                                {currentSchema?.columns.find(
                                  (col) => col.key === filter.column
                                )?.type === 'timestamp' ? (
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className={cn(
                                          'w-[240px] justify-start text-left font-normal h-8',
                                          !filter.value &&
                                            'text-muted-foreground'
                                        )}
                                      >
                                        <CalendarIcon className="size-4 mr-2" />
                                        {filter.value ? (
                                          format(new Date(filter.value), 'PP')
                                        ) : (
                                          <T id="components.database_viewer.24">
                                            <span>Pick a date</span>
                                          </T>
                                        )}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent
                                      className="w-auto p-0"
                                      align="start"
                                    >
                                      <Calendar
                                        mode="single"
                                        selected={
                                          filter.value
                                            ? new Date(filter.value)
                                            : undefined
                                        }
                                        onSelect={(date) => {
                                          const newFilters = [
                                            ...(filters[selectedTable] ?? [])
                                          ];

                                          newFilters[index] = {
                                            ...filter,
                                            value: date
                                              ? date.toISOString()
                                              : ''
                                          };
                                          setFilters({
                                            ...filters,
                                            [selectedTable]: newFilters
                                          });
                                        }}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                ) : (
                                  <Input
                                    value={filter.value}
                                    onChange={(e) => {
                                      const newFilters = [
                                        ...(filters[selectedTable] ?? [])
                                      ];

                                      newFilters[index] = {
                                        ...filter,
                                        value: e.target.value
                                      };
                                      setFilters({
                                        ...filters,
                                        [selectedTable]: newFilters
                                      });
                                    }}
                                    placeholder="Enter a value"
                                    className="h-8"
                                  />
                                )}

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleRemoveFilter(index)}
                                >
                                  <X className="size-4" />
                                </Button>
                              </div>
                            )
                          )}
                        </Var>

                        <div className="flex gap-2 border-t border-border pt-3">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFilters({
                                ...filters,
                                [selectedTable]: [
                                  ...(filters[selectedTable] ?? []),
                                  {
                                    column: filterableColumn ?? '',
                                    operator: OPERATORS[0].value,
                                    value: ''
                                  }
                                ]
                              });
                            }}
                          >
                            <Plus className="size-4 mr-2" />
                            Add filter
                          </Button>
                          <div className="flex justify-end flex-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                // Apply all filters
                                filters[selectedTable]?.forEach((filter) => {
                                  table
                                    .getColumn(filter.column)
                                    ?.setFilterValue(filter.value);
                                });

                                const removedFilters = columnFilters[
                                  selectedTable
                                ]?.filter(
                                  (columnFilter) =>
                                    !filters[selectedTable]?.some(
                                      (filter) =>
                                        filter.column === columnFilter.id
                                    )
                                );

                                removedFilters?.forEach((filter) => {
                                  table
                                    .getColumn(filter.id)
                                    ?.setFilterValue(undefined);
                                });
                              }}
                              disabled={
                                !columnFilters[selectedTable]?.length &&
                                !filters[selectedTable]?.length
                              }
                            >
                              Apply filter
                            </Button>
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="ml-auto" size="sm">
                        <Columns3 className="size-4" />
                        <span className="hidden sm:block select-none">
                          Columns
                        </span>{' '}
                        <ChevronDown className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <Var>
                        {table
                          .getAllColumns()
                          .filter((column) => column.getCanHide())
                          .map((column) => {
                            return (
                              <DropdownMenuCheckboxItem
                                key={column.id}
                                checked={column.getIsVisible()}
                                onCheckedChange={(value) =>
                                  column.toggleVisibility(!!value)
                                }
                              >
                                {column.id}
                              </DropdownMenuCheckboxItem>
                            );
                          })}
                      </Var>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <Table containerClassName="border flex-1 overflow-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-background">
                <TableHeader className="bg-accent z-10 sticky top-0">
                  <Var>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <TableRow
                        key={headerGroup.id}
                        className="outline outline-border"
                      >
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id} className="bg-background">
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext()
                                )}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </Var>
                </TableHeader>
                <TableBody className="h-full overflow-y-auto">
                  <Var>
                    {table.getRowModel().rows?.length ? (
                      table.getRowModel().rows.map((row) => (
                        <TableRow
                          key={row.id}
                          data-state={row.getIsSelected() && 'selected'}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id} className="truncate">
                              {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext()
                              )}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <T id="components.database_viewer.19">
                        <TableRow>
                          <TableCell
                            colSpan={columns.length}
                            className="h-24 text-center"
                          >
                            No results.
                          </TableCell>
                        </TableRow>
                      </T>
                    )}
                  </Var>
                </TableBody>
              </Table>

              <div className="flex items-center space-x-2 justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((page || 0) - 1)}
                    disabled={!table.getCanPreviousPage()}
                    className="size-8"
                  >
                    <ArrowLeft className="size-4" />
                  </Button>
                  Page
                  <Input
                    min={1}
                    max={table.getPageCount()}
                    value={(page || 0) + 1}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      if (value > 0 && value <= table.getPageCount()) {
                        setPage(value - 1);
                      }
                    }}
                    className="h-8 w-14"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setPage((page || 0) + 1)}
                    disabled={!table.getCanNextPage()}
                    className="size-8"
                  >
                    <ArrowRight className="size-4" />
                  </Button>
                  <span>
                    of <Num>{table.getPageCount()}</Num>
                  </span>
                  <Select
                    value={pageSize?.toString()}
                    onValueChange={(value) => setPageSize(Number(value))}
                  >
                    <SelectTrigger className="h-8 w-[110px]">
                      <SelectValue>
                        <Num>{pageSize}</Num> rows
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <Var>
                        {[50, 100, 200].map((size) => (
                          <T key={size}>
                            <SelectItem key={size} value={size.toString()}>
                              <Num>{size}</Num> rows
                            </SelectItem>
                          </T>
                        ))}
                      </Var>
                    </SelectContent>
                  </Select>
                  <span className="hidden sm:block">
                    <Num>{table.getFilteredSelectedRowModel().rows.length}</Num>{' '}
                    of <Num>{table.getFilteredRowModel().rows.length}</Num>{' '}
                    row(s) selected.
                  </span>
                </div>
              </div>
            </div>
          </T>
        )}
      </div>
    </div>
  );
}
