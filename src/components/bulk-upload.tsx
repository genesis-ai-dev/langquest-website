'use client';

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/spinner';
import { toast } from 'sonner';
import {
  Upload,
  Download,
  FileSpreadsheet,
  AlertCircle,
  X
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Papa from 'papaparse';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';

interface BulkUploadProps {
  mode: 'project' | 'quest';
  questId?: string; // Required for quest mode
  onSuccess?: () => void;
}

interface ProjectRow {
  project_name: string;
  project_description?: string;
  source_language: string;
  target_language: string;
  quest_name: string;
  quest_description?: string;
  quest_tags?: string;
  asset_name: string;
  asset_content?: string;
  asset_tags?: string;
  asset_image_urls?: string;
  asset_audio_urls?: string;
}

interface QuestRow {
  asset_name: string;
  asset_content?: string;
  asset_tags?: string;
  asset_image_urls?: string;
  asset_audio_urls?: string;
}

interface UploadProgress {
  total: number;
  completed: number;
  current: string;
  errors: Array<{ row: number; message: string }>;
  warnings: Array<{ row: number; message: string }>;
}

export function BulkUpload({ mode, questId, onSuccess }: BulkUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    total: 0,
    completed: 0,
    current: '',
    errors: [],
    warnings: []
  });
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user, environment } = useAuth();

  // Get the supabase client for the current environment
  const supabaseClient = useMemo(() => {
    return createBrowserClient(environment);
  }, [environment]);

  const downloadTemplate = useCallback(() => {
    const headers =
      mode === 'project'
        ? [
            'project_name',
            'project_description',
            'source_language',
            'target_language',
            'quest_name',
            'quest_description',
            'quest_tags',
            'asset_name',
            'asset_content',
            'asset_tags',
            'asset_image_urls',
            'asset_audio_urls'
          ]
        : [
            'asset_name',
            'asset_content',
            'asset_tags',
            'asset_image_urls',
            'asset_audio_urls'
          ];

    const sampleData =
      mode === 'project'
        ? [
            'My Project,Description of my project,English,Spanish,Chapter 1,First section content,category1;tag1,Item A,Content for item A,tag1;tag2,https://example.com/image1.jpg,https://example.com/audio1.mp3',
            'My Project,Description of my project,English,Spanish,Chapter 1,First section content,category1;tag1,Item B,Content for item B,tag2;tag3,,https://example.com/audio2.mp3'
          ]
        : [
            'Asset Name 1,Text content for this asset,category;tag,https://example.com/img1.jpg,https://example.com/sound1.mp3',
            'Asset Name 2,Another piece of content,tag;other,,https://example.com/sound2.mp3'
          ];

    const csvContent = [headers.join(','), ...sampleData].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mode}-upload-template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [mode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please select a CSV file');
      return;
    }

    setFile(selectedFile);

    // Parse CSV for preview
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        setParsedData(results.data);
        setShowPreview(true);
      },
      error: (error) => {
        toast.error(`Error parsing CSV: ${error.message}`);
      }
    });
  };

  const validateData = (
    data: any[]
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (data.length === 0) {
      errors.push('CSV file is empty');
      return { isValid: false, errors };
    }

    const requiredFields =
      mode === 'project'
        ? [
            'project_name',
            'source_language',
            'target_language',
            'quest_name',
            'asset_name'
          ]
        : ['asset_name'];

    // Check if required columns exist
    const firstRow = data[0];
    const missingColumns = requiredFields.filter(
      (field) => !(field in firstRow)
    );
    if (missingColumns.length > 0) {
      errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Validate each row
    data.forEach((row, index) => {
      requiredFields.forEach((field) => {
        if (!row[field] || row[field].toString().trim() === '') {
          errors.push(`Row ${index + 1}: Missing required field '${field}'`);
        }
      });
    });

    return { isValid: errors.length === 0, errors };
  };

  const processProjectUpload = async (data: ProjectRow[]) => {
    const projectMap = new Map<string, string>(); // project_name -> project_id
    const questMap = new Map<string, string>(); // project_name:quest_name -> quest_id
    const languageCache = new Map<string, string>(); // language_name -> language_id

    setProgress((prev) => ({ ...prev, total: data.length }));

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      setProgress((prev) => ({
        ...prev,
        completed: i,
        current: `Processing: ${row.asset_name}`
      }));

      try {
        // Get or create project
        let projectId = projectMap.get(row.project_name);
        if (!projectId) {
          // Get language IDs
          let sourceLanguageId = languageCache.get(row.source_language);
          let targetLanguageId = languageCache.get(row.target_language);

          if (!sourceLanguageId) {
            const { data: sourceLang } = await supabaseClient
              .from('language')
              .select('id')
              .eq('english_name', row.source_language)
              .single();

            if (!sourceLang) {
              throw new Error(
                `Source language '${row.source_language}' not found`
              );
            }
            sourceLanguageId = sourceLang.id;
            if (sourceLanguageId) {
              languageCache.set(row.source_language, sourceLanguageId);
            }
          }

          if (!targetLanguageId) {
            const { data: targetLang } = await supabaseClient
              .from('language')
              .select('id')
              .eq('english_name', row.target_language)
              .single();

            if (!targetLang) {
              throw new Error(
                `Target language '${row.target_language}' not found`
              );
            }
            targetLanguageId = targetLang.id;
            if (targetLanguageId) {
              languageCache.set(row.target_language, targetLanguageId);
            }
          }

          // At this point, both language IDs are guaranteed to be strings
          if (!sourceLanguageId || !targetLanguageId) {
            throw new Error('Language IDs could not be resolved');
          }

          // Check if project already exists
          const { data: existingProject } = await supabaseClient
            .from('project')
            .select('id')
            .eq('name', row.project_name)
            .single();

          if (existingProject) {
            // Use existing project
            projectId = existingProject.id;
          } else {
            // Create new project
            const { data: project, error: projectError } = await supabaseClient
              .from('project')
              .insert({
                name: row.project_name,
                description: row.project_description || null,
                source_language_id: sourceLanguageId,
                target_language_id: targetLanguageId
              })
              .select('id')
              .single();

            if (projectError) throw projectError;
            projectId = project.id;
          }

          if (!projectId) {
            throw new Error('Project ID could not be resolved');
          }
          projectMap.set(row.project_name, projectId);
        }

        // Get or create quest
        const questKey = `${row.project_name}:${row.quest_name}`;
        let questId = questMap.get(questKey);
        if (!questId) {
          if (!projectId) {
            throw new Error('Project ID is required to create quest');
          }

          const { data: quest, error: questError } = await supabaseClient
            .from('quest')
            .insert({
              name: row.quest_name,
              description: row.quest_description || null,
              project_id: projectId
            })
            .select('id')
            .single();

          if (questError) throw questError;
          questId = quest.id;

          if (!questId) {
            throw new Error('Quest ID could not be resolved');
          }
          questMap.set(questKey, questId);

          // Handle quest tags
          if (row.quest_tags) {
            const tagNames = row.quest_tags
              .split(';')
              .map((t) => t.trim())
              .filter(Boolean);
            for (const tagName of tagNames) {
              // Get or create tag
              let { data: tag } = await supabaseClient
                .from('tag')
                .select('id')
                .eq('name', tagName)
                .single();

              if (!tag) {
                const { data: newTag, error: tagError } = await supabaseClient
                  .from('tag')
                  .insert({ name: tagName })
                  .select('id')
                  .single();

                if (tagError) throw tagError;
                tag = newTag;
              }

              // Link tag to quest
              await supabaseClient.from('quest_tag_link').insert({
                quest_id: questId,
                tag_id: tag.id
              });
            }
          }
        }

        // Create asset
        const sourceLanguageId = languageCache.get(row.source_language);
        if (!sourceLanguageId) {
          throw new Error(
            `Source language ID not found for '${row.source_language}'`
          );
        }
        const { data: asset, error: assetError } = await supabaseClient
          .from('asset')
          .insert({
            name: row.asset_name,
            source_language_id: sourceLanguageId
          })
          .select('id')
          .single();

        if (assetError) throw assetError;

        // Add asset content
        if (row.asset_content) {
          await supabaseClient.from('asset_content_link').insert({
            asset_id: asset.id,
            text: row.asset_content,
            id: crypto.randomUUID()
          });
        }

        // Handle asset tags
        if (row.asset_tags) {
          const tagNames = row.asset_tags
            .split(';')
            .map((t) => t.trim())
            .filter(Boolean);
          for (const tagName of tagNames) {
            let { data: tag } = await supabaseClient
              .from('tag')
              .select('id')
              .eq('name', tagName)
              .single();

            if (!tag) {
              const { data: newTag, error: tagError } = await supabaseClient
                .from('tag')
                .insert({ name: tagName })
                .select('id')
                .single();

              if (tagError) throw tagError;
              tag = newTag;
            }

            await supabaseClient.from('asset_tag_link').insert({
              asset_id: asset.id,
              tag_id: tag.id
            });
          }
        }

        // Link asset to quest
        await supabaseClient.from('quest_asset_link').insert({
          quest_id: questId,
          asset_id: asset.id
        });

        // Handle image and audio URLs (validation warnings)
        if (row.asset_image_urls || row.asset_audio_urls) {
          setProgress((prev) => ({
            ...prev,
            warnings: [
              ...prev.warnings,
              {
                row: i + 1,
                message:
                  'Image and audio URLs are noted but not processed in this version'
              }
            ]
          }));
        }
      } catch (error: any) {
        setProgress((prev) => ({
          ...prev,
          errors: [
            ...prev.errors,
            {
              row: i + 1,
              message: error.message || 'Unknown error'
            }
          ]
        }));
      }
    }

    setProgress((prev) => ({
      ...prev,
      completed: data.length,
      current: 'Upload complete!'
    }));
  };

  const processQuestUpload = async (data: QuestRow[]) => {
    if (!questId) {
      throw new Error('Quest ID is required for quest-level upload');
    }

    // Get quest details for language
    const { data: quest, error: questError } = await supabaseClient
      .from('quest')
      .select(
        `
        project:project_id(
          source_language_id
        )
      `
      )
      .eq('id', questId)
      .single();

    if (questError || !quest) {
      throw new Error('Failed to fetch quest details');
    }

    const sourceLanguageId = (quest.project as any).source_language_id;
    setProgress((prev) => ({ ...prev, total: data.length }));

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      setProgress((prev) => ({
        ...prev,
        completed: i,
        current: `Processing: ${row.asset_name}`
      }));

      try {
        // Create asset
        const { data: asset, error: assetError } = await supabaseClient
          .from('asset')
          .insert({
            name: row.asset_name,
            source_language_id: sourceLanguageId
          })
          .select('id')
          .single();

        if (assetError) throw assetError;

        // Add asset content
        if (row.asset_content) {
          await supabaseClient.from('asset_content_link').insert({
            asset_id: asset.id,
            text: row.asset_content,
            id: crypto.randomUUID()
          });
        }

        // Handle asset tags
        if (row.asset_tags) {
          const tagNames = row.asset_tags
            .split(';')
            .map((t) => t.trim())
            .filter(Boolean);
          for (const tagName of tagNames) {
            let { data: tag } = await supabaseClient
              .from('tag')
              .select('id')
              .eq('name', tagName)
              .single();

            if (!tag) {
              const { data: newTag, error: tagError } = await supabaseClient
                .from('tag')
                .insert({ name: tagName })
                .select('id')
                .single();

              if (tagError) throw tagError;
              tag = newTag;
            }

            await supabaseClient.from('asset_tag_link').insert({
              asset_id: asset.id,
              tag_id: tag.id
            });
          }
        }

        // Link asset to quest
        await supabaseClient.from('quest_asset_link').insert({
          quest_id: questId,
          asset_id: asset.id
        });

        // Handle image and audio URLs (validation warnings)
        if (row.asset_image_urls || row.asset_audio_urls) {
          setProgress((prev) => ({
            ...prev,
            warnings: [
              ...prev.warnings,
              {
                row: i + 1,
                message:
                  'Image and audio URLs are noted but not processed in this version'
              }
            ]
          }));
        }
      } catch (error: any) {
        setProgress((prev) => ({
          ...prev,
          errors: [
            ...prev.errors,
            {
              row: i + 1,
              message: error.message || 'Unknown error'
            }
          ]
        }));
      }
    }

    setProgress((prev) => ({
      ...prev,
      completed: data.length,
      current: 'Upload complete!'
    }));
  };

  const handleUpload = async () => {
    if (!file || parsedData.length === 0) {
      toast.error('Please select and preview a CSV file first');
      return;
    }

    // Check if user is authenticated
    if (!user) {
      toast.error('You must be logged in to upload content');
      return;
    }

    const validation = validateData(parsedData);
    if (!validation.isValid) {
      toast.error(`Validation failed: ${validation.errors.join(', ')}`);
      return;
    }

    setIsUploading(true);
    setProgress({
      total: parsedData.length,
      completed: 0,
      current: 'Starting upload...',
      errors: [],
      warnings: []
    });

    try {
      if (mode === 'project') {
        await processProjectUpload(parsedData as ProjectRow[]);
      } else {
        await processQuestUpload(parsedData as QuestRow[]);
      }

      const { errors, warnings } = progress;
      if (errors.length === 0) {
        toast.success(`Successfully uploaded ${parsedData.length} items!`);
      } else {
        toast.warning(
          `Upload completed with ${errors.length} errors and ${warnings.length} warnings`
        );
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setParsedData([]);
    setShowPreview(false);
    setProgress({
      total: 0,
      completed: 0,
      current: '',
      errors: [],
      warnings: []
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 pr-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Bulk {mode === 'project' ? 'Project' : 'Upload Assets to Quest'}
            </CardTitle>
            <CardDescription>
              Upload multiple{' '}
              {mode === 'project'
                ? 'projects with quests and assets'
                : 'assets to this quest'}{' '}
              using a CSV file
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={downloadTemplate}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Template
              </Button>
              <div className="text-sm text-muted-foreground">
                Download a template CSV file to get started
              </div>
            </div>

            {user && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Upload Information</AlertTitle>
                <AlertDescription>
                  Uploading as:{' '}
                  <span className="font-medium">{user.email}</span> to{' '}
                  <span className="font-medium capitalize">{environment}</span>{' '}
                  environment
                </AlertDescription>
              </Alert>
            )}

            {!user && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Authentication Required</AlertTitle>
                <AlertDescription>
                  You must be logged in to upload content
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="csv-file">Select CSV File</Label>
              <Input
                ref={fileInputRef}
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isUploading}
              />
            </div>

            {file && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>File Selected</AlertTitle>
                <AlertDescription>
                  {file.name} ({parsedData.length} rows)
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {showPreview && parsedData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Preview Data</CardTitle>
              <CardDescription>
                Review the first few rows before uploading
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64 w-full rounded-md border">
                <div className="p-4">
                  <div className="grid gap-2 text-sm">
                    {parsedData.slice(0, 5).map((row, index) => (
                      <div key={index} className="p-2 border rounded">
                        <div className="font-medium">Row {index + 1}</div>
                        <div className="grid grid-cols-2 gap-2 mt-1 text-xs">
                          {Object.entries(row).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span>{' '}
                              {String(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                    {parsedData.length > 5 && (
                      <div className="text-center text-muted-foreground">
                        ... and {parsedData.length - 5} more rows
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {isUploading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                Upload Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>{progress.current}</span>
                  <span>
                    {progress.completed} / {progress.total}
                  </span>
                </div>
                <Progress value={(progress.completed / progress.total) * 100} />
              </div>

              {(progress.errors.length > 0 || progress.warnings.length > 0) && (
                <Tabs defaultValue="errors" className="w-full">
                  <TabsList>
                    <TabsTrigger
                      value="errors"
                      className="flex items-center gap-2"
                    >
                      <AlertCircle className="h-4 w-4" />
                      Errors ({progress.errors.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="warnings"
                      className="flex items-center gap-2"
                    >
                      <AlertCircle className="h-4 w-4" />
                      Warnings ({progress.warnings.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="errors">
                    <ScrollArea className="h-32">
                      {progress.errors.map((error, index) => (
                        <div
                          key={index}
                          className="text-sm text-destructive mb-1"
                        >
                          Row {error.row}: {error.message}
                        </div>
                      ))}
                    </ScrollArea>
                  </TabsContent>
                  <TabsContent value="warnings">
                    <ScrollArea className="h-32">
                      {progress.warnings.map((warning, index) => (
                        <div
                          key={index}
                          className="text-sm text-yellow-600 mb-1"
                        >
                          Row {warning.row}: {warning.message}
                        </div>
                      ))}
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={resetUpload}
            disabled={isUploading}
          >
            <X className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            onClick={handleUpload}
            disabled={
              !showPreview || isUploading || parsedData.length === 0 || !user
            }
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading
              ? 'Uploading...'
              : !user
                ? 'Login Required'
                : `Upload ${parsedData.length} Items`}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
