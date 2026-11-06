import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

type Messages = { [key: string]: string | Messages };

function merge(base: Messages, over: Messages): Messages {
  const out: Messages = { ...base };
  for (const [key, value] of Object.entries(over)) {
    const current = out[key];
    out[key] =
      typeof value === 'object' && typeof current === 'object'
        ? merge(current, value)
        : value;
  }
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    // Pages not yet translated into a language show the English words.
    messages: merge(
      (await import('../../messages/en.json')).default,
      (await import(`../../messages/${locale}.json`)).default
    )
  };
});
