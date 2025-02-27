"use client";

import { AudioButton } from "@/components/ui/audio-button";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase";
import { cn, toProperCase } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  RowModel,
  SortingState,
  useReactTable
} from "@tanstack/react-table";
import { format } from "date-fns";
import {
  AlignJustify,
  CalendarIcon,
  ChevronDown,
  ChevronRight,
  Filter,
  List,
  Plus,
  X
} from "lucide-react";
import { parseAsInteger, parseAsJson, useQueryState, createParser } from "nuqs";
import * as React from "react";
import { z } from "zod";
import { Spinner } from "./spinner";

// Define base types
type ColumnType = "string" | "number" | "boolean" | "timestamp" | "uuid";

// Define Zod schemas for validation
const filterConditionSchema = z.object({
  column: z.string(),
  operator: z.string(),
  value: z.string()
});

const visibilityStateSchema = z.record(z.boolean());

interface TableSchema {
  name: string;
  columns: {
    key: string;
    header: string;
    type: ColumnType;
    required: boolean;
    foreignKey?: {
      table: string;
      column: string;
    };
  }[];
}

interface TableData {
  data: { [key: string]: string | number | boolean | null }[];
  count: number;
}

// Convert the JSON schema to our table schema format
const convertJsonSchemaToTableSchema = (
  name: string,
  schema: any
): TableSchema => {
  const columns = Object.entries(schema.properties).map(
    ([key, value]: [string, any]) => {
      let type: ColumnType = "string";

      if (value.format === "uuid") type = "uuid";
      else if (value.format === "timestamp with time zone") type = "timestamp";
      else if (value.format === "boolean") type = "boolean";
      else if (value.type === "number") type = "number";

      const description = value.description?.toString() ?? "";
      let foreignKey: { table: string; column: string } | undefined;
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
        header: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "),
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
    value: "=",
    label: "equals"
  },
  {
    value: "<>",
    label: "not equal"
  },
  {
    value: ">",
    label: "greater than"
  },
  {
    value: "<",
    label: "less than"
  },
  {
    value: ">=",
    label: "greater than or equal"
  },
  {
    value: "<=",
    label: "less than or equal"
  },
  {
    value: "LIKE",
    label: "like operator"
  },
  {
    value: "ILIKE",
    label: "ilike operator"
  },
  {
    value: "IN",
    label: "one of a list of values"
  }
];

// Add helper function to compute symbol
const getOperatorSymbol = (value: string) => {
  switch (value) {
    case "LIKE":
      return "[~~]";
    case "ILIKE":
      return "[~~*]";
    case "IN":
      return "[in]";
    default:
      return `[${value}]`;
  }
};

const getJavascriptEvaluationOperator = (operator: string) => {
  switch (operator) {
    case "=":
      return "==";
    case "<>":
      return "!=";
    default:
      return operator;
  }
};

const convertColumnFiltersToColumnFilterState = (
  columnFilters: z.infer<typeof filterConditionSchema>[]
): ColumnFiltersState => {
  return columnFilters.map((filter) => ({
    id: filter.column,
    value: filter.value
  }));
};

// Add API fetching functions
const fetchTableSchemas = async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anon) {
    throw new Error("Missing API configuration");
  }

  const response = await fetch(`${url}/rest/v1/?apikey=${anon}`);
  if (!response.ok) {
    throw new Error("Failed to fetch schemas");
  }

  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/openapi+json")) {
    throw new Error("Invalid content type");
  }

  const data = await response.json();
  if (!data.definitions) {
    throw new Error("Invalid schema format");
  }

  // Convert schemas to our format
  const convertedSchemas: Record<string, TableSchema> = {};
  Object.entries(data.definitions).forEach(
    ([tableName, schema]: [string, any]) => {
      convertedSchemas[tableName] = convertJsonSchemaToTableSchema(
        tableName,
        schema
      );
    }
  );

  return convertedSchemas;
};

