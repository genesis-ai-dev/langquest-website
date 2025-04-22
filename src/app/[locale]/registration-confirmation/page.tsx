'use client';

import { getQueryParams } from '@/lib/supabase-query-params';
import { isMobile } from '@/lib/utils';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { T, Var } from 'gt-next';
import { Spinner } from '@/components/spinner';
import { useGT } from 'gt-next/client';

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
  const t = useGT();
  const [message, setMessage] = useState(t('Processing your registration...'));
  const [error, setError] = useState('');

  const handleRegistrationConfirmation = useCallback(async () => {
    const { params } = getQueryParams(window.location.href);

    const error = params.error;
    const error_code = params.error_code;
    const error_description = params.error_description;

    console.log('error', error);
    console.log('error_code', error_code);
    console.log('error_description', error_description);

    if (error) {
      setMessage(error_description);
      setError('red');
      return;
    }

    if (isMobile()) {
      const access_token = params.access_token;
      const refresh_token = params.refresh_token;
      const type = params.type;

      if (!params.access_token || !params.refresh_token || !params.type) {
        setMessage('Missing required parameters.');
        setError('red');
        return;
      }

      // Mobile deep linking
      const deepLink = `langquest:///#access_token=${access_token}&refresh_token=${refresh_token}&type=${type}`;
      const playStoreUrl =
        'https://play.google.com/store/apps/details?id=com.etengenesis.langquest';

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);

      setTimeout(() => {
        window.location.href = playStoreUrl;
      }, 5000);

      window.location.href = deepLink;
    } else {
      setMessage(
        t(
          'Your registration has been confirmed! You can now log in to the LangQuest app.'
        )
      );
    }
  }, []);

  useEffect(() => {
    handleRegistrationConfirmation();
  }, [handleRegistrationConfirmation]);

  return (
    <T id="app.registration_confirmation.page.2">
      <div className="container mx-auto px-4 py-10 text-center">
        <h1 className="text-3xl font-bold mb-6">LangQuest Registration</h1>
        <div className={`text-xl my-5 ${error ? 'text-red-500' : ''}`}>
          <Var>{message}</Var>
        </div>
        <Var>
          {!error && (
            <T id="app.registration_confirmation.page.1">
              <div className="mt-8">
                <p className="mb-4">
                  Download the LangQuest app to start your language learning
                  journey:
                </p>
                <a
                  href="https://play.google.com/store/apps/details?id=com.etengenesis.langquest"
                  className="inline-block px-6 py-3 bg-accent1-500 text-white rounded-lg hover:bg-accent1-600"
                >
                  Download from Google Play
                </a>
              </div>
            </T>
          )}
        </Var>
      </div>
    </T>
  );
}
