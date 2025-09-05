import { DatabaseViewer } from '@/components/database-viewer';
import { Suspense } from 'react';

export default function Database() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DatabaseViewer />
    </Suspense>
  );
}
