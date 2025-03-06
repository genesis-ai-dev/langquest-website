'use client';

import { Button } from '@/components/ui/button';

export default function Footer() {
  return (
    <footer className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-12 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-green-600 via-blue-500 to-green-600"></div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="w-1 h-5 bg-green-600 rounded-full mr-2"></span>
              LangQuest
            </h3>
            <p className="text-gray-300 mb-4">
              Empowering translators and preserving languages through
              technology.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="w-1 h-5 bg-green-600 rounded-full mr-2"></span>
              Contact
            </h3>
            <p className="text-gray-300 mb-2">
              <a
                href="mailto:info@langquest.com"
                className="hover:text-green-300 transition-colors duration-300 flex items-center"
              >
                <span className="mr-2">✉️</span> info@langquest.com
              </a>
            </p>
            <p className="text-gray-300">
              <a
                href="#"
                className="hover:text-green-300 transition-colors duration-300 flex items-center"
              >
                <span className="mr-2">📍</span> San Francisco, CA
              </a>
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center">
              <span className="w-1 h-5 bg-green-600 rounded-full mr-2"></span>
              Stay Updated
            </h3>
            <form className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="p-2 rounded bg-gray-800 border border-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-green-600 flex-grow"
              />
              <Button className="bg-green-600 hover:bg-green-700 transition-colors duration-300">
                Subscribe
              </Button>
            </form>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} LangQuest. All rights reserved.
          </p>
          <div className="flex space-x-4">
            <a
              href="#"
              className="text-gray-400 hover:text-white transition-colors duration-300"
            >
              Privacy
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-white transition-colors duration-300"
            >
              Terms
            </a>
            <a
              href="#"
              className="text-gray-400 hover:text-white transition-colors duration-300"
            >
              FAQ
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
