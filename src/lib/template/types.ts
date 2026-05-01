import { z } from 'zod';

export const TEMPLATE_NODE_ID_LENGTH = 10;
export const TEMPLATE_MAX_DEPTH = 5;
export const TEMPLATE_FORMAT_VERSION = 1;

export const templateNodeSchema: z.ZodType<TemplateNode> = z.lazy(() =>
  z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    short_label: z.string().optional(),
    label_template: z.string().optional(),
    node_type: z.string().optional(),
    linkable_type: z.enum(['quest', 'asset']),
    is_download_unit: z.boolean().optional(),
    is_version_anchor: z.boolean().optional(),
    allows_spanning: z.boolean().optional(),
    deleted: z.boolean().optional(),
    metadata: z.record(z.unknown()).optional(),
    children: z.array(templateNodeSchema).optional()
  })
);

export const templateStructureSchema = z.object({
  format_version: z.number().int().positive(),
  root: templateNodeSchema
});

export type TemplateNode = {
  id: string;
  name: string;
  short_label?: string;
  label_template?: string;
  node_type?: string;
  linkable_type: 'quest' | 'asset';
  is_download_unit?: boolean;
  is_version_anchor?: boolean;
  allows_spanning?: boolean;
  deleted?: boolean;
  metadata?: Record<string, unknown>;
  children?: TemplateNode[];
};

export type TemplateStructure = {
  format_version: number;
  root: TemplateNode;
};

/** Default publish intent — sets the initial selection in the publish dialog, NOT an editing mode. */
export type PublishIntent = 'starting_point' | 'update';

export type TemplateRow = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  icon: string | null;
  structure: TemplateStructure;
  source_languoid_id: string | null;
  copied_from_template_id: string | null;
  auto_sync: boolean;
  shared: boolean;
  active: boolean;
  creator_id: string | null;
  project_count: number;
  created_at: string;
  last_updated: string;
};
