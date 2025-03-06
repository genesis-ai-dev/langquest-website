import Header from '@/components/Header';
import Hero from '@/components/Hero';
import Features from '@/components/Features';
import HowItWorks from '@/components/HowItWorks';
import WhyLangQuest from '@/components/WhyLangQuest';
import OpenDataImpact from '@/components/OpenDataImpact';
import FutureRoadmap from '@/components/FutureRoadmap';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen font-sans text-gray-800 bg-gradient-to-br from-beige-50 via-white to-beige-100 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-green-600/10 via-transparent to-transparent pointer-events-none"></div>
      <Header />
      <main className="relative">
        <Hero />
        <Features />
        <HowItWorks />
        <WhyLangQuest />
        <OpenDataImpact />
        <FutureRoadmap />
      </main>
      <Footer />
    </div>
  );
}
