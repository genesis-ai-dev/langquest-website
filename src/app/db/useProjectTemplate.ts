'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/components/auth-provider';
import type {
  TemplateNode,
  TemplateStructure,
  TemplateRow
} from '@/lib/template/types';
import { templateStructureSchema } from '@/lib/template/types';

export interface ProjectTemplateData {
  linkId: string;
  template: TemplateRow;
  structure: TemplateStructure;
}

export function useProjectTemplate(projectId: string | undefined) {
  const { supabase } = useAuth();

  return useQuery({
    queryKey: ['project-template', projectId],
    enabled: !!projectId && !!supabase,
    queryFn: async (): Promise<ProjectTemplateData | null> => {
      if (!supabase || !projectId) return null;

      const { data, error } = await supabase
        .from('project_template_link')
        .select(
          `
          id,
          template_id,
          role,
          template (
            id, slug, name, icon, structure,
            source_language_id, copied_from_template_id,
            auto_sync, shared, active, locked_for_backward_compat,
            creator_id, project_count,
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

      const templateRow = data.template as unknown as TemplateRow;
      if (!templateRow) return null;

      const parsed = templateStructureSchema.safeParse(templateRow.structure);
      if (!parsed.success) return null;

      return {
        linkId: data.id,
        template: templateRow,
        structure: parsed.data
      };
    }
  });
}

export type { TemplateNode, TemplateStructure };
