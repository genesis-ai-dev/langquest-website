'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Spinner } from './spinner';
import {
  Download,
  FileJson,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import JSZip from 'jszip';
import { toast } from 'sonner';

interface ProjectDownloadProps {
  selectedProjectId?: string;
}

interface ProjectData {
  id: string;
  name: string;
  description: string;
  source_language: { english_name: string };
  target_language: { english_name: string };
  quests: Array<{
    id: string;
    name: string;
    description: string;
    assets: Array<{
      id: string;
      name: string;
      translations: Array<{
        id: string;
        text: string;
        audio: string;
        votes: Array<{ polarity: string }>;
        target_language: { english_name: string };
      }>;
      content: Array<{
        id: string;
        text: string;
        audio_id: string;
      }>;
      tags: Array<{
        tag: { name: string };
      }>;
    }>;
  }>;
}

export function ProjectDownload({ selectedProjectId }: ProjectDownloadProps) {
  const { user, environment } = useAuth();
  const [selectedQuests, setSelectedQuests] = useState<string[]>([]);
  const [downloadFormat, setDownloadFormat] = useState<'json' | 'csv'>('csv');
  const [includeAttachments, setIncludeAttachments] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Fetch user's projects with ownership info
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['user-projects', user?.id, environment],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await createBrowserClient(environment)
        .from('project')
        .select(
          `
          id, 
          name, 
          description,
          source_language:source_language_id(english_name), 
          target_language:target_language_id(english_name),
          profile_project_link!inner(
            membership,
            active,
            profile_id
          )
        `
        )
        .eq('profile_project_link.profile_id', user.id)
        .eq('profile_project_link.active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  // Fetch detailed project data for selected project
  const { data: projectData, isLoading: projectDataLoading } =
    useQuery<ProjectData>({
      queryKey: ['project-download-data', selectedProjectId, environment],
      queryFn: async () => {
        if (!selectedProjectId) return null;

        const { data, error } = await createBrowserClient(environment)
          .from('project')
          .select(
            `
          id,
          name,
          description,
          source_language:source_language_id(english_name),
          target_language:target_language_id(english_name),
          quests:quest(
            id,
            name,
            description,
            assets:quest_asset_link(
              asset:asset_id(
                id,
                name,
                translations:translation(
                  id,
                  text,
                  audio,
                  target_language:target_language_id(english_name),
                  votes:vote(polarity)
                ),
                content:asset_content_link(id, text, audio_id),
                tags:asset_tag_link(tag(name))
              )
            )
          )
        `
          )
          .eq('id', selectedProjectId)
          .single();

        if (error) throw error;

        // Flatten the nested structure
        const flattenedData = {
          ...data,
          quests:
            data.quests?.map((quest: any) => ({
              ...quest,
              assets:
                quest.assets
                  ?.map((assetLink: any) => assetLink.asset)
                  .filter(Boolean) || []
            })) || []
        };

        return flattenedData as ProjectData;
      },
      enabled: !!selectedProjectId
    });

  const handleQuestSelection = (questId: string, checked: boolean) => {
    setSelectedQuests((prev) =>
      checked ? [...prev, questId] : prev.filter((id) => id !== questId)
    );
  };

  const selectAllQuests = () => {
    if (!projectData) return;
    setSelectedQuests(projectData.quests.map((q) => q.id));
  };

  const clearAllQuests = () => {
    setSelectedQuests([]);
  };

  const generateCSV = (data: ProjectData, selectedQuestIds: string[]) => {
    const selectedQuestsData = data.quests.filter((q) =>
      selectedQuestIds.includes(q.id)
    );
    const rows: string[] = [];

    // CSV Headers
    const headers = [
      'project_name',
      'project_description',
      'source_language',
      'target_language',
      'quest_name',
      'quest_description',
      'asset_name',
      'asset_tags',
      'source_content',
      'source_audio_id',
      'translation_text',
      'translation_audio',
      'translation_language',
      'votes_up',
      'votes_down',
      'created_at'
    ];
    rows.push(headers.join(','));

    selectedQuestsData.forEach((quest) => {
      quest.assets.forEach((asset) => {
        const sourceContent = asset.content[0]; // Primary source content
        const tags = asset.tags.map((t) => t.tag.name).join(';');

        if (asset.translations.length === 0) {
          // Asset with no translations
          rows.push(
            [
              `"${data.name}"`,
              `"${data.description || ''}"`,
              `"${data.source_language.english_name}"`,
              `"${data.target_language.english_name}"`,
              `"${quest.name}"`,
              `"${quest.description || ''}"`,
              `"${asset.name}"`,
              `"${tags}"`,
              `"${sourceContent?.text || ''}"`,
              `"${sourceContent?.audio_id || ''}"`,
              '""', // empty translation
              '""', // empty audio
              '""', // empty language
              '0', // votes up
              '0', // votes down
              new Date().toISOString()
            ].join(',')
          );
        } else {
          // Asset with translations
          asset.translations.forEach((translation) => {
            const votesUp = translation.votes.filter(
              (v) => v.polarity === 'up'
            ).length;
            const votesDown = translation.votes.filter(
              (v) => v.polarity === 'down'
            ).length;

            rows.push(
              [
                `"${data.name}"`,
                `"${data.description || ''}"`,
                `"${data.source_language.english_name}"`,
                `"${data.target_language.english_name}"`,
                `"${quest.name}"`,
                `"${quest.description || ''}"`,
                `"${asset.name}"`,
                `"${tags}"`,
                `"${sourceContent?.text || ''}"`,
                `"${sourceContent?.audio_id || ''}"`,
                `"${translation.text || ''}"`,
                `"${translation.audio || ''}"`,
                `"${translation.target_language.english_name}"`,
                votesUp.toString(),
                votesDown.toString(),
                new Date().toISOString()
              ].join(',')
            );
          });
        }
      });
    });

    return rows.join('\n');
  };

  const generateJSON = (data: ProjectData, selectedQuestIds: string[]) => {
    const selectedQuestsData = data.quests.filter((q) =>
      selectedQuestIds.includes(q.id)
    );

    return JSON.stringify(
      {
        project: {
          id: data.id,
          name: data.name,
          description: data.description,
          source_language: data.source_language.english_name,
          target_language: data.target_language.english_name
        },
        quests: selectedQuestsData.map((quest) => ({
          id: quest.id,
          name: quest.name,
          description: quest.description,
          assets: quest.assets.map((asset) => ({
            id: asset.id,
            name: asset.name,
            tags: asset.tags.map((t) => t.tag.name),
            source_content: asset.content.map((c) => ({
              id: c.id,
              text: c.text,
              audio_id: c.audio_id
            })),
            translations: asset.translations.map((t) => ({
              id: t.id,
              text: t.text,
              audio: t.audio,
              target_language: t.target_language.english_name,
              votes: {
                up: t.votes.filter((v) => v.polarity === 'up').length,
                down: t.votes.filter((v) => v.polarity === 'down').length
              }
            }))
          }))
        })),
        exported_at: new Date().toISOString()
      },
      null,
      2
    );
  };

  const downloadFile = (
    content: string,
    filename: string,
    contentType: string
  ) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownload = async () => {
    if (!projectData || selectedQuests.length === 0) {
      toast.error('Please select at least one quest to download');
      return;
    }

    setIsDownloading(true);

    try {
      const selectedQuestsData = projectData.quests.filter((q) =>
        selectedQuests.includes(q.id)
      );
      const questNames = selectedQuestsData.map((q) => q.name).join('_');
      const projectName = projectData.name.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().split('T')[0];

      if (downloadFormat === 'csv') {
        const csvContent = generateCSV(projectData, selectedQuests);
        const filename = `${projectName}_${questNames}_${timestamp}.csv`;
        downloadFile(csvContent, filename, 'text/csv');
      } else {
        const jsonContent = generateJSON(projectData, selectedQuests);
        const filename = `${projectName}_${questNames}_${timestamp}.json`;
        downloadFile(jsonContent, filename, 'application/json');
      }

      toast.success(
        `Download completed: ${selectedQuestsData.length} quest(s) exported`
      );
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">
            Please log in to download project content.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Project</CardTitle>
          <CardDescription>
            Choose a project to download content from your projects
          </CardDescription>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <div className="flex justify-center p-4">
              <Spinner />
            </div>
          ) : (
            <Select value={selectedProjectId || ''} onValueChange={() => {}}>
              <SelectTrigger disabled>
                <SelectValue placeholder="Select a project">
                  {selectedProjectId
                    ? projects.find((p) => p.id === selectedProjectId)?.name ||
                      'Unknown Project'
                    : 'No project selected'}
                </SelectValue>
              </SelectTrigger>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Quest Selection */}
      {selectedProjectId && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Select Quests</CardTitle>
                <CardDescription>
                  Choose which quests to include in your download
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllQuests}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={clearAllQuests}>
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {projectDataLoading ? (
              <div className="flex justify-center p-4">
                <Spinner />
              </div>
            ) : projectData ? (
              <div className="space-y-3">
                {projectData.quests.map((quest) => (
                  <div
                    key={quest.id}
                    className="flex items-center space-x-3 p-3 border rounded-lg"
                  >
                    <Checkbox
                      checked={selectedQuests.includes(quest.id)}
                      onCheckedChange={(checked) =>
                        handleQuestSelection(quest.id, !!checked)
                      }
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{quest.name}</h4>
                        <Badge variant="secondary">
                          {quest.assets.length} assets
                        </Badge>
                      </div>
                      {quest.description && (
                        <p className="text-sm text-muted-foreground">
                          {quest.description}
                        </p>
                      )}
                    </div>
                    {selectedQuests.includes(quest.id) && (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                ))}
                {projectData.quests.length === 0 && (
                  <p className="text-center text-muted-foreground p-4">
                    This project has no quests yet.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-center text-muted-foreground p-4">
                Failed to load project data.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Download Options */}
      {selectedProjectId && projectData && (
        <Card>
          <CardHeader>
            <CardTitle>Download Options</CardTitle>
            <CardDescription>
              Configure your download preferences
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Format</label>
              <Select
                value={downloadFormat}
                onValueChange={(value: 'json' | 'csv') =>
                  setDownloadFormat(value)
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Spreadsheet)</SelectItem>
                  <SelectItem value="json">JSON (Structured Data)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                {downloadFormat === 'csv'
                  ? 'One row per translation with all project/quest/asset details'
                  : 'Hierarchical structure preserving relationships'}
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="attachments"
                checked={includeAttachments}
                onCheckedChange={(checked) => setIncludeAttachments(!!checked)}
                disabled // TODO: Implement attachment handling
              />
              <label
                htmlFor="attachments"
                className="text-sm text-muted-foreground"
              >
                Include audio attachments (Coming soon)
              </label>
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={handleDownload}
                disabled={selectedQuests.length === 0 || isDownloading}
                className="w-full"
              >
                {isDownloading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Preparing Download...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Download {selectedQuests.length} Quest
                    {selectedQuests.length !== 1 ? 's' : ''} as{' '}
                    {downloadFormat.toUpperCase()}
                  </>
                )}
              </Button>

              {selectedQuests.length > 0 && (
                <p className="text-xs text-center text-muted-foreground mt-2">
                  {selectedQuests.length} quest
                  {selectedQuests.length !== 1 ? 's' : ''} selected •
                  {projectData.quests
                    .filter((q) => selectedQuests.includes(q.id))
                    .reduce(
                      (total, quest) => total + quest.assets.length,
                      0
                    )}{' '}
                  total assets
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
