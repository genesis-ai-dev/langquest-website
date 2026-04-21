'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-provider';
import type {
  BlueprintNode,
  BlueprintStructure,
  TemplateBlueprintRow
} from '@/lib/blueprint/types';
import { blueprintStructureSchema } from '@/lib/blueprint/types';

export interface ProjectBlueprintData {
  linkId: string;
  blueprint: TemplateBlueprintRow;
  structure: BlueprintStructure;
}

export function useProjectBlueprint(projectId: string | undefined) {
  const { supabase } = useAuth();

  return useQuery({
    queryKey: ['project-blueprint', projectId],
    enabled: !!projectId && !!supabase,
    queryFn: async (): Promise<ProjectBlueprintData | null> => {
      if (!supabase || !projectId) return null;

      const { data, error } = await supabase
        .from('project_blueprint_link')
        .select(
          `
          id,
          blueprint_id,
          role,
          template_blueprint (
            id, slug, name, icon, structure, structure_version,
            source_language_id, copied_from_blueprint_id,
            auto_sync, shared, active, locked_for_backward_compat,
            creator_id, project_count, locked_by, locked_at,
            created_at, last_updated
          )
        `
        )
        .eq('project_id', projectId)
        .eq('active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error || !data) return null;

      const blueprintRow = data.template_blueprint as unknown as TemplateBlueprintRow;
      if (!blueprintRow) return null;

      const parsed = blueprintStructureSchema.safeParse(blueprintRow.structure);
      if (!parsed.success) return null;

      return {
        linkId: data.id,
        blueprint: blueprintRow,
        structure: parsed.data
      };
    }
  });
}

export type { BlueprintNode, BlueprintStructure };
