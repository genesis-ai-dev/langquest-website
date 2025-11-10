'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';
import { QuestsUnstructured } from './QuestExplorerTemplates/unstructured';

interface QuestExplorerProps {
  project: any;
  projectId: string;
  userPermission: any;
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
      return data || [];
    }
  });

  // Check project template and render appropriate component
  if (project?.template === 'unstructured') {
    return (
      <QuestsUnstructured
        project={project}
        projectId={projectId}
        userRole={userRole}
        quests={quests}
        questsLoading={questsLoading}
        onSelectQuest={setSelectedQuestId}
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
      quests={quests}
      questsLoading={questsLoading}
      onSelectQuest={setSelectedQuestId}
      selectedQuestId={selectedQuestId}
    />
  );
}
