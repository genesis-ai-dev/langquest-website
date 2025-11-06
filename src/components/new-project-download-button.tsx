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
import JSZip from 'jszip';

interface ProjectDownloadButtonProps {
  projectId: string;
}

interface ProjectData {
  id: string;
  name: string;
  description: string;
  target_language: { english_name: string };
  quests: Array<{
    id: string;
    name: string;
    description: string;
    parent_id?: string | null;
    parent_quest?: { name: string } | null;
    tags: Array<{
      tag: { key: string; value: string };
    }>;
    assets: Array<{
      id: string;
      name: string;
      source_language: { english_name: string };
      images: string[];
      content: Array<{
        id: string;
        text: string;
        audio: string | string[];
      }>;
      tags: Array<{
        tag: { key: string; value: string };
      }>;
      translations: Array<{
        id: string;
        name: string;
        content: Array<{
          id: string;
          text: string;
          audio: string | string[];
        }>;
        votes: Array<{ polarity: string }>;
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
          target_language:target_language_id(english_name),
          quests:quest(
            id,
            name,
            description,
            parent_id,
            parent_quest:parent_id(name),
            tags:quest_tag_link(tag(key, value)),
            assets:asset(
              id,
              name,
              source_language:source_language_id(english_name),
              images,
              content:asset_content_link(id, text, audio),
              tags:asset_tag_link(tag(key, value)),
              translations:asset!source_asset_id(
                id,
                name,
                content:asset_content_link(id, text, audio),
                votes:vote(polarity)
              )
            )
          )
        `
        )
        .eq('id', projectId)
        .is('quests.assets.parent_id', null)
        .single();

      console.log('Fetched project data for download:', data, error);

      if (error) throw error;
      if (!data) throw new Error('No project data found');

      // Process the data structure
      const flattenedData = {
        ...(data as Record<string, any>),
        quests: data?.quests || []
      };

      return flattenedData;
    },
    enabled: !!projectId && isOpen
  });

  console.log('Project data for download:', projectData);

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
      'target_language',
      'parent_quest_name',
      'quest_name',
      'quest_description',
      'quest_tags',
      'asset_name',
      'asset_tags',
      'source_language',
      'source_images',
      'source_content',
      'source_audio',
      'translation_text',
      'translation_audio',
      'votes_up',
      'votes_down'
    ];
    rows.push(headers.join(','));

    selectedQuestsData.forEach((quest) => {
      const questTags =
        quest.tags?.map((t) => `${t.tag.key}:${t.tag.value}`).join(';') || '';

      if (!quest.assets || quest.assets.length === 0) {
        // Quest without assets - still generate a row
        rows.push(
          [
            `"${data.name}"`,
            `"${data.description || ''}"`,
            `"${data.target_language.english_name}"`,
            `"${quest.parent_quest?.name || ''}"`,
            `"${quest.name}"`,
            `"${quest.description || ''}"`,
            `"${questTags}"`,
            '""', // asset_name
            '""', // asset_tags
            '""', // source_language
            '""', // source_images
            '""', // source_content
            '""', // source_audio
            '""', // translation_text
            '""', // translation_audio
            '0', // votes_up
            '0' // votes_down
          ].join(',')
        );
      } else {
        // Quest with assets
        quest.assets.forEach((asset) => {
          const sourceContent = asset.content?.[0]; // Primary source content
          const assetTags =
            asset.tags?.map((t) => `${t.tag.key}:${t.tag.value}`).join(';') ||
            '';
          const sourceImages = asset.images ? JSON.stringify(asset.images) : '';

          if (!asset.translations || asset.translations.length === 0) {
            // Asset with no translations
            rows.push(
              [
                `"${data.name}"`,
                `"${data.description || ''}"`,
                `"${data.target_language.english_name}"`,
                `"${quest.parent_quest?.name || ''}"`,
                `"${quest.name}"`,
                `"${quest.description || ''}"`,
                `"${questTags}"`,
                `"${asset.name}"`,
                `"${assetTags}"`,
                `"${asset.source_language?.english_name || ''}"`,
                `"${sourceImages}"`,
                `"${sourceContent?.text || ''}"`,
                `"${sourceContent?.audio ? (Array.isArray(sourceContent.audio) ? sourceContent.audio.join(';') : sourceContent.audio) : ''}"`,
                '""', // translation_text
                '""', // translation_audio
                '0', // votes_up
                '0' // votes_down
              ].join(',')
            );
          } else {
            // Asset with translations
            asset.translations.forEach((translation) => {
              const votesUp =
                translation.votes?.filter((v) => v.polarity === 'up').length ||
                0;
              const votesDown =
                translation.votes?.filter((v) => v.polarity === 'down')
                  .length || 0;
              const translationContent = translation.content?.[0];

              rows.push(
                [
                  `"${data.name}"`,
                  `"${data.description || ''}"`,
                  `"${data.target_language.english_name}"`,
                  `"${quest.parent_quest?.name || ''}"`,
                  `"${quest.name}"`,
                  `"${quest.description || ''}"`,
                  `"${questTags}"`,
                  `"${asset.name}"`,
                  `"${assetTags}"`,
                  `"${asset.source_language?.english_name || ''}"`,
                  `"${sourceImages}"`,
                  `"${sourceContent?.text || ''}"`,
                  `"${sourceContent?.audio || ''}"`,
                  `"${translationContent?.text || ''}"`,
                  `"${translationContent?.audio ? (Array.isArray(translationContent.audio) ? translationContent.audio.join(';') : translationContent.audio) : ''}"`,
                  votesUp.toString(),
                  votesDown.toString()
                ].join(',')
              );
            });
          }
        });
      }
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
          //        id: data.id,
          name: data.name,
          description: data.description,
          target_language: data.target_language.english_name
        },
        quests: selectedQuestsData.map((quest) => ({
          //        id: quest.id,
          name: quest.name,
          description: quest.description,
          parent_quest_name: quest.parent_quest?.name || null,
          assets: quest.assets.map((asset) => ({
            //          id: asset.id,
            name: asset.name,
            tags: asset.tags.map((t) => `${t.tag.key}:${t.tag.value}`),
            source_content: asset.content[0]?.text || null,
            source_audio: asset.content[0]?.audio
              ? Array.isArray(asset.content[0].audio)
                ? asset.content[0].audio.join(';')
                : asset.content[0].audio
              : null,
            translations: asset.translations.map((translation) => ({
              //            id: translation.id,
              text: translation.content[0].text,
              audio: translation.content[0].audio
                ? Array.isArray(translation.content[0].audio)
                  ? translation.content[0].audio.join(';')
                  : translation.content[0].audio
                : null,
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

  const downloadZip = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fetchFileFromSupabase = async (
    filePath: string
  ): Promise<Blob | null> => {
    console.log(`Fetching file from Supabase assets bucket: ${filePath}`);

    if (!filePath) {
      console.warn('Empty file path provided');
      return null;
    }

    try {
      const supabase = createBrowserClient(environment);

      // All files are in the 'assets' bucket
      const { data, error } = await supabase.storage
        .from('assets')
        .download(filePath);

      if (error) {
        console.error(`Supabase storage error for ${filePath}:`, error);
        return null;
      }

      if (!data) {
        console.warn(`No data received for ${filePath}`);
        return null;
      }

      console.log(
        `Successfully downloaded from Supabase: ${filePath}, size: ${data.size} bytes`
      );
      return data;
    } catch (error) {
      console.error(`Failed to fetch from Supabase ${filePath}:`, error);
      return null;
    }
  };

  const getFileExtension = (url: string): string => {
    const parts = url.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  const sanitizeFileName = (name: string): string => {
    return name.replace(/[^a-zA-Z0-9._-]/g, '_');
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
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');

      // Create ZIP file
      const zip = new JSZip();

      // Add main data file (CSV or JSON)
      let mainContent: string;
      let mainFileName: string;

      if (downloadFormat === 'csv') {
        mainContent = generateCSV(typedProjectData, selectedQuests);
        mainFileName = `data_${timestamp}.csv`;
      } else {
        mainContent = generateJSON(typedProjectData, selectedQuests);
        mainFileName = `data_${timestamp}.json`;
      }

      zip.file(mainFileName, mainContent);

      // Collect all unique file URLs from selected quests
      const allFileUrls = new Set<string>();
      const fileMapping = new Map<
        string,
        { questName: string; assetName: string; type: 'image' | 'audio' }
      >();

      selectedQuestsData.forEach((quest) => {
        quest.assets.forEach((asset) => {
          // Add images
          if (asset.images && Array.isArray(asset.images)) {
            asset.images.forEach((imageUrl) => {
              if (imageUrl && typeof imageUrl === 'string') {
                allFileUrls.add(imageUrl);
                fileMapping.set(imageUrl, {
                  questName: sanitizeFileName(quest.name),
                  assetName: sanitizeFileName(asset.name),
                  type: 'image'
                });
              }
            });
          }

          // Add source audio
          if (asset.content?.[0]?.audio) {
            const audioField = asset.content[0].audio;
            let audioUrls: string[] = [];

            if (typeof audioField === 'string') {
              // Handle both single string and semicolon-separated string
              audioUrls = audioField.includes(';')
                ? audioField
                    .split(';')
                    .filter((url: string) => url.trim() !== '')
                : [audioField].filter((url: string) => url.trim() !== '');
            } else if (Array.isArray(audioField)) {
              // Handle array format
              audioUrls = (audioField as any[]).filter(
                (url: any) =>
                  url && typeof url === 'string' && url.trim() !== ''
              );
            }

            audioUrls.forEach((audioUrl: string) => {
              allFileUrls.add(audioUrl);
              fileMapping.set(audioUrl, {
                questName: sanitizeFileName(quest.name),
                assetName: sanitizeFileName(asset.name),
                type: 'audio'
              });
            });
          }

          // Add translation audio
          asset.translations?.forEach((translation) => {
            if (translation.content?.[0]?.audio) {
              const audioField = translation.content[0].audio;
              let audioUrls: string[] = [];

              if (typeof audioField === 'string') {
                // Handle both single string and semicolon-separated string
                audioUrls = audioField.includes(';')
                  ? audioField
                      .split(';')
                      .filter((url: string) => url.trim() !== '')
                  : [audioField].filter((url: string) => url.trim() !== '');
              } else if (Array.isArray(audioField)) {
                // Handle array format
                audioUrls = (audioField as any[]).filter(
                  (url: any) =>
                    url && typeof url === 'string' && url.trim() !== ''
                );
              }

              audioUrls.forEach((audioUrl: string) => {
                allFileUrls.add(audioUrl);
                fileMapping.set(audioUrl, {
                  questName: sanitizeFileName(quest.name),
                  assetName: sanitizeFileName(asset.name),
                  type: 'audio'
                });
              });
            }
          });
        });
      });

      // Log collected URLs for debugging
      console.log(`Collected ${allFileUrls.size} URLs:`);
      Array.from(allFileUrls).forEach((url, index) => {
        console.log(`${index + 1}: ${url}`);
      });

      // Download all files and add to ZIP
      const totalFiles = allFileUrls.size;
      let processedFiles = 0;

      if (totalFiles === 0) {
        console.warn('No files to download!');
        toast.warning('No media files found in selected quests.');
      } else {
        toast.info(`Downloading ${totalFiles} files...`);
      }

      const downloadPromises = Array.from(allFileUrls).map(
        async (fileUrl, index) => {
          const fileInfo = fileMapping.get(fileUrl);
          if (!fileInfo) return;

          console.log(`Attempting to download: ${fileUrl}`);

          try {
            const fileBlob = await fetchFileFromSupabase(fileUrl);
            if (fileBlob) {
              console.log(
                `Successfully downloaded ${fileUrl}, size: ${fileBlob.size} bytes`
              );
              // Extract the original filename from the URL path
              const urlPath = fileUrl.split('/').pop() || '';
              const fileName =
                urlPath ||
                `${fileInfo.type === 'image' ? 'img' : 'aud'}_${index + 1}.${getFileExtension(fileUrl) || (fileInfo.type === 'image' ? 'jpg' : 'mp3')}`;

              zip.file(`assets/${fileName}`, fileBlob);
              console.log(`Added to ZIP: ${fileName} (${fileBlob.size} bytes)`);
            } else {
              console.warn(`No blob received for: ${fileUrl}`);
            }
          } catch (error) {
            console.error(`Failed to download ${fileUrl}:`, error);
          }

          processedFiles++;
          if (processedFiles % 5 === 0 || processedFiles === totalFiles) {
            toast.info(`Processing files: ${processedFiles}/${totalFiles}`);
          }
        }
      );

      await Promise.all(downloadPromises);

      // Count successfully added files
      const successfulFiles = Object.keys(zip.files).filter((name) =>
        name.startsWith('assets/')
      ).length;

      if (successfulFiles === 0 && allFileUrls.size > 0) {
        toast.warning(
          'No media files could be downloaded. Only data file will be included.'
        );
      } else if (successfulFiles < allFileUrls.size) {
        toast.warning(
          `${successfulFiles}/${allFileUrls.size} media files downloaded successfully.`
        );
      }

      // Add README file
      const readmeContent = `# ${typedProjectData.name} - Export Package

## Contents

- **${mainFileName}**: Main translation data in ${downloadFormat.toUpperCase()} format
- **assets/**: Folder containing all related media files with their original names
  - Images and audio files maintain their original filenames

## Export Details

- Export Date: ${new Date().toISOString()}
- Selected Quests: ${selectedQuestsData.length}
- Total Assets: ${selectedQuestsData.reduce((total, quest) => total + quest.assets.length, 0)}
- Total Files: ${allFileUrls.size + 1} (including data file)

## Quest List

${selectedQuestsData.map((quest) => `- ${quest.name} (${quest.assets.length} assets)`).join('\n')}

---
Generated by LangQuest Project Export Tool
`;

      zip.file('README.md', readmeContent);

      // Generate and download ZIP
      toast.info('Creating ZIP file...');
      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'STORE', // No compression to avoid corruption
        compressionOptions: {
          level: 0
        }
      });
      const zipFileName = `export_${timestamp}.zip`;

      downloadZip(zipBlob, zipFileName);

      toast.success(
        `Download completed: ${selectedQuestsData.length} quest(s) exported with ${processedFiles} files`
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
              Export translation data with related images and audio files
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
                <div className="p-3 bg-muted rounded text-sm space-y-2">
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
                  <div className="text-xs text-muted-foreground">
                    Will include: {downloadFormat.toUpperCase()} data + images +
                    audio files in ZIP format
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
                    Download ZIP
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
