'use client';

import { isMobile } from '@/lib/utils';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Spinner } from '@/components/spinner';
import { env } from '@/lib/env';
import { useTranslations } from 'next-intl';

export default function NotificationsPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen flex items-center justify-center">
          <Spinner className="size-4" />
        </div>
      }
    >
      <NotificationsHandler />
    </Suspense>
  );
}

function NotificationsHandler() {
  const t = useTranslations('notifications');
  const [message, setMessage] = useState(t('opening_app'));
  const [isError, setIsError] = useState(false);

  const handleDeepLink = useCallback(async () => {
    console.log('[NOTIFICATIONS] Starting deep link handling');
    console.log('[NOTIFICATIONS] Current URL:', window.location.href);

    if (isMobile()) {
      console.log('[NOTIFICATIONS] Mobile device detected');

      // Build deep link to app notifications page
      const deepLink = `${env.NEXT_PUBLIC_APP_SCHEME}://notifications`;

      const playStoreUrl =
        'https://play.google.com/store/apps/details?id=com.etengenesis.langquest';
      const appStoreUrl =
        'https://apps.apple.com/app/langquest-translation/id6752446665';

      console.log('[NOTIFICATIONS] Creating deep link:', deepLink);

      // Try to open the app using iframe trick for better compatibility
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);

      // Also try direct navigation
      window.location.href = deepLink;

      // Fallback to store after timeout if app didn't open
      const timeout = setTimeout(() => {
        console.log('[NOTIFICATIONS] App not opened, redirecting to store');
        // Detect iOS vs Android for appropriate store
        const isIOS =
          /iPad|iPhone|iPod/.test(navigator.userAgent) &&
          !(window as unknown as { MSStream: boolean }).MSStream;
        window.location.href = isIOS ? appStoreUrl : playStoreUrl;
      }, 2500);

      return () => clearTimeout(timeout);
    } else {
      console.log('[NOTIFICATIONS] Desktop device detected');
      setMessage(t('desktop_message'));
    }
  }, [t]);

  useEffect(() => {
    handleDeepLink();
  }, [handleDeepLink]);

  return (
    <div className="container mx-auto px-4 py-10 text-center">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <div className={`text-xl my-5 ${isError ? 'text-red-500' : ''}`}>
        {message}
      </div>

      {/* Desktop: Show download buttons */}
      <div className="mt-8 space-y-4">
        <p className="mb-4">{t('download_prompt')}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a
            href="https://play.google.com/store/apps/details?id=com.etengenesis.langquest"
            className="inline-block px-6 py-3 bg-accent1-500 text-white rounded-lg hover:bg-accent1-600"
          >
            {t('download_android')}
          </a>
          <a
            href="https://apps.apple.com/app/langquest-translation/id6752446665"
            className="inline-block px-6 py-3 bg-accent1-500 text-white rounded-lg hover:bg-accent1-600"
          >
            {t('download_ios')}
          </a>
        </div>
      </div>
    </div>
  );
}
