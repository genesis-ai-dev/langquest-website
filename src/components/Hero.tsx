'use client';

import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';

export default function Hero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section
      className="relative bg-cover bg-center h-[60vh] md:h-[80vh]"
      style={{ backgroundImage: "url('/hero-remote-community.jpg')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60 flex items-center justify-center">
        <div className="absolute inset-0 bg-blue-500/10 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-green-600/20 mix-blend-color"></div>

        <div
          className={`text-center text-white px-4 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
        >
          <div className="relative">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
              Translate, Preserve, and Connect with LangQuest
            </h1>
            <div className="absolute -inset-1 bg-green-600/20 blur-xl rounded-full -z-10 opacity-70"></div>
          </div>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto">
            The offline-tolerant, AI-assisted translation app for low-resource
            languages.
          </p>
          <Button
            size="lg"
            className="bg-white text-green-700 hover:bg-gray-200 hover:scale-105 transition-transform duration-300 shadow-lg hover:shadow-xl"
          >
            Sign up for updates
          </Button>
        </div>
      </div>
    </section>
  );
}
