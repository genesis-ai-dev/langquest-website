import { z } from 'zod';

export const BLUEPRINT_NODE_ID_LENGTH = 10;
export const BLUEPRINT_MAX_DEPTH = 5;
export const BLUEPRINT_FORMAT_VERSION = 1;

export const blueprintNodeSchema: z.ZodType<BlueprintNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    short_label: z.string().optional(),
    label_template: z.string().optional(),
    node_type: z.string().optional(),
    linkable_type: z
      .enum(['quest', 'asset', 'both'])
      .nullable()
      .optional(),
    is_download_unit: z.boolean().optional(),
    is_version_anchor: z.boolean().optional(),
    allows_spanning: z.boolean().optional(),
    deleted: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional(),
    children: z.array(blueprintNodeSchema).optional()
  })
);

export const blueprintStructureSchema = z.object({
  format_version: z.number().int().positive(),
  root: blueprintNodeSchema
});

export type BlueprintNode = {
  id: string;
  name: string;
  short_label?: string;
  label_template?: string;
  node_type?: string;
  linkable_type?: 'quest' | 'asset' | 'both' | null;
  is_download_unit?: boolean;
  is_version_anchor?: boolean;
  allows_spanning?: boolean;
  deleted?: boolean;
  metadata?: Record<string, unknown>;
  children?: BlueprintNode[];
};

export type BlueprintStructure = {
  format_version: number;
  root: BlueprintNode;
};

export type TemplateBlueprintRow = {
  id: string;
  slug: string | null;
  name: string;
  icon: string | null;
  structure: BlueprintStructure;
  structure_version: number;
  source_language_id: string | null;
  copied_from_blueprint_id: string | null;
  auto_sync: boolean;
  shared: boolean;
  active: boolean;
  locked_for_backward_compat: boolean;
  creator_id: string | null;
  project_count: number;
  locked_by: string | null;
  locked_at: string | null;
  created_at: string;
  last_updated: string;
};
