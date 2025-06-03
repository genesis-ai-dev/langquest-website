'use client';

import dynamic from 'next/dynamic';
import { Spinner } from './spinner';

const PeerToPeerVisualization = dynamic(
  () => import('./PeerToPeerVisualization'),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 flex items-center justify-center bg-gradient-to-b from-slate-900 to-slate-800 rounded-lg">
        <Spinner />
      </div>
    )
  }
);

export default function ClientOnlyP2P() {
  return <PeerToPeerVisualization />;
}
