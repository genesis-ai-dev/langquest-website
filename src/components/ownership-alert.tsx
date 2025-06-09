import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface OwnershipAlertProps {
  user: any;
  contentType: 'project' | 'quest' | 'asset';
  isEditing?: boolean;
}

export function OwnershipAlert({
  user,
  contentType,
  isEditing = false
}: OwnershipAlertProps) {
  if (user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>
          {contentType.charAt(0).toUpperCase() + contentType.slice(1)}{' '}
          {isEditing ? 'Edit' : 'Creation'}
        </AlertTitle>
        <AlertDescription>
          {isEditing ? 'Editing' : 'Creating'} {contentType} as:{' '}
          <span className="font-medium">{user.email}</span>
          {contentType !== 'project' && (
            <>
              <br />
              Only project owners can create or edit {contentType}s (or anyone
              for unowned projects).
            </>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Authentication Required</AlertTitle>
      <AlertDescription>
        You must be logged in to {isEditing ? 'edit' : 'create'} {contentType}s
      </AlertDescription>
    </Alert>
  );
}
