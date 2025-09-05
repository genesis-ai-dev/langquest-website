import { DataView } from '@/components/data-view';
import { Suspense } from 'react';

export default function DataViewPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DataView />
    </Suspense>
  );
}
