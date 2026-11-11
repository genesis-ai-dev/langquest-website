import NextHome from '@/components/next-home/NextHome';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

// The home page of langquest.org: LangQuest Next. legacy.langquest.org
// shows the original app's home page instead (legacy-home/page.tsx,
// chosen in src/middleware.ts).

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'nextHome.meta' });
  return { title: t('title'), description: t('description') };
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <NextHome />;
}
