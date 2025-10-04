'use client';

import { useState, useRef, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/spinner';
import { toast } from 'sonner';
import {
  Upload,
  Download,
  FileArchive,
  AlertCircle,
  X,
  CheckCircle2
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
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/components/auth-provider';

interface BulkUploadProps {
  mode: 'project' | 'quest' | 'questToProject';
  questId?: string; // Required for quest mode
  projectId?: string; // Required for questToProject mode
  onSuccess?: () => void;
}

interface UploadResult {
  success: boolean;
  message?: string;
  stats: {
    projects: { read: number; created: number };
    quests: { read: number; created: number };
    assets: { read: number; created: number };
    errors: Array<{ row: number; message: string }>;
    warnings: Array<{ row: number; message: string }>;
  };
}

interface UploadProgress {
  uploading: boolean;
  result: UploadResult | null;
}

export function BulkUpload({
  mode,
  questId,
  projectId,
  onSuccess
}: BulkUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({
    uploading: false,
    result: null
  });
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
            'asset_image_files',
            'asset_audio_files'
          ]
        : mode === 'questToProject'
          ? [
              'quest_name',
              'quest_description',
              'quest_tags',
              'asset_name',
              'asset_content',
              'asset_tags',
              'asset_image_files',
              'asset_audio_files'
            ]
          : [
              'asset_name',
              'asset_content',
              'asset_tags',
              'asset_image_files',
              'asset_audio_files'
            ];

    const sampleData =
      mode === 'project'
        ? [
            'My Project,Description of my project,English,Spanish,Chapter 1,First section content,category1;tag1,Item A,Content for item A,tag1;tag2,image1.jpg,audio1.mp3',
            'My Project,Description of my project,English,Spanish,Chapter 1,First section content,category1;tag1,Item B,Content for item B,tag2;tag3,,audio2.mp3'
          ]
        : mode === 'questToProject'
          ? [
              'Chapter 1,First section content,category1;tag1,Item A,Content for item A,tag1;tag2,image1.jpg,audio1.mp3',
              'Chapter 1,First section content,category1;tag1,Item B,Content for item B,tag2;tag3,,audio2.mp3',
              'Chapter 2,Second section content,category2;tag1,Item C,Content for item C,tag3;tag4,image2.jpg,audio3.mp3'
            ]
          : [
              'Asset Name 1,Text content for this asset,category;tag,img1.jpg,sound1.mp3',
              'Asset Name 2,Another piece of content,tag;other,,sound2.mp3'
            ];

    const csvContent = [headers.join(','), ...sampleData].join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    // Give each mode a descriptive filename
    const filename =
      mode === 'project'
        ? 'project-upload-template.csv'
        : mode === 'questToProject'
          ? 'quest-upload-template.csv'
          : 'asset-upload-template.csv';

    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [mode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.zip')) {
      toast.error('Please select a ZIP file');
      return;
    }

    setFile(selectedFile);
    // Reset previous results
    setProgress({ uploading: false, result: null });
  };

  const callBulkUploadAPI = async (): Promise<UploadResult> => {
    if (!file || !user) {
      throw new Error('File and user are required');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('environment', environment);

    // Map mode to API type
    const apiType =
      mode === 'questToProject'
        ? 'quest'
        : mode === 'quest'
          ? 'asset'
          : 'project';
    formData.append('type', apiType);

    if (projectId) {
      formData.append('projectId', projectId);
    }
    if (questId) {
      formData.append('questId', questId);
    }

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();
    if (!session?.access_token) {
      throw new Error('No authentication token available');
    }

    const response = await fetch('/api/bulkupload', {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${session.access_token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Upload failed: ${response.statusText}`
      );
    }

    return await response.json();
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a ZIP file first');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to upload content');
      return;
    }

    setIsUploading(true);
    setProgress({ uploading: true, result: null });

    try {
      const result = await callBulkUploadAPI();
      setProgress({ uploading: false, result });

      if (result.success) {
        toast.success(
          `Successfully uploaded ${result.stats.assets.created} assets!`
        );
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast.warning(
          `Upload completed with ${result.stats.errors.length} errors`
        );
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
      setProgress({ uploading: false, result: null });
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setProgress({ uploading: false, result: null });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getInstructions = () => {
    switch (mode) {
      case 'project':
        // return 'Upload a ZIP file containing a CSV with project data and media files (images/audio).';
        return 'Upload a ZIP file containing a CSV with project data and all media files (images/audio).';
      case 'questToProject':
        return 'Upload a ZIP file containing a CSV with quest data and media files to add to the selected project.';
      case 'quest':
        return 'Upload a ZIP file containing a CSV with asset data and media files to add to the selected quest.';
      default:
        return 'Upload a ZIP file with your data.';
    }
  };

  const getUploadTitle = () => {
    switch (mode) {
      case 'project':
        return 'Upload Projects';
      case 'questToProject':
        return 'Upload Quests to Project';
      case 'quest':
        return 'Upload Assets to Quest';
      default:
        return 'Bulk Upload';
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="text-center">
          {/* <h2 className="text-xl font-bold mb-2">{getUploadTitle()}</h2> */}
          <p className="text-left text-sm text-muted-foreground">
            {getInstructions()}
          </p>
        </div>

        <Alert>
          <AlertTitle className="flex flex-row gap-2 justify-between items-center">
            <div className="flex items-center gap-2">
              <FileArchive className="h-4 w-4" /> ZIP File Format
            </div>
            <div className="flex justify-center text-sm">
              <Button
                onClick={downloadTemplate}
                variant="outline"
                className="text-xs"
              >
                <Download className="h-4 w-4" />
                Download CSV Template
              </Button>
            </div>
          </AlertTitle>
          <AlertDescription>
            Your ZIP file should contain:
            <ul className="list-disc list-inside mt-2 space-y-0.5">
              <li>One CSV file with your data (download template below)</li>
              <li>
                Image files (.jpg, .jpeg, .png, .webp) referenced in the CSV
              </li>
              <li>Audio files (.mp3, .wav, .ogg) referenced in the CSV</li>
              <li>All files must be at the root of the ZIP archive</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Card className="text-sm">
          <CardHeader className="px-4">
            <CardTitle className="flex items-center gap-2">
              Select ZIP File
            </CardTitle>
            <CardDescription>
              Choose your ZIP file containing the CSV and media files
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 space-y-4">
            <div className="grid w-full max-w-md items-center gap-1.5">
              {/* <Label htmlFor="file">ZIP File</Label> */}
              <Input
                id="file"
                type="file"
                accept=".zip"
                onChange={handleFileChange}
                ref={fileInputRef}
                disabled={isUploading}
              />
            </div>

            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileArchive className="h-4 w-4" />
                {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </CardContent>
        </Card>

        {progress.uploading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Spinner className="h-4 w-4" />
                Uploading...
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center p-4">
                <div className="text-center">
                  <Spinner className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Processing your ZIP file and uploading content...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {progress.result && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {progress.result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                Upload Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {progress.result.stats.projects.created}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Projects Created
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {progress.result.stats.quests.created}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Quests Created
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-purple-600">
                    {progress.result.stats.assets.created}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Assets Created
                  </div>
                </div>
              </div>

              {(progress.result.stats.errors.length > 0 ||
                progress.result.stats.warnings.length > 0) && (
                <Tabs defaultValue="errors" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger
                      value="errors"
                      className="flex items-center gap-2"
                    >
                      <AlertCircle className="h-4 w-4" />
                      Errors ({progress.result.stats.errors.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="warnings"
                      className="flex items-center gap-2"
                    >
                      <AlertCircle className="h-4 w-4" />
                      Warnings ({progress.result.stats.warnings.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="errors">
                    <ScrollArea className="h-32">
                      {progress.result.stats.errors.map((error, index) => (
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
                      {progress.result.stats.warnings.map((warning, index) => (
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
            disabled={!file || isUploading || !user}
          >
            <Upload className="mr-2 h-4 w-4" />
            {isUploading
              ? 'Uploading...'
              : !user
                ? 'Login Required'
                : `Upload ZIP File`}
          </Button>
        </div>
      </div>
    </ScrollArea>
  );
}
