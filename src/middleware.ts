import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Pass the dictionary to the middleware for translations
export default createMiddleware(routing);

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next (internal files)
     * - static files
     * - ingest (PostHog ingestion)
     */
    '/((?!api|static|.*\\..*|_next|ingest).*)'
  ]
};
