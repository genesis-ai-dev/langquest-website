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
import { env } from '@/lib/env';

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
  const { isLoading: authLoading } = useAuth();
  const t = useTranslations('reset_password');

  const supabase = useMemo(() => createBrowserClient(), []);

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
    if (authLoading) return;

    const { params } = getQueryParams(window.location.href);

    const error_code = params.error_code;
    const error_description = params.error_description;
    if (error_code) {
      toastError({ code: error_code, message: error_description });
      return;
    }

    const access_token = params.access_token;
    const refresh_token = params.refresh_token;

    if (isMobile()) {
      if (!access_token || !refresh_token) return;

      toast.success(t('redirecting'));
      const deepLink = `${env.NEXT_PUBLIC_APP_SCHEME}://reset-password#access_token=${access_token}&refresh_token=${refresh_token}&type=recovery`;
      const playStoreUrl =
        'https://play.google.com/store/apps/details?id=com.etengenesis.langquest';
      const appStoreUrl =
        'https://apps.apple.com/app/langquest-translation/id6752446665';

      // Detect iOS vs Android for appropriate store
      const isIOS =
        /iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !(window as unknown as { MSStream: boolean }).MSStream;

      window.location.href = deepLink;

      const timeout = setTimeout(() => {
        window.location.href = isIOS ? appStoreUrl : playStoreUrl;
      }, 5000);

      return () => clearTimeout(timeout);
    }

    const setUpSession = async () => {
      const {
        data: { session: existingSession }
      } = await supabase.auth.getSession();

      if (existingSession) {
        setShowForm(true);
        return;
      }

      if (!access_token || !refresh_token) {
        toastError({
          code: 'token_missing',
          message:
            'Password reset tokens are missing or expired. Please request a new password reset link.'
        });
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token
      });

      if (sessionError) {
        toastError(sessionError);
        return;
      }

      setShowForm(true);
    };

    setUpSession();
  }, [supabase, authLoading, t]);

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
