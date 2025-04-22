import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ClientProviders } from '../../components/client-providers';
import { Toaster } from '@/components/ui/sonner';
import { getLocaleDirection } from 'generaltranslation';
import { getLocale, GTProvider } from 'gt-next/server';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin']
});

export const metadata: Metadata = {
  title: 'LangQuest - Translate and Preserve Low-Resource Languages',
  description:
    'An app for translating and preserving low-resource languages, especially useful in remote areas with limited internet.'
};

export default async function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale(); // e.g. "ar" for Arabic
  const dir = getLocaleDirection(locale); // e.g. "rtl" for "right-to-left"

  return (
    <html className="h-full w-full" lang={locale} dir={dir}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased dark`}
      >
        <GTProvider>
          <ClientProviders>{children}</ClientProviders>
          <Toaster position="top-center" />
        </GTProvider>
      </body>
    </html>
  );
}
