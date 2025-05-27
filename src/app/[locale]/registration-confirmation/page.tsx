'use client';

import { getQueryParams } from '@/lib/supabase-query-params';
import { isMobile } from '@/lib/utils';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { Spinner } from '@/components/spinner';
import { useTranslations } from 'next-intl';

export default function RegistrationConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen flex items-center justify-center">
          <Spinner className="size-4" />
        </div>
      }
    >
      <RegistrationConfirmation />
    </Suspense>
  );
}

function RegistrationConfirmation() {
  const t = useTranslations('registration_confirmation');
  const [message, setMessage] = useState(t('processing'));
  const [error, setError] = useState('');

  const handleRegistrationConfirmation = useCallback(async () => {
    console.log('[REGISTRATION CONFIRMATION] Starting confirmation process');
    console.log(
      '[REGISTRATION CONFIRMATION] Current URL:',
      window.location.href
    );

    const { params } = getQueryParams(window.location.href);
    console.log('[REGISTRATION CONFIRMATION] Query params:', params);

    const error = params.error;
    const error_code = params.error_code;
    const error_description = params.error_description;

    console.log('[REGISTRATION CONFIRMATION] error:', error);
    console.log('[REGISTRATION CONFIRMATION] error_code:', error_code);
    console.log(
      '[REGISTRATION CONFIRMATION] error_description:',
      error_description
    );

    if (error) {
      console.log(
        '[REGISTRATION CONFIRMATION] Error found, setting error message'
      );
      setMessage(error_description);
      setError('red');
      return;
    }

    if (isMobile()) {
      console.log('[REGISTRATION CONFIRMATION] Mobile device detected');
      const access_token = params.access_token;
      const refresh_token = params.refresh_token;

      console.log(
        '[REGISTRATION CONFIRMATION] access_token exists:',
        !!access_token
      );
      console.log(
        '[REGISTRATION CONFIRMATION] refresh_token exists:',
        !!refresh_token
      );

      if (!params.access_token || !params.refresh_token) {
        console.log('[REGISTRATION CONFIRMATION] Missing tokens');
        setMessage(t('missing_params'));
        setError('red');
        return;
      }

      // Mobile deep linking
      const deepLink = `langquest:///#access_token=${access_token}&refresh_token=${refresh_token}}`;
      const playStoreUrl =
        'https://play.google.com/store/apps/details?id=com.etengenesis.langquest';

      console.log('[REGISTRATION CONFIRMATION] Creating deep link:', deepLink);

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);

      setTimeout(() => {
        console.log('[REGISTRATION CONFIRMATION] Redirecting to Play Store');
        window.location.href = playStoreUrl;
      }, 5000);

      window.location.href = deepLink;
    } else {
      console.log(
        '[REGISTRATION CONFIRMATION] Desktop device, showing success message'
      );
      setMessage(t('success_message'));
    }
  }, [t]);

  useEffect(() => {
    handleRegistrationConfirmation();
  }, [handleRegistrationConfirmation]);

  return (
    <div className="container mx-auto px-4 py-10 text-center">
      <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
      <div className={`text-xl my-5 ${error ? 'text-red-500' : ''}`}>
        {message}
      </div>
      {!error && (
        <div className="mt-8">
          <p className="mb-4">{t('download_section.message')}</p>
          <a
            href="https://play.google.com/store/apps/details?id=com.etengenesis.langquest"
            className="inline-block px-6 py-3 bg-accent1-500 text-white rounded-lg hover:bg-accent1-600"
          >
            {t('download_section.button')}
          </a>
        </div>
      )}
    </div>
  );
}
