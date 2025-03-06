'use client';

import { useEffect, useState } from 'react';

export default function OpenDataImpact() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const section = document.getElementById('open-data-impact');
    if (section) observer.observe(section);

    return () => {
      if (section) observer.unobserve(section);
    };
  }, []);

  return (
    <section
      id="open-data-impact"
      className="py-16 bg-white text-center relative"
    >
      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-beige-50 to-transparent"></div>
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6 relative inline-block">
          Contribute to Global Language AI
          <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-cosmic-starlight rounded-full"></span>
        </h2>
        <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
          Your translations help train AI models for low-resource languages,
          making technology accessible to all.
        </p>
        <div
          className={`w-full max-w-4xl mx-auto rounded-lg p-6 relative overflow-hidden transition-all duration-1000 transform ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cosmic-starlight/20 to-cosmic-blue/20 rounded-lg"></div>
          <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg"></div>
          <div className="relative z-10">
            <div className="h-48 flex items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 bg-cosmic-starlight rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-20 animate-ping"></div>
                <div className="w-24 h-24 bg-cosmic-blue rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10 animate-pulse"></div>
                <div className="relative z-10 text-3xl">🌐</div>
                <div className="mt-4 text-gray-800 font-semibold">
                  Global Language AI
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-white/80 p-4 rounded-lg shadow-sm">
                <div className="text-xl mb-1">100+</div>
                <div className="text-sm text-gray-600">Languages Supported</div>
              </div>
              <div className="bg-white/80 p-4 rounded-lg shadow-sm">
                <div className="text-xl mb-1">10M+</div>
                <div className="text-sm text-gray-600">
                  Translations Contributed
                </div>
              </div>
              <div className="bg-white/80 p-4 rounded-lg shadow-sm">
                <div className="text-xl mb-1">5K+</div>
                <div className="text-sm text-gray-600">Active Contributors</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
