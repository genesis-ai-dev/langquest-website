import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  CheckCircle2,
  Download,
  FolderOpen,
  Tags
} from 'lucide-react';

import { downloadUploadTemplate } from '../template';
import type { UploadProcessStepProps } from '../types';

const uploadTypeDescriptions = {
  project:
    'Upload a ZIP file containing a CSV with project data and all media files (images/audio).',
  quest:
    'Upload a ZIP file containing a CSV with quest data and media files to add to the selected project.',
  asset:
    'Upload a ZIP file containing a CSV with asset data and media files to add to the selected quest.'
};

const preparationSteps = [
  'Download the appropriate CSV template before preparing your import package.',
  'Package the CSV file and all media files into a single ZIP file.',
  'Place the CSV file in the root directory of the ZIP file.',
  'Place all audio and image files inside an assets folder located in the root directory of the ZIP file.',
  'Ensure that file names in the CSV exactly match the file names included in the ZIP file.',
  'Ensure that every file referenced in the CSV is included in the ZIP file.',
  'Verify your CSV and ZIP structure before uploading to avoid import errors.'
];

const formattingRules = [
  'Avoid using special characters in file names, as they may cause import errors.',
  'When specifying multiple tags, separate them using a semicolon (;).',
  'When specifying multiple audio or image files for the same asset, separate file names using a semicolon (;).',
  'To create a quest level without any assets, including parent quests and sub-level quests, leave all asset-related fields empty in the corresponding row.',
  "If a quest's Parent Name cannot be matched to an existing quest, the quest will be created at the root level of the project."
];

const fileRules = [
  {
    title: 'File limits',
    description: (
      <>
        The ZIP file size must not exceed <strong>50 MB</strong>.
      </>
    )
  },
  {
    title: 'Supported file types',
    description: (
      <>
        Supported audio formats are <strong>mp3</strong>, <strong>m4a</strong>,{' '}
        <strong>wav</strong>, and <strong>ogg</strong>. Supported image formats
        are <strong>jpg</strong>, <strong>jpeg</strong>, <strong>png</strong>,
        and <strong>webp</strong>.
      </>
    )
  }
];

function InstructionsStep({ uploadType }: UploadProcessStepProps) {
  function downloadTemplate() {
    downloadUploadTemplate(uploadType);
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Prepare your upload package</h3>
          <p className="max-w-3xl text-sm text-muted-foreground">
            {uploadTypeDescriptions[uploadType]}
          </p>
        </div>
        <Button type="button" variant="outline" onClick={downloadTemplate}>
          <Download className="h-4 w-4" />
          Download CSV Template
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 overflow-hidden">
        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="shrink-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderOpen className="h-4 w-4" />
              Package Checklist
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Your ZIP file must include one CSV file at the root and an{' '}
              <strong>assets</strong> folder for all referenced media files.
            </p>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <ol className="space-y-3 text-sm">
                {preparationSteps.map((step, index) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="flex min-h-0 flex-col overflow-hidden">
          <CardHeader className="shrink-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Tags className="h-4 w-4" />
              CSV Rules
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Follow these rules to avoid validation errors during import.
            </p>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-5 text-sm">
                <div>
                  <ul className="space-y-3">
                    {fileRules.map((rule) => (
                      <li key={rule.title} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">
                            {rule.title}:
                          </strong>{' '}
                          {rule.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="mb-3 font-medium">Formatting</p>
                  <ul className="space-y-3">
                    {formattingRules.map((rule) => (
                      <li key={rule} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export { InstructionsStep };
