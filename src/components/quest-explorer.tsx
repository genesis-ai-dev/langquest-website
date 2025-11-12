'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { QuestsUnstructured } from './QuestExplorerTemplates/unstructured';

interface QuestExplorerProps {
  project: any;
  projectId: string;
  userPermission: any;
}

// Tipo para representar uma quest com estrutura hierárquica
export interface Quest {
  id: string;
  name: string;
  description: string | null;
  metadata: Object;
  parent_id: string | null;
  children?: Quest[];
  icon?: string;
}

export function QuestExplorer({
  project,
  projectId,
  userPermission
}: QuestExplorerProps) {
  // Internal state management
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  // Auth and supabase client
  const { user, environment } = useAuth();
  const supabase = createBrowserClient(environment);

  // Calculate userRole from userPermission
  const isOwner = userPermission?.membership === 'owner';
  const isAdmin = userPermission?.membership === 'admin';
  const userRole: 'owner' | 'admin' | 'member' | 'viewer' = isOwner
    ? 'owner'
    : isAdmin
      ? 'admin'
      : userPermission?.membership
        ? 'member'
        : 'viewer';

  // Fetch quests for this project
  const { data: quests, isLoading: questsLoading } = useQuery({
    queryKey: ['quests', projectId],
    enabled: !!projectId && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quest')
        .select('*')
        .eq('project_id', projectId)
        .eq('active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Função para construir estrutura hierárquica
      const buildQuestTree = (quests: any[]): Quest[] => {
        // Primeiro, criamos um mapa de todos os quests com children vazios
        const questMap: Record<string, Quest> = {};
        quests.forEach((quest) => {
          questMap[quest.id] = {
            id: quest.id,
            name: quest.name,
            description: quest.description,
            metadata: quest.metadata,
            parent_id: quest.parent_id,
            children: []
          };
        });

        // Array para armazenar os nós raiz (sem parent_id)
        const rootQuests: Quest[] = [];

        // Segundo, organizamos a hierarquia
        quests.forEach((quest) => {
          const questNode = questMap[quest.id];

          if (quest.parent_id === null) {
            // Quest está na raiz
            rootQuests.push(questNode);
          } else {
            // Quest tem pai, adiciona como child do pai
            const parent = questMap[quest.parent_id];
            if (parent) {
              parent.children?.push(questNode);
            }
          }
        });

        return rootQuests;
      };

      const questsTree = buildQuestTree(data || []);

      return [data || [], questsTree];
    }
  });

  // Check project template and render appropriate component
  if (project?.template === 'unstructured') {
    return (
      <QuestsUnstructured
        project={project}
        projectId={projectId}
        userRole={userRole}
        quests={quests?.[0] ?? []}
        questsLoading={questsLoading}
        onSelectQuest={setSelectedQuestId}
        questsTree={quests?.[1] ?? []}
        selectedQuestId={selectedQuestId}
      />
    );
  }

  // Default fallback - could add more templates here in the future
  return (
    <QuestsUnstructured
      project={project}
      projectId={projectId}
      userRole={userRole}
      quests={quests?.[0] ?? []}
      questsLoading={questsLoading}
      onSelectQuest={setSelectedQuestId}
      questsTree={quests?.[1] ?? []}
      selectedQuestId={selectedQuestId}
    />
  );
}
