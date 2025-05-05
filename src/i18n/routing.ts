import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported - getting from existing dictionaries
  locales: ['en', 'es', 'fr', 'zh'],

  // Used when no locale matches
  defaultLocale: 'en'
});
