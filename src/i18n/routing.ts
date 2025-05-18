import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  // A list of all locales that are supported - getting from existing dictionaries
  locales: ['en', 'es', 'fr', 'zh', 'pt-BR'],

  // Used when no locale matches
  defaultLocale: 'en',

  // Ensure all locales, including the default, have a prefix in the URL
  localePrefix: 'always'
});
