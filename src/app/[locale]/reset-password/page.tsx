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
import { getSupabaseEnvironment } from '@/lib/supabase';
import { getQueryParams } from '@/lib/supabase-query-params';
import { isMobile } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthError, SupabaseClient } from '@supabase/supabase-js';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { createBrowserClient } from '@/lib/supabase/client';

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

export function ResetPasswordForm() {
  const [showForm, setShowForm] = useState(false);
  const searchParams = useSearchParams();
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null);

  const t = useTranslations('reset_password');

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
    console.log('useEffect');

    const { params } = getQueryParams(window.location.href);

    const supabase = createBrowserClient(
      getSupabaseEnvironment(params.project_ref)
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
      supabase.auth
        .setSession({
          access_token: access_token!,
          refresh_token: refresh_token!
        })
        .then(({ error: sessionError }: { error: AuthError | null }) => {
          if (sessionError) {
            toastError(sessionError);
            throw sessionError;
          }
          setShowForm(true);
        });
    }
  }, [t]);

  const {
    mutate: updatePassword,
    isPending,
    isSuccess
  } = useMutation({
    mutationFn: async ({ password }: FormValues) => {
      if (!supabase) return;
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t('success_message'));
    },
    onError: toastError
  });

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
