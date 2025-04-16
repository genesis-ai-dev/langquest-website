'use client';

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
import { createBrowserClient, SupabaseEnvironment } from '@/lib/supabase';
import { isMobile } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { AuthError } from '@supabase/supabase-js';

const resetPasswordSchema = z
  .object({
    password: z.string().min(1),
    confirmPassword: z.string().min(1)
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword']
  });

type FormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const [showForm, setShowForm] = useState(false);
  const searchParams = useSearchParams();
  const supabase = createBrowserClient(
    searchParams.get('env') as SupabaseEnvironment
  );

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
      toast.error(error_description);
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
            toast.error(sessionError.message);
            throw sessionError;
          }
          setShowForm(true);
        });
    }
  }, []);

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
        'Password successfully updated! You can now close this window and log in to the app.'
      );
    },
    onError: (error) => {
      toast.error(error.message);
    }
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
                      placeholder="Enter your password"
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
                      placeholder="Confirm your password"
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
    );
}

export default function ResetPasswordPage() {
  return (
    <div className="container max-w-sm mx-auto px-4">
      <Suspense fallback={<div>Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
