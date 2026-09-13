import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle2, Download, FolderOpen, Tags } from 'lucide-react';

import { downloadUploadTemplate } from '../lib/template';
import type { UploadProcessStepProps } from '../lib/types';

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

const generalInformation = [
  'Use the appropriate template for each import type: Project, Quest, or Asset.',
  'For FIA template project imports, the FIA Content Language must be selected during the Project Setup step.',
  'Project imports support only one project per file. Each import will always create a new project.',
  'For Quest imports, quests in Unstructured projects are matched based on the combination of Quest Name and Parent Quest Name. In Bible and FIA template projects, quests are matched using the Book Name and Chapter/Pericope. The system will create a new quest version for each import. Any unmatched quests will be separated for manual assignment during the import process.',
  'For Asset imports, assets will be added to the selected quest. To import assets into a new quest version, the quest must be created first.',
  'The project_name, quest_name, and asset_name fields are required.',
  'At least one asset content field must be provided: source_content, source_image, or source_audio.',
  'The label field is used in Bible and FIA template projects to identify Bible verses. For Bible projects, use only a verse number or verse range (e.g., 1 or 1-3). For FIA projects, use a chapter and verse reference or range (e.g., 1:1 or 1:1-2:3). Overlapping verse ranges are not allowed. This field is optional.'
];

const fileLimits = [
  'The ZIP file size must not exceed 50 MB.',
  'Supported audio formats are mp3, m4a, wav, and ogg. Supported image formats are jpg, jpeg, png, and webp.'
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
              Guidelines
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Follow these rules to avoid validation and import errors.
            </p>
          </CardHeader>
          <CardContent className="min-h-0 flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-5 text-sm">
                <div>
                  <p className="mb-3 font-medium">File Limits</p>
                  <ul className="space-y-3">
                    {fileLimits.map((rule) => (
                      <li key={rule} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{rule}</span>
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
                <div>
                  <p className="mb-3 font-medium">General Information</p>
                  <ul className="space-y-3">
                    {generalInformation.map((info) => (
                      <li key={info} className="flex gap-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span className="text-muted-foreground">{info}</span>
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
