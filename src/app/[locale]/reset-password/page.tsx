'use client';

import { Spinner } from '@/components/spinner';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { getQueryParams } from '@/lib/supabase-query-params';
import { isMobile } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthError } from '@supabase/supabase-js';
import { useMutation } from '@tanstack/react-query';
import { Suspense, useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/auth-provider';
import { createBrowserClient } from '@/lib/supabase/client';
import { getSupabaseEnvironment, SupabaseEnvironment } from '@/lib/supabase';
import { useSearchParams } from 'next/navigation';

function ErrorMessage({
  error
}: {
  error: AuthError | { code: string; message: string };
}) {
  const t = useTranslations('reset_password');

  if (error.code === 'same_password') {
    return <p>{t('error_message.same_password')}</p>;
  } else if (error.code === 'otp_expired') {
    return <p>{t('error_message.otp_expired')}</p>;
  } else {
    return <p>{error.message}</p>;
  }
}

function ResetPasswordForm() {
  const [showForm, setShowForm] = useState(false);
  const { isLoading: authLoading, environment } = useAuth();
  const searchParams = useSearchParams();
  const t = useTranslations('reset_password');

  // Determine environment from URL params (same logic as AuthProvider)
  // Extract values to make dependencies stable
  const envParam = searchParams.get('env') as SupabaseEnvironment;
  const projectRef = searchParams.get('project_ref');

  // Memoize the environment detection to ensure stability
  const detectedEnvironment = useMemo(() => {
    const envFromProjectRef = projectRef
      ? getSupabaseEnvironment(projectRef)
      : null;
    const env: SupabaseEnvironment =
      envParam || envFromProjectRef || 'production';

    console.log('[RESET PASSWORD] Detected environment:', env, {
      envParam,
      projectRef,
      envFromProjectRef
    });

    return env;
  }, [envParam, projectRef]);

  // Create the supabase client directly based on URL params to avoid context issues
  // Memoize to prevent recreating on every render
  const supabase = useMemo(() => {
    console.log(
      '[RESET PASSWORD] Creating supabase client for environment:',
      detectedEnvironment
    );
    const client = createBrowserClient(detectedEnvironment);
    // Verify the client was created with the correct URL
    const clientUrl = (client as any).supabaseUrl || 'unknown';
    console.log('[RESET PASSWORD] Created client with URL:', clientUrl);
    if (
      detectedEnvironment === 'preview' &&
      !clientUrl.includes('yjgdgsycxmlvaiuynlbv')
    ) {
      console.error(
        '[RESET PASSWORD] CRITICAL: Wrong client created! Expected preview but got:',
        clientUrl
      );
    }
    return client;
  }, [detectedEnvironment]);

  const toastError = (error: AuthError | { code: string; message: string }) => {
    toast.error(() => <ErrorMessage error={error} />);
  };

  const resetPasswordSchema = z
    .object({
      password: z.string().min(1, { message: t('validation.required') }),
      confirmPassword: z.string().min(1, { message: t('validation.required') })
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.passwords_match'),
      path: ['confirmPassword']
    });

  type FormValues = z.infer<typeof resetPasswordSchema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
    // Wait for auth provider to finish initializing before processing tokens
    if (authLoading) {
      return;
    }

    const processTokens = async () => {
      const { params } = getQueryParams(window.location.href);

      console.log('[RESET PASSWORD] Full URL:', window.location.href);
      console.log('[RESET PASSWORD] URL hash:', window.location.hash);
      console.log('[RESET PASSWORD] Extracted params:', Object.keys(params));
      console.log(
        '[RESET PASSWORD] access_token in params:',
        !!params.access_token
      );
      console.log(
        '[RESET PASSWORD] refresh_token in params:',
        !!params.refresh_token
      );

      const error_code = params.error_code;
      const error_description = params.error_description;

      if (error_code) {
        toastError({ code: error_code, message: error_description });
        return;
      }

      const access_token = params.access_token;
      const refresh_token = params.refresh_token;

      if (isMobile()) {
        toast.success(t('redirecting'));
        const deepLink = `langquest://reset-password#access_token=${access_token}&refresh_token=${refresh_token}`;
        const playStoreUrl =
          'https://play.google.com/store/apps/details?id=com.etengenesis.langquest';

        window.location.href = deepLink;

        const timeout = setTimeout(() => {
          window.location.href = playStoreUrl;
        }, 5000);

        return () => clearTimeout(timeout);
      } else {
        console.log('[RESET PASSWORD] Setting session');
        console.log(
          '[RESET PASSWORD] Detected environment:',
          detectedEnvironment
        );
        console.log('[RESET PASSWORD] Context environment:', environment);
        console.log('[RESET PASSWORD] Has access_token:', !!access_token);
        console.log('[RESET PASSWORD] Has refresh_token:', !!refresh_token);

        // Log the actual Supabase client URL to verify it's correct
        // Access the internal URL property (Supabase client stores it internally)
        const clientUrl = (supabase as any).supabaseUrl || 'unknown';
        console.log('[RESET PASSWORD] Supabase client URL:', clientUrl);
        console.log(
          '[RESET PASSWORD] Expected preview URL: https://yjgdgsycxmlvaiuynlbv.supabase.co'
        );

        if (
          clientUrl !== 'https://yjgdgsycxmlvaiuynlbv.supabase.co' &&
          detectedEnvironment === 'preview'
        ) {
          console.error(
            '[RESET PASSWORD] ERROR: Client URL mismatch! Using:',
            clientUrl
          );
        }

        // Verify we're using the correct environment
        if (projectRef && detectedEnvironment !== 'preview') {
          console.warn(
            '[RESET PASSWORD] Environment mismatch! Expected preview but got:',
            detectedEnvironment
          );
        }

        // Check if Supabase already processed the tokens from the URL (via detectSessionInUrl)
        const {
          data: { session: existingSession }
        } = await supabase.auth.getSession();

        if (existingSession) {
          console.log(
            '[RESET PASSWORD] Session already exists (from URL detection)'
          );
          setShowForm(true);
          return;
        }

        // If tokens are missing, Supabase might have already consumed them
        if (!access_token || !refresh_token) {
          console.warn(
            '[RESET PASSWORD] Tokens missing from URL - may have been consumed by Supabase'
          );
          // Check again after a brief delay
          setTimeout(async () => {
            const {
              data: { session: delayedSession }
            } = await supabase.auth.getSession();
            if (delayedSession) {
              console.log('[RESET PASSWORD] Session found after delay');
              setShowForm(true);
            } else {
              console.error(
                '[RESET PASSWORD] No session found and tokens are missing'
              );
              toastError({
                code: 'token_missing',
                message:
                  'Password reset tokens are missing or expired. Please request a new password reset link.'
              });
            }
          }, 100);
          return;
        }

        supabase.auth
          .setSession({
            access_token: access_token!,
            refresh_token: refresh_token!
          })
          .then(({ error: sessionError }: { error: AuthError | null }) => {
            if (sessionError) {
              console.error('[RESET PASSWORD] Session error:', sessionError);
              toastError(sessionError);
              throw sessionError;
            }
            console.log('[RESET PASSWORD] Session set successfully');
            setShowForm(true);
          })
          .catch((error) => {
            console.error('[RESET PASSWORD] Error setting session:', error);
          });
      }
    };

    processTokens();
  }, [supabase, authLoading, detectedEnvironment, environment, projectRef, t]);

  const {
    mutate: updatePassword,
    isPending,
    isSuccess
  } = useMutation({
    mutationFn: async ({ password }: FormValues) => {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('success_message'), {
        duration: Infinity
      });
    },
    onError: toastError
  });

  if (authLoading) {
    return (
      <div className="w-full h-screen flex items-center justify-center">
        <Spinner className="size-4" />
      </div>
    );
  }

  if (showForm)
    return (
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit((data: FormValues) =>
            updatePassword(data)
          )}
        >
          <fieldset
            className="flex flex-col gap-4 mx-auto py-30"
            disabled={isSuccess}
          >
            <h2 className="text-xl font-bold text-center">{t('title')}</h2>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('password_input')}
                      {...field}
                      className="h-12"
                      disabled={isPending}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormControl>
                    <Input
                      type="password"
                      placeholder={t('confirm_password_input')}
                      {...field}
                      className="h-12"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" size="lg" disabled={isPending}>
              {t('submit_button')}
            </Button>
          </fieldset>
        </form>
      </Form>
    );
}

export default function ResetPasswordPage() {
  return (
    <div className="container max-w-sm mx-auto px-4">
      <Suspense
        fallback={
          <div className="w-full h-screen flex items-center justify-center">
            <Spinner className="size-4" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
