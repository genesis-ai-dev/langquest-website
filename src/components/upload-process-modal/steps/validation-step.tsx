import type { UploadProcessStepProps } from '../types';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { FileArchive, Info } from 'lucide-react';

function ValidationStep({
  uploadType,
  validationProgress,
  validationResult
}: UploadProcessStepProps) {
  const errors =
    validationResult?.issues.filter((issue) => issue.severity === 'error') ??
    [];
  const warnings =
    validationResult?.issues.filter((issue) => issue.severity === 'warning') ??
    [];
  const isValidating = validationProgress?.isValidating ?? false;
  const progressPercent = validationProgress?.percent ?? 0;
  const progressLabel =
    validationProgress?.label ?? 'Validation will start after upload.';

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="shrink-0 space-y-2">
        <h3 className="text-xl font-semibold">Validate upload package</h3>
        <p className="max-w-3xl text-sm text-muted-foreground">
          The {uploadType} ZIP is checked for CSV structure, required fields,
          referenced media files, and unused files in the assets folder.
        </p>
      </div>

      <div className="shrink-0 space-y-2">
        <div className="flex items-center justify-between text-sm font-medium">
          <span>Progress:</span>
          <span className="text-muted-foreground">{progressPercent}%</span>
        </div>
        <Progress value={progressPercent} />
        <p className="text-sm text-muted-foreground">{progressLabel}</p>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden gap-0">
        <CardHeader className="shrink-0 pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <FileArchive className="h-4 w-4" />
              Validation Issues
            </span>
            <div className="flex flex-wrap justify-end gap-2">
              <Badge variant="secondary">
                {validationResult?.rowsCount ?? 0} CSV row(s)
              </Badge>
              <Badge variant="secondary">
                {validationResult?.assetsFilesCount ?? 0} File(s) found
              </Badge>
              <Badge variant={errors.length > 0 ? 'destructive' : 'secondary'}>
                {validationResult?.issues.length ?? 0} Issue(s)
              </Badge>
            </div>
          </CardTitle>
          <CardDescription>
            {getValidationDescription(errors.length)}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 min-h-0 flex-1 overflow-hidden">
          {validationResult && validationResult.issues.length > 0 ? (
            <ScrollArea className="h-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead className="w-20">Line</TableHead>
                    <TableHead className="w-40">Field</TableHead>
                    <TableHead className="w-56">File</TableHead>
                    <TableHead>Problem</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResult.issues.map((issue, index) => (
                    <TableRow key={`${issue.code}-${index}`}>
                      <TableCell>
                        <Badge
                          variant={
                            issue.severity === 'error'
                              ? 'destructive'
                              : 'outline'
                          }
                        >
                          {issue.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>{issue.row ?? '-'}</TableCell>
                      <TableCell>{issue.field ?? '-'}</TableCell>
                      <TableCell className="max-w-56 truncate">
                        {issue.fileName ?? '-'}
                      </TableCell>
                      <TableCell>{issue.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
              <div className="max-w-md space-y-2">
                <Info className="mx-auto h-6 w-6" />
                <p>
                  {isValidating
                    ? 'Validation is running. Issues will appear here if any are found.'
                    : 'No validation issues to display yet.'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getValidationDescription(errorCount: number) {
  if (errorCount > 0) {
    return 'Fix the errors below before continuing. Warnings identify extra files that may be removed or referenced.';
  }

  return 'Errors block the flow. Warnings identify extra files that may be removed or referenced.';
}

export { ValidationStep };
