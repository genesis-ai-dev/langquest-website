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
import { createBrowserClient, SupabaseEnvironment } from '@/lib/supabase';
import { getQueryParams } from '@/lib/supabase-query-params';
import { isMobile } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthError } from '@supabase/supabase-js';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Branch, T } from 'gt-next';
import { useGT } from 'gt-next/client';

export function ResetPasswordForm() {
  const [showForm, setShowForm] = useState(false);
  const searchParams = useSearchParams();
  const supabase = createBrowserClient(
    searchParams.get('env') as SupabaseEnvironment
  );
  const t = useGT();

  const toastError = (error: AuthError | string) => {
    const errorCode = typeof error === 'string' ? error : error.code;
    const errorMessage = typeof error === 'string' ? error : error.message;

    toast.error(() => (
      <Branch
        branch={errorCode}
        same_password={
          <p>New password should be different from the old password.</p>
        }
        otp_expired={<p>Email link is invalid or has expired.</p>}
      >
        {errorMessage}
      </Branch>
    ));
  };

  const resetPasswordSchema = z
    .object({
      password: z
        .string()
        .min(1, { message: t('String must contain at least 1 character(s)') }),
      confirmPassword: z
        .string()
        .min(1, { message: t('String must contain at least 1 character(s)') })
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('Passwords do not match.'),
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

    const error = params.error;
    const error_code = params.error_code;
    const error_description = params.error_description;

    console.log('error', error);
    console.log('error_code', error_code);
    console.log('error_description', error_description);

    if (error) {
      toastError(error_code);
      return;
    }

    const access_token = params.access_token;
    const refresh_token = params.refresh_token;

    if (isMobile()) {
      toast.success('Redirecting to LangQuest app...');
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
  }, [supabase.auth]);

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
      toast.success(
        t(
          'Password successfully updated! You can now close this window and log in to the app.'
        )
      );
    },
    onError: toastError
  });

  if (showForm)
    return (
      <T id="app.reset_password.page.0">
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
              <h2 className="text-xl font-bold text-center">
                Reset Your Password
              </h2>
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('Enter your password')}
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
                        placeholder={t('Confirm your password')}
                        {...field}
                        className="h-12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" size="lg" disabled={isPending}>
                Reset Password
              </Button>
            </fieldset>
          </form>
        </Form>
      </T>
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
