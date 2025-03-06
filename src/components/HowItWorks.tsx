'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { useEffect, useState } from 'react';

export default function HowItWorks() {
  const [activeStep, setActiveStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const steps = [
    {
      step: 1,
      title: 'Create a Project',
      desc: 'Set up your translation project and invite members.'
    },
    {
      step: 2,
      title: 'Contribute Translations',
      desc: "Add translations and vote on others' work."
    },
    {
      step: 3,
      title: 'Sync and Share',
      desc: 'Sync your work when online and share with the community.'
    }
  ];

  return (
    <section className="py-16 bg-white relative">
      <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-beige-50 to-transparent"></div>
      <div className="container mx-auto px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 mb-12 relative">
          How It Works
          <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-cosmic-starlight rounded-full"></span>
        </h2>
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 mb-16">
          {steps.map((step, index) => (
            <div
              key={index}
              className={`text-center max-w-xs transition-all duration-500 ${
                isVisible
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 translate-y-10'
              }`}
              style={{ transitionDelay: `${index * 200}ms` }}
            >
              <div
                className={`relative mb-4 w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
                  activeStep === index
                    ? 'bg-cosmic-starlight text-white shadow-lg shadow-cosmic-starlight/30'
                    : 'bg-gray-100 text-gray-800'
                } transition-all duration-300`}
              >
                <span className="text-2xl font-bold">{step.step}</span>
                {activeStep === index && (
                  <div className="absolute -inset-2 bg-cosmic-starlight/20 rounded-full animate-pulse"></div>
                )}
              </div>
              <h3
                className={`text-xl font-semibold mb-2 ${activeStep === index ? 'text-cosmic-indigo' : 'text-gray-800'} transition-colors duration-300`}
              >
                {step.title}
              </h3>
              <p className="text-gray-600">{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-12 transition-all duration-500 transform hover:shadow-xl">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="w-2 h-8 bg-cosmic-starlight rounded-full mr-3"></span>
            Project Role Permissions
          </h3>
          <div className="overflow-x-auto">
            <Table className="mb-0 w-full">
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">Action</TableHead>
                  <TableHead className="font-semibold">Owner</TableHead>
                  <TableHead className="font-semibold">Member</TableHead>
                  <TableHead className="font-semibold">Non-Member</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    View Project Content
                  </TableCell>
                  <TableCell className="text-cosmic-starlight">✓</TableCell>
                  <TableCell className="text-cosmic-starlight">✓</TableCell>
                  <TableCell className="text-cosmic-starlight">✓</TableCell>
                </TableRow>
                <TableRow className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    Create/Edit Content
                  </TableCell>
                  <TableCell className="text-cosmic-starlight">✓</TableCell>
                  <TableCell className="text-red-500">✘</TableCell>
                  <TableCell className="text-red-500">✘</TableCell>
                </TableRow>
                <TableRow className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    Add Translations
                  </TableCell>
                  <TableCell className="text-cosmic-starlight">✓</TableCell>
                  <TableCell className="text-cosmic-starlight">✓</TableCell>
                  <TableCell className="text-red-500">✘</TableCell>
                </TableRow>
                <TableRow className="hover:bg-gray-50">
                  <TableCell className="font-medium">
                    Vote on Translations
                  </TableCell>
                  <TableCell className="text-cosmic-starlight">✓</TableCell>
                  <TableCell className="text-cosmic-starlight">✓</TableCell>
                  <TableCell className="text-red-500">✘</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 transition-all duration-500 transform hover:shadow-xl">
          <h3 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center">
            <span className="w-2 h-8 bg-cosmic-starlight rounded-full mr-3"></span>
            Project Status Flags
          </h3>
          <div className="overflow-x-auto">
            <Table className="mb-0 w-full">
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">Status Flag</TableHead>
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Implications</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-gray-50">
                  <TableCell className="font-medium">Active</TableCell>
                  <TableCell>Members can contribute</TableCell>
                  <TableCell>Required for member contributions</TableCell>
                </TableRow>
                <TableRow className="hover:bg-gray-50">
                  <TableCell className="font-medium">Inactive</TableCell>
                  <TableCell>Members cannot contribute</TableCell>
                  <TableCell>Historical contributions preserved</TableCell>
                </TableRow>
                <TableRow className="hover:bg-gray-50">
                  <TableCell className="font-medium">Public</TableCell>
                  <TableCell>Open membership</TableCell>
                  <TableCell>Anyone can join</TableCell>
                </TableRow>
                <TableRow className="hover:bg-gray-50">
                  <TableCell className="font-medium">Private</TableCell>
                  <TableCell>Restricted membership</TableCell>
                  <TableCell>Requires invitation from owner</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </section>
  );
}
