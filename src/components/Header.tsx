'use client';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      if (isScrolled !== scrolled) {
        setScrolled(isScrolled);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrolled]);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-cosmic-indigo/95 backdrop-blur-sm shadow-lg'
          : 'bg-cosmic-indigo'
      }`}
    >
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cosmic-starlight/0 via-cosmic-starlight/50 to-cosmic-starlight/0"></div>
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span className="text-2xl font-bold text-white flex items-center">
            <span className="w-2 h-8 bg-white rounded-full mr-2 opacity-70"></span>
            LangQuest
          </span>
        </div>
        <div className="md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-white hover:bg-cosmic-starlight/50"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </Button>
        </div>
        <div className="hidden md:flex items-center space-x-6">
          <Select>
            <SelectTrigger className="w-[180px] bg-white/10 text-white border-white/20 hover:bg-white/20 transition-colors duration-300 focus:ring-white/30">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {isMenuOpen && (
        <div className="md:hidden bg-cosmic-starlight p-4 animate-in slide-in-from-top-5 duration-300">
          <Select>
            <SelectTrigger className="w-full bg-white/10 text-white border-white/20 mb-4">
              <SelectValue placeholder="Select Language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </header>
  );
}
