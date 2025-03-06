'use client';

import { useEffect, useState } from 'react';

export default function FutureRoadmap() {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setTimeout(() => setVisibleItems([0]), 300);
          setTimeout(() => setVisibleItems([0, 1]), 600);
          setTimeout(() => setVisibleItems([0, 1, 2]), 900);
        }
      },
      { threshold: 0.1 }
    );

    const section = document.getElementById('future-roadmap');
    if (section) observer.observe(section);

    return () => {
      if (section) observer.unobserve(section);
    };
  }, []);

  const roadmapItems = [
    {
      title: 'Peer-to-Peer Connectivity',
      desc: 'Enable direct device-to-device sharing without internet.',
      icon: '📱',
      color: 'from-green-600/20 to-green-600/5'
    },
    {
      title: 'Enhanced AI Models',
      desc: 'Improve translation accuracy with more data.',
      icon: '🧠',
      color: 'from-blue-500/20 to-blue-500/5'
    },
    {
      title: 'Expanded Language Support',
      desc: 'Add more low-resource languages.',
      icon: '🗣️',
      color: 'from-purple-500/20 to-purple-500/5'
    }
  ];

  return (
    <section
      id="future-roadmap"
      className="py-16 bg-gradient-to-br from-beige-50 to-white relative"
    >
      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-white to-transparent"></div>
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12 relative">
          Future Roadmap
          <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-green-600 rounded-full"></span>
        </h2>
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-green-600 via-blue-500 to-purple-500 rounded-full"></div>

            {roadmapItems.map((item, index) => (
              <div
                key={index}
                className={`flex mb-8 transition-all duration-700 transform ${
                  visibleItems.includes(index)
                    ? 'opacity-100 translate-x-0'
                    : 'opacity-0 -translate-x-10'
                }`}
              >
                <div className="flex-shrink-0 w-16 h-16 bg-white rounded-full shadow-md flex items-center justify-center z-10 text-2xl">
                  {item.icon}
                </div>
                <div className="ml-6 flex-1">
                  <div
                    className={`p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 relative overflow-hidden group`}
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                    ></div>
                    <div className="relative z-10">
                      <h3 className="text-xl font-semibold mb-2 group-hover:text-green-700 transition-colors duration-300">
                        {item.title}
                      </h3>
                      <p className="text-gray-600">{item.desc}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
