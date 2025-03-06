'use client';

import { useEffect, useState } from 'react';

export default function WhyLangQuest() {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const timer = setTimeout(() => {
            setVisibleItems([0, 1, 2, 3]);
          }, 300);
          return () => clearTimeout(timer);
        }
      },
      { threshold: 0.1 }
    );

    const section = document.getElementById('why-langquest');
    if (section) observer.observe(section);

    return () => {
      if (section) observer.unobserve(section);
    };
  }, []);

  const benefits = [
    {
      title: 'Offline Capability',
      desc: 'Work seamlessly in remote areas with limited internet access.',
      icon: '🌍'
    },
    {
      title: 'AI Integration',
      desc: 'Leverage AI to accelerate translation efforts.',
      icon: '🤖'
    },
    {
      title: 'Community-Driven',
      desc: 'Contribute to an open database that benefits all languages.',
      icon: '👥'
    },
    {
      title: 'Engaging Experience',
      desc: 'Stay motivated with gamification elements.',
      icon: '🏆'
    }
  ];

  return (
    <section
      id="why-langquest"
      className="py-16 bg-gradient-to-br from-beige-50 to-white relative"
    >
      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-white to-transparent"></div>
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12 relative">
          Why Choose LangQuest?
          <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-green-600 rounded-full"></span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {benefits.map((item, index) => (
            <div
              key={index}
              className={`transition-all duration-700 transform ${
                visibleItems.includes(index)
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="flex items-start space-x-4 p-6 bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-600/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="flex-shrink-0 w-12 h-12 bg-green-600/10 rounded-full flex items-center justify-center text-2xl group-hover:bg-green-600/20 transition-colors duration-300">
                  {item.icon}
                </div>
                <div className="flex-1 relative z-10">
                  <h3 className="text-xl font-semibold group-hover:text-green-700 transition-colors duration-300">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 mt-1">{item.desc}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
