'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useSearchParams } from 'next/navigation';
import { env } from '@/lib/env';
import { isMobile } from '@/lib/utils';

export default function RegistrationConfirmationPage() {
  return (
    <Suspense fallback={<div className="text-center my-5">Loading...</div>}>
      <RegistrationConfirmation />
    </Suspense>
  );
}

function RegistrationConfirmation() {
  const [message, setMessage] = useState('Processing your registration...');
  const [error, setError] = useState('');
  const searchParams = useSearchParams();

  // Initialize Supabase client
  const supabaseClient = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const handleRegistrationConfirmation = useCallback(async () => {
    // Get tokens from URL and hash
    const access_token =
      searchParams.get('access_token') ||
      window.location.hash.match(/access_token=([^&]*)/)?.[1];
    const refresh_token =
      searchParams.get('refresh_token') ||
      window.location.hash.match(/refresh_token=([^&]*)/)?.[1];
    const type =
      searchParams.get('type') ||
      window.location.hash.match(/type=([^&]*)/)?.[1];

    if (isMobile()) {
      // Mobile deep linking
      const deepLink = `langquest://registration-confirmation#access_token=${access_token}&refresh_token=${refresh_token}&type=${type}`;
      const playStoreUrl =
        'https://play.google.com/store/apps/details?id=com.etengenesis.langquest';

      const now = Date.now();
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = deepLink;
      document.body.appendChild(iframe);

      setTimeout(() => {
        if (Date.now() - now < 3000) {
          window.location.href = playStoreUrl;
        }
      }, 2000);

      window.location.href = deepLink;
    } else {
      try {
        // Verify the token is valid
        const { error: sessionError } = await supabaseClient.auth.setSession({
          access_token: access_token!,
          refresh_token: refresh_token!
        });

        if (sessionError) throw sessionError;

        setMessage(
          'Your registration has been confirmed! You can now log in to the LangQuest app.'
        );
      } catch (error) {
        console.error('Error confirming registration:', error);
        setMessage('Error: Invalid or expired registration link.');
        setError('red');
      }
    }
  }, [searchParams, supabaseClient]);

  useEffect(() => {
    handleRegistrationConfirmation();
  }, [handleRegistrationConfirmation, searchParams]);

  return (
    <div className="container mx-auto px-4 py-10 text-center">
      <h1 className="text-3xl font-bold mb-6">LangQuest Registration</h1>
      <div className={`text-xl my-5 ${error ? 'text-red-500' : ''}`}>
        {message}
      </div>
      {!error && (
        <div className="mt-8">
          <p className="mb-4">
            Download the LangQuest app to start your language learning journey:
          </p>
          <a
            href="https://play.google.com/store/apps/details?id=com.etengenesis.langquest"
            className="inline-block px-6 py-3 bg-accent1-500 text-white rounded-lg hover:bg-accent1-600"
          >
            Download from Google Play
          </a>
        </div>
      )}
    </div>
  );
}
