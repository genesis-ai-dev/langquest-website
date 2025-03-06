'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MdCloudOff, MdAndroid, MdEmojiEvents } from 'react-icons/md';
import { useEffect, useState } from 'react';

export default function Features() {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisibleItems([0, 1, 2]);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const features = [
    {
      icon: MdCloudOff,
      title: 'Offline Tolerance',
      desc: 'Work without internet for extended periods, with data stored safely.'
    },
    {
      icon: MdAndroid,
      title: 'AI-Assisted Translation',
      desc: 'Use AI to generate initial translations, speeding up the process.'
    },
    {
      icon: MdEmojiEvents,
      title: 'Gamification',
      desc: 'Engage with leaderboards and rewards to make translation fun.'
    }
  ];

  return (
    <section className="py-16 bg-gradient-to-r from-beige-50 to-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-white to-transparent"></div>
      <div className="container mx-auto px-4 relative z-10">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12 relative">
          Key Features
          <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-cosmic-starlight rounded-full"></span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className={`transition-all duration-700 transform ${visibleItems.includes(index) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <Card className="bg-white hover:shadow-xl transition-all duration-300 border-none group overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-cosmic-starlight/5 to-cosmic-blue/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <CardHeader className="text-center relative z-10">
                  <div className="mx-auto mb-2 w-16 h-16 flex items-center justify-center rounded-full bg-cosmic-starlight/10 group-hover:bg-cosmic-starlight/20 transition-colors duration-300">
                    <feature.icon className="text-4xl text-cosmic-starlight" />
                  </div>
                  <CardTitle className="text-xl font-semibold group-hover:text-cosmic-indigo transition-colors duration-300">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center relative z-10">
                  {feature.desc}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