const fetchTableData = async (
  tableName: string,
  page: number,
  pageSize: number
) => {
  const { data, error, count } = await supabase
    .from(tableName)
    .select("*", { count: "exact" })
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

function useTransformedColumns({
  schema,
  tableName,
  onForeignKeySelect,
  isPreview = false
}: {
  schema: TableSchema;
  tableName: string;
  onForeignKeySelect?: (target: ForeignKeyTarget) => void;
  isPreview?: boolean;
}) {
  return React.useMemo(() => {
    if (!schema) return [];
    return [
      ...(isPreview
        ? []
        : [
            {
              accessorKey: "select",
              header: ({ table }: { table: any }) => (
                <Checkbox
                  checked={
                    table.getIsAllPageRowsSelected() ||
                    (table.getIsSomePageRowsSelected() && "indeterminate")
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
        header: col.key,
        cell: ({ row }: { row: any }) => {
          const value = row.getValue(col.key);
          if (value === null || value === undefined) return "NULL";
          if (col.type === "timestamp") {
            return new Date(value as string).toLocaleString();
          }
          if (col.type === "boolean")
            return <Checkbox checked={value} disabled />;
          if (col.key.includes("image")) {
            let imageSources: string[] = [];
            try {
              const json = JSON.parse(value as string);
              if (Array.isArray(json)) {
                imageSources = json;
              }
            } catch (error) {
              if (!value.includes("[")) imageSources = [value as string];
            }

            return (
              <div className="flex w-30 justify-center">
                {imageSources.map((item, index) => {
                  const source = supabase.storage
                    .from(process.env.NEXT_PUBLIC_SUPABASE_BUCKET!)
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
          if (col.key.includes("audio")) {
            let audioSources: string[] = [];
            try {
              const json = JSON.parse(value as string);
              if (Array.isArray(json)) {
                audioSources = json;
              }
            } catch (error) {
              if (!value.includes("[")) audioSources = [value as string];
            }
            return (
              <div className="flex gap-2">
                {audioSources.map((item) => (
                  <AudioButton
                    key={item}
                    src={
                      supabase.storage
                        .from(process.env.NEXT_PUBLIC_SUPABASE_BUCKET!)
                        .getPublicUrl(item).data.publicUrl
                    }
                  />
                ))}
              </div>
            );
          }
          if (col.foreignKey && !isPreview) {
            return (
              <div className="flex items-center gap-2">
                <span className="truncate">{String(value)}</span>
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
                      </span>{" "}
                      {col.foreignKey.table}:
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
            );
          }
          return String(value);
        }
      }))
    ];
  }, [schema, onForeignKeySelect, isPreview]);
}

function PreviewTable({
  tableName,
  filterColumn,
  filterValue
}: {
  tableName: string;
  filterColumn: string;
  filterValue: string;
}) {
  const { data: tableSchemas } = useQuery<Record<string, TableSchema>, Error>({
    queryKey: ["tableSchemas"],
    queryFn: fetchTableSchemas
  });

  const { data, isLoading } = useQuery({
    queryKey: ["previewData", tableName, filterColumn, filterValue],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq(filterColumn, filterValue);

      if (error) throw error;
      return data;
    }
  });

  const schema = tableSchemas?.[tableName];
  const columns = useTransformedColumns({
    schema: schema!,
    tableName: tableName,
    isPreview: true
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
      <div className="h-20 text-sm flex items-center text-center justify-center p-2 text-muted-foreground">
        No matching records found
      </div>
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
                {col.cell({ row: { getValue: (key: string) => row[key] } })}
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
        return queryValue.split(",").map((part) => {
          const [id, direction] = part.split(":");
          return {
            id,
            desc: direction === "desc"
          };
        });
      } catch (error) {
        return null;
      }
    };
    console.log(parseB(queryValue), queryValue, "parseB");
    return parseB(queryValue);
  },
  serialize(value) {
    if (!value?.length) return "";
    return value
      .map((sort) => `${sort.id}:${sort.desc ? "desc" : "asc"}`)
      .join(",");
  },
  eq(a, b) {
    // simpler check to clearOnDefault
    return a.length === b.length;
  }
});

export function DatabaseViewer() {
  // Fetch table schemas
  const {
    data: tableSchemas,
    isLoading: schemasLoading,
    error: schemasError
  } = useQuery<Record<string, TableSchema>, Error>({
    queryKey: ["tableSchemas"],
    queryFn: fetchTableSchemas
  });

  const [selectedTable, setSelectedTable] = useQueryState("table", {
    defaultValue: tableSchemas ? Object.keys(tableSchemas)[0] : ""
    // parse: (value: string | null) => {
    //   if (!value) return "";
    //   return Object.keys(tableSchemas).includes(value)
    //     ? value
    //     : Object.keys(tableSchemas)[0] ?? "";
    // }
  });

  // Add pagination state
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(0));
  const [pageSize, setPageSize] = useQueryState(
    "size",
    parseAsInteger.withDefault(50)
  );

  const [sorting, setSorting] = useQueryState(
    "sort",
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
    "visible",
    parseAsJson(z.record(visibilityStateSchema).parse).withDefault({})
  );

  const [targetForeignKey, setTargetForeignKey] =
    React.useState<ForeignKeyTarget | null>(null);

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
  }, [columnVisibility, selectedTable]);

  // // Initialize from URL state
  // React.useEffect(() => {
  //   if (urlColumnFilters && urlColumnFilters.length > 0) {
  //     setColumnFilters(
  //       urlColumnFilters.map((filter) => ({
  //         id: filter.id,
  //         value: filter.value ?? null
  //       }))
  //     );
  //   }
  //   if (urlColumnVisibility && Object.keys(urlColumnVisibility).length > 0) {
  //     setColumnVisibility(urlColumnVisibility);
  //   }
  // }, [urlColumnFilters, urlColumnVisibility]);

  // Fetch table data with pagination
  const {
    data: currentData,
    isLoading: dataLoading,
    error: dataError
  } = useQuery<TableData, Error>({
    queryKey: ["tableData", selectedTable, page, pageSize],
    queryFn: () => fetchTableData(selectedTable, page, pageSize),
    enabled: !!selectedTable && !!tableSchemas
  });

  const queryClient = useQueryClient();

  // Convert table schemas to table info list
  const tables = React.useMemo(() => {
    if (!tableSchemas) return [];
    return Object.keys(tableSchemas).map((name) => ({
      name,
      rowCount:
        queryClient.getQueryData<TableData>(["tableData", name, page, pageSize])
          ?.count ?? 0
    }));
  }, [tableSchemas, currentData]);

  // Get the schema for the selected table
  const currentSchema = React.useMemo(
    () => tableSchemas?.[selectedTable],
    [tableSchemas, selectedTable]
  );

  // Generate columns based on the schema
  const columns = useTransformedColumns({
    schema: currentSchema!,
    tableName: selectedTable,
    onForeignKeySelect: ({
      table: targetTable,
      column,
      value,
      sourceTable,
      sourceColumn,
      sourceValue
    }) => {
      setSelectedTable(targetTable);
      setFilters((prev) => ({
        ...prev,
        [targetTable]: [{ column, operator: "=", value }]
      }));
      setTimeout(() => {
        table.getColumn(column)?.setFilterValue(value);
      }, 0);
    }
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
            case "LIKE":
              return rowValue.toString().includes(filterValue);
            case "ILIKE":
              return rowValue
                .toString()
                .toLowerCase()
                .includes(filterValue.toLowerCase());
            case "IN":
              return rowValue.toString().includes(filterValue);
            case "IS NULL":
              return rowValue === null;
            default:
              console.log(
                `"${rowValue}" ${getJavascriptEvaluationOperator(
                  filter.operator
                )} "${filterValue}"`
              );
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
      if (typeof updater === "function") {
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
      if (typeof updater === "function") {
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
      if (typeof updater === "function") {
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
  }, [currentSchema]);

  const handleRemoveFilter = (index: number) => {
    // const filter = filters[selectedTable][index];
    // if (filter?.column) {
    //   table.getColumn(filter.column)?.setFilterValue("");
    // }
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

  const rowCount =
    table.getFilteredRowModel().rows.length ?? table.getRowCount();

  // // Add effect to scroll to target row when data loads
  // React.useEffect(() => {
  //   if (targetForeignKey && currentData?.data) {
  //     const targetRow = currentData.data.find(
  //       (row) => row[targetForeignKey.column!] === targetForeignKey.value
  //     );
  //     if (targetRow) {
  //       const rowElement = document.querySelector(
  //         `[data-row-key="${targetForeignKey.value}"]`
  //       );
  //       if (rowElement) {
  //         rowElement.scrollIntoView({ behavior: "smooth", block: "center" });
  //         setTargetForeignKey(null);
  //       }
  //     }
  //   }
  // }, [targetForeignKey, currentData]);

  console.log(targetForeignKey, "targetForeignKey");

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-64 border-r bg-background">
        <ScrollArea className="h-[calc(100vh-60px)]">
          <div className="space-y-1 p-2">
            {tables.map((t) => (
              <button
                key={t.name}
                onClick={() => setSelectedTable(t.name)}
                className={`w-full flex items-center justify-between px-4 py-2 text-sm rounded-md hover:bg-accent ${
                  selectedTable === t.name
                    ? "bg-accent outline-2 outline-border"
                    : ""
                }`}
                disabled={schemasLoading || dataLoading}
              >
                <span className="truncate">{toProperCase(t.name)}</span>
                <span className="ml-2 text-muted-foreground">{t.rowCount}</span>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main content */}
      <div className="p-4 w-full overflow-hidden">
        {schemasError || dataError ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-destructive">
              {schemasError instanceof Error
                ? schemasError.message
                : dataError instanceof Error
                ? dataError.message
                : "An error occurred"}
            </div>
          </div>
        ) : schemasLoading || dataLoading ? (
          <div className="flex items-center justify-center h-full">
            <Spinner />
          </div>
        ) : (
          <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold tracking-tight md:block hidden">
                {toProperCase(selectedTable)}
              </h2>
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        sorting?.length > 0 &&
                          "dark:text-green-400 text-green-700 hover:text-green-700 hover:bg-green-500/20 transition-[background-color] duration-100"
                      )}
                    >
                      <List className="size-4" />
                      {sorting?.length > 0
                        ? `Sorted by ${sorting.length} rule(s)`
                        : "Sort"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-100" align="end">
                    <div className="space-y-4">
                      {pendingSorting.length === 0 && (
                        <div className="text-sm text-muted-foreground mb-2">
                          No sorts applied to this view
                        </div>
                      )}
                      {pendingSorting.map((sort, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="text-sm flex items-center gap-2 flex-1">
                            <div className="text-muted-foreground flex items-center gap-2">
                              <AlignJustify className="size-4" />
                              {index === 0 ? "sort by" : "then by"}
                            </div>{" "}
                            {sort.id}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">ascending</span>
                            <Checkbox
                              checked={!sort.desc}
                              onCheckedChange={(checked) => {
                                const newSorting = [...pendingSorting];
                                newSorting[index] = { ...sort, desc: !checked };
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
                      ))}
                      <div className="flex items-center gap-2 border-t border-border pt-3">
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
                              <SelectValue placeholder="Pick a column to sort by" />
                            </SelectTrigger>
                            <SelectContent>
                              {nonFilteredColumns.map((column) => (
                                <SelectItem key={column.id} value={column.id}>
                                  {column.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className="text-sm text-muted-foreground flex-1">
                            All columns have been added
                          </span>
                        )}
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
                          "dark:text-green-400 text-green-700 hover:text-green-700 hover:bg-green-500/20 transition-[background-color] duration-100"
                      )}
                    >
                      <Filter className="size-4" />
                      {columnFilters[selectedTable]?.length > 0
                        ? `Filtered by ${columnFilters[selectedTable]?.length} rule(s)`
                        : "Filter"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-100" align="end">
                    <div className="space-y-4">
                      {hasNoFilters && (
                        <div className="text-sm text-muted-foreground">
                          No filters applied to this view
                        </div>
                      )}

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
                            )?.type === "timestamp" ? (
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="outline"
                                    className={cn(
                                      "w-[240px] justify-start text-left font-normal h-8",
                                      !filter.value && "text-muted-foreground"
                                    )}
                                  >
                                    <CalendarIcon className="size-4 mr-2" />
                                    {filter.value ? (
                                      format(new Date(filter.value), "PP")
                                    ) : (
                                      <span>Pick a date</span>
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
                                        value: date ? date.toISOString() : ""
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
                                  column: filterableColumn ?? "",
                                  operator: OPERATORS[0].value,
                                  value: ""
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
                      Columns <ChevronDown className="ml-2 size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
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
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <Table containerClassName="border flex-1 overflow-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-background">
              <TableHeader className="bg-accent z-10 sticky top-0">
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
              </TableHeader>
              <TableBody className="h-full overflow-y-auto">
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      // data-row-key={
                      //   targetForeignKey?.column
                      //     ? row.getValue(targetForeignKey.column)
                      //     : undefined
                      // }
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
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="flex items-center space-x-2 justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Page</span>
                <Input
                  type="number"
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
                <span>of {table.getPageCount()}</span>
                <Select
                  value={pageSize?.toString()}
                  onValueChange={(value) => setPageSize(Number(value))}
                >
                  <SelectTrigger className="h-8 w-[110px]">
                    <SelectValue>{pageSize} rows</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {[50, 100, 200].map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size} rows
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span>
                  {table.getFilteredSelectedRowModel().rows.length} of{" "}
                  {table.getFilteredRowModel().rows.length} row(s) selected.
                </span>
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((page || 0) - 1)}
                  disabled={!table.getCanPreviousPage()}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((page || 0) + 1)}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
