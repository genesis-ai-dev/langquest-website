'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createBrowserClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Spinner } from './spinner';
import { Download, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { toast } from 'sonner';

interface ProjectDownloadButtonProps {
  projectId: string;
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

export function ProjectDownloadButton({
  projectId
}: ProjectDownloadButtonProps) {
  const { environment } = useAuth();
  const [selectedQuests, setSelectedQuests] = useState<string[]>([]);
  const [downloadFormat, setDownloadFormat] = useState<'json' | 'csv'>('csv');
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch detailed project data
  const { data: projectData, isLoading: projectDataLoading } = useQuery({
    queryKey: ['project-download-data', projectId, environment],
    queryFn: async () => {
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
        .eq('id', projectId)
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

      return flattenedData;
    },
    enabled: !!projectId && isOpen
  });

  // Auto-select all quests when data loads
  useEffect(() => {
    if (projectData) {
      setSelectedQuests(
        (projectData as unknown as ProjectData).quests.map((q) => q.id)
      );
    }
  }, [projectData]);

  const handleQuestSelection = (questId: string, checked: boolean) => {
    setSelectedQuests((prev) =>
      checked ? [...prev, questId] : prev.filter((id) => id !== questId)
    );
  };

  const selectAllQuests = () => {
    if (!projectData) return;
    setSelectedQuests(
      (projectData as unknown as ProjectData).quests.map((q) => q.id)
    );
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
      'votes_down'
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
              '""', // translation_text
              '""', // translation_audio
              '""', // translation_language
              '0', // votes_up
              '0' // votes_down
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
                votesDown.toString()
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
            source_content: asset.content[0]?.text || null,
            source_audio_id: asset.content[0]?.audio_id || null,
            translations: asset.translations.map((translation) => ({
              id: translation.id,
              text: translation.text,
              audio: translation.audio,
              language: translation.target_language.english_name,
              votes: {
                up: translation.votes.filter((v) => v.polarity === 'up').length,
                down: translation.votes.filter((v) => v.polarity === 'down')
                  .length
              }
            }))
          }))
        }))
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
      const typedProjectData = projectData as unknown as ProjectData;
      const selectedQuestsData = typedProjectData.quests.filter((q) =>
        selectedQuests.includes(q.id)
      );
      const questNames = selectedQuestsData.map((q) => q.name).join('_');
      const projectName = typedProjectData.name.replace(/[^a-zA-Z0-9]/g, '_');
      const timestamp = new Date().toISOString().split('T')[0];

      if (downloadFormat === 'csv') {
        const csvContent = generateCSV(typedProjectData, selectedQuests);
        const filename = `${projectName}_${questNames}_${timestamp}.csv`;
        downloadFile(csvContent, filename, 'text/csv');
      } else {
        const jsonContent = generateJSON(typedProjectData, selectedQuests);
        const filename = `${projectName}_${questNames}_${timestamp}.json`;
        downloadFile(jsonContent, filename, 'application/json');
      }

      toast.success(
        `Download completed: ${selectedQuestsData.length} quest(s) exported`
      );
      setIsOpen(false);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96" align="end">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold">Download Project Content</h3>
            <p className="text-sm text-muted-foreground">
              Export translation data for this project
            </p>
          </div>

          {projectDataLoading ? (
            <div className="flex justify-center p-4">
              <Spinner />
            </div>
          ) : projectData ? (
            <>
              {/* Quest Selection */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium">Select Quests</label>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={selectAllQuests}>
                      All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={clearAllQuests}>
                      None
                    </Button>
                  </div>
                </div>

                <div className="max-h-40 overflow-y-auto space-y-2">
                  {(projectData as unknown as ProjectData).quests.map(
                    (quest) => (
                      <div
                        key={quest.id}
                        className="flex items-center space-x-2 p-2 border rounded text-sm"
                      >
                        <Checkbox
                          checked={selectedQuests.includes(quest.id)}
                          onCheckedChange={(checked) =>
                            handleQuestSelection(quest.id, !!checked)
                          }
                        />
                        <div className="flex-1 min-w-0">
                          <div className="truncate font-medium">
                            {quest.name}
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {quest.assets.length} assets
                          </Badge>
                        </div>
                        {selectedQuests.includes(quest.id) && (
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Format Selection */}
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
                    <SelectItem value="json">JSON (Structured)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Download Summary */}
              {selectedQuests.length > 0 && (
                <div className="p-3 bg-muted rounded text-sm">
                  <div className="font-medium">
                    {selectedQuests.length} quest(s) selected •{' '}
                    {(projectData as unknown as ProjectData).quests
                      .filter((q) => selectedQuests.includes(q.id))
                      .reduce(
                        (total, quest) => total + quest.assets.length,
                        0
                      )}{' '}
                    asset(s)
                  </div>
                </div>
              )}

              {/* Download Button */}
              <Button
                onClick={handleDownload}
                disabled={selectedQuests.length === 0 || isDownloading}
                className="w-full"
              >
                {isDownloading ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Download {downloadFormat.toUpperCase()}
                  </>
                )}
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Failed to load project data.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
