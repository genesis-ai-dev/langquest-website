'use client';

import dynamic from 'next/dynamic';
import { Spinner } from './spinner';

const Hero = dynamic(() => import('./Hero'), {
  ssr: false,
  loading: () => (
    <section className="relative h-[60vh] md:h-[80vh] overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800">
      <div className="absolute inset-0 flex items-center justify-center">
        <Spinner />
      </div>
    </section>
  )
});

interface ClientOnlyHeroProps {
  children?: React.ReactNode;
}

export default function ClientOnlyHero({ children }: ClientOnlyHeroProps) {
  return <Hero>{children}</Hero>;
}
