'use client';

import ClientOnlyHero from '@/components/ClientOnlyHero';
import { SubscribeForm } from '@/components/SubscribeForm';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import WebPageWrapper from '@/components/WebPageWrapper';
import { Link } from '@/i18n/navigation';
import { CheckCircle, Mic, Users, WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Image from 'next/image';

const features = [
  { key: 'record', Icon: Mic },
  { key: 'review', Icon: CheckCircle },
  { key: 'offline', Icon: WifiOff },
  { key: 'team', Icon: Users }
] as const;
const steps = ['organize', 'record', 'review'] as const;
const roles = ['translators', 'reviewers', 'coordinators'] as const;

export default function LandingPage() {
  const t = useTranslations('homepage');

  // Environments array commented out - uncomment when environment selector is re-enabled
  // const environments = [
  //   {
  //     name: 'Production',
  //     description: 'Main database with live data',
  //     href: 'https://langquest.org/login',
  //     color: 'bg-green-500'
  //   },
  //   {
  //     name: 'Preview',
  //     description: 'Staging environment for testing',
  //     href: 'https://preview.langquest.org/login',
  //     color: 'bg-yellow-500'
  //   },
  //   {
  //     name: 'Development',
  //     description: 'Local development environment',
  //     href: '/login?env=development',
  //     color: 'bg-blue-500'
  //   }
  // ];

  return (
    <WebPageWrapper>
      <main className="flex-1">
        {/* Hero Section with Three.js Globe */}
        <ClientOnlyHero>
          <div className="grid gap-12 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_480px] items-center">
            {/* CTA */}
            <div className="flex flex-col justify-center space-y-6">
              <div className="space-y-4">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                  {t('hero.title')}
                </h1>
                <p className="max-w-[600px] text-muted-foreground md:text-xl">
                  {t('hero.subtitle')}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <a
                  href="https://apps.apple.com/us/app/langquest-translation/id6752446665"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Get LangQuest on the App Store"
                  className="inline-flex items-center bg-white rounded-lg p-2 drop-shadow-lg hover:drop-shadow-xl transition-shadow scale-[0.8] origin-left"
                >
                  <Image
                    src="/app-store/marketing/guidelines/images/badge-example-preferred_2x.png"
                    alt="Download on the App Store"
                    width={250}
                    height={83}
                    priority
                    className="h-16 md:h-20 w-auto"
                  />
                </a>
                <a
                  href="https://play.google.com/store/apps/details?id=com.etengenesis.langquest&hl=en_CA"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Get LangQuest on Google Play"
                  className="inline-flex items-center bg-white rounded-lg p-2 drop-shadow-lg hover:drop-shadow-xl transition-shadow scale-[0.8] origin-left"
                >
                  <Image
                    src="/get-it-on-google-play-logo-png-transparent.jpg"
                    alt="Get it on Google Play"
                    width={300}
                    height={90}
                    priority
                    className="h-16 md:h-20 w-auto"
                  />
                </a>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a href="https://next.langquest.org">
                  <Button
                    size="lg"
                    className="h-12 bg-accent4 text-white hover:bg-accent4/90"
                  >
                    {t('hero.openWebApp')}
                  </Button>
                </a>
                <a
                  href="https://discord.gg/RpFdRVdBqz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-4 py-2 text-sm font-medium text-gray-700 backdrop-blur-sm transition-all duration-200 hover:border-gray-300 hover:bg-white hover:shadow-md dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-300 dark:hover:border-gray-600 dark:hover:bg-gray-800"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 15 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="shrink-0"
                  >
                    <path
                      d="M12.708 0.993C11.74 0.538 10.719 0.214 9.669 0.028C9.649 0.024 9.629 0.034 9.62 0.052C9.481 0.31 9.354 0.576 9.241 0.848C8.094 0.672 6.952 0.672 5.828 0.848C5.726 0.597 5.575 0.291 5.443 0.052C5.433 0.034 5.414 0.025 5.394 0.028C4.344 0.213 3.323 0.538 2.355 0.993C2.346 0.997 2.339 1.003 2.335 1.011C0.399 3.973 -0.132 6.862 0.128 9.715C0.13 9.729 0.137 9.742 0.148 9.751C1.425 10.711 2.662 11.294 3.877 11.681C3.896 11.687 3.917 11.68 3.929 11.663C4.217 11.262 4.472 10.837 4.692 10.393C4.698 10.38 4.699 10.366 4.694 10.353C4.689 10.34 4.679 10.33 4.666 10.325C4.264 10.168 3.874 9.978 3.501 9.757C3.487 9.748 3.479 9.734 3.478 9.717C3.477 9.701 3.484 9.685 3.496 9.675C3.575 9.615 3.652 9.553 3.728 9.49C3.741 9.478 3.76 9.476 3.776 9.483C6.22 10.626 8.866 10.626 11.281 9.483C11.297 9.475 11.316 9.478 11.33 9.489C11.405 9.552 11.483 9.615 11.562 9.675C11.575 9.685 11.582 9.701 11.581 9.717C11.58 9.734 11.571 9.748 11.558 9.757C11.185 9.979 10.796 10.169 10.392 10.325C10.38 10.33 10.37 10.34 10.365 10.353C10.36 10.366 10.361 10.38 10.367 10.393C10.59 10.834 10.845 11.259 11.129 11.663C11.141 11.68 11.162 11.687 11.181 11.681C12.402 11.294 13.639 10.711 14.916 9.751C14.927 9.742 14.934 9.729 14.936 9.715C15.247 6.417 14.414 3.552 12.728 1.011C12.724 1.003 12.717 0.997 12.708 0.993ZM5.057 7.978C4.321 7.978 3.715 7.286 3.715 6.436C3.715 5.587 4.309 4.895 5.057 4.895C5.81 4.895 6.411 5.593 6.399 6.436C6.399 7.286 5.804 7.978 5.057 7.978ZM10.019 7.978C9.283 7.978 8.677 7.286 8.677 6.436C8.677 5.587 9.271 4.895 10.019 4.895C10.772 4.895 11.373 5.593 11.361 6.436C11.361 7.286 10.772 7.978 10.019 7.978Z"
                      fill="#5865F2"
                    />
                  </svg>
                  <span>Join our Discord Community</span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </a>
              </div>
            </div>

            {/* Photo */}
            <div className="flex items-center justify-center lg:justify-end">
              <div className="rotate-1 hover:rotate-0 transition-transform duration-500 bg-white p-3 pb-10 shadow-[4px_8px_32px_rgba(0,0,0,0.18)] w-[280px] sm:w-[340px] lg:w-[380px] xl:w-[440px] shrink-0">
                <div className="relative w-full aspect-4/5 overflow-hidden">
                  <Image
                    src="/hero-image.jpeg"
                    alt="Community members using LangQuest"
                    fill
                    priority
                    className="object-cover object-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </ClientOnlyHero>

        {/* What LangQuest Next does */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  {t('features.title')}
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  {t('features.subtitle')}
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 mt-12">
              {features.map(({ key, Icon }) => (
                <Card key={key}>
                  <CardHeader className="pb-2">
                    <Icon className="h-8 w-8 text-accent4 mb-2" />
                    <CardTitle>{t(`features.${key}.title`)}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      {t(`features.${key}.description`)}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted/50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  {t('howItWorks.title')}
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  {t('howItWorks.subtitle')}
                </p>
              </div>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl gap-8 md:grid-cols-3">
              {steps.map((key, i) => (
                <div
                  key={key}
                  className="flex flex-col items-center space-y-2 text-center"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent4 text-xl font-bold text-white">
                    {i + 1}
                  </div>
                  <h3 className="text-xl font-bold">
                    {t(`howItWorks.${key}.title`)}
                  </h3>
                  <p className="text-muted-foreground">
                    {t(`howItWorks.${key}.description`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who it is for */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  {t('roles.title')}
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  {t('roles.subtitle')}
                </p>
              </div>
            </div>
            <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
              {roles.map((key) => (
                <Card key={key}>
                  <CardHeader>
                    <CardTitle>{t(`roles.${key}.title`)}</CardTitle>
                    <CardDescription>
                      {t(`roles.${key}.description`)}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">
                  {t('cta.title')}
                </h2>
                <p className="max-w-[900px] md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  {t('cta.subtitle')}
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <SubscribeForm />
              </div>
            </div>
          </div>
        </section>

        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold mb-4">{t('portal.title')}</h1>
              {/* <p className="text-lg text-muted-foreground">
                Select which environment you want to access
              </p> */}
              <p className="text-lg text-muted-foreground">
                {t('portal.subtitle')}
              </p>
            </div>
            <div className="grid place-content-center">
              <Link href={'/portal'}>
                <Button
                  size="lg"
                  className="gap-1 bg-accent4 text-white hover:bg-accent4/90 h-12"
                >
                  {t('portal.button')}
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
    </WebPageWrapper>
  );
}
