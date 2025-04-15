'use client';

import { getQueryParams } from '@/lib/supabase-query-params';
import { AuthError, EmailOtpType } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { isMobile } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormMessage,
  FormControl,
  FormField,
  FormItem
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

// import { Suspense } from 'react';
// import { useEffect, useState, useCallback } from 'react';
// import { AuthError, EmailOtpType } from '@supabase/supabase-js';
// import { isMobile } from '@/lib/utils';
// import { supabase } from '@/lib/supabase/client';
// import { getQueryParams } from '@/lib/supabase-query-params';

// // This is the main page component (server component)
// export default function ResetPasswordPage() {
//   return (
//     <Suspense fallback={<div className="text-center my-5">Loading...</div>}>
//       <ResetPasswordForm />
//     </Suspense>
//   );
// }

// type AuthParams = {
//   token: string;
//   type: EmailOtpType;
// };

// // This is the client component with all our existing logic
// function ResetPasswordForm() {
//   const [message, setMessage] = useState('Redirecting to LangQuest app...');
//   const [error, setError] = useState('');
//   const [showForm, setShowForm] = useState(false);

//   useEffect(() => {
//     const handlePasswordReset = async () => {
//       console.log('window.location.href', window.location.href);
//       const { params, errorCode } = getQueryParams(window.location.href);
//       console.log('params', params);

//       const token_hash = params.token;
//       const type = params.type;

//       if (!token_hash || !type) {
//         setMessage('Invalid or expired reset link.');
//         setError('red');
//         return;
//       }

//       console.log('params', params);

//       console.log('token_hash', token_hash);
//       console.log('type', type);

//       const { data, error: otpError } = await supabase.auth.verifyOtp({
//         token_hash: token_hash,
//         type: type as EmailOtpType
//       });

//       const access_token = data.session?.access_token;
//       const refresh_token = data.session?.refresh_token;

//       if (otpError) throw otpError;

//       if (isMobile()) {
//         // Mobile deep linking
//         const deepLink = `langquest://reset-password#access_token=${access_token}&refresh_token=${refresh_token}`;
//         const playStoreUrl =
//           'https://play.google.com/store/apps/details?id=com.etengenesis.langquest';

//         const iframe = document.createElement('iframe');
//         iframe.style.display = 'none';
//         iframe.src = deepLink;
//         document.body.appendChild(iframe);

//         setTimeout(() => {
//           window.location.href = playStoreUrl;
//         }, 5000);

//         window.location.href = deepLink;
//       } else {
//         try {
//           const { error: sessionError } = await supabase.auth.setSession({
//             access_token: token_hash!,
//             refresh_token: refresh_token!
//           });

//           if (sessionError) throw sessionError;

//           setShowForm(true);
//           setMessage('');
//         } catch (error: unknown) {
//           console.error('Error setting session:', error);
//           setMessage(
//             'Error: Invalid or expired reset link. Please request a new password reset.'
//           );
//           setError('red');
//         }
//       }
//     };
//     handlePasswordReset();
//   }, []);

//   const submitNewPassword = async (event: React.FormEvent) => {
//     event.preventDefault();
//     const form = event.target as HTMLFormElement;
//     const password = (form.elements.namedItem('password') as HTMLInputElement)
//       .value;

//     try {
//       const { error } = await supabase.auth.updateUser({
//         password: password
//       });

//       if (error) throw error;

//       setMessage(
//         'Password successfully updated! You can now close this window and log in to the app.'
//       );
//       setShowForm(false);
//     } catch (error: unknown) {
//       console.error('Error updating password:', error);
//       if (error instanceof Error || error instanceof AuthError) {
//         setError(error.message);
//       } else {
//         setError('An unexpected error occurred');
//       }
//     }
//   };

//   return (
//     <div className="container mx-auto px-4">
//       {message && (
//         <div
//           id="message"
//           className={`text-center my-5 ${error ? 'text-red-500' : ''}`}
//         >
//           {message}
//         </div>
//       )}

//       {showForm && (
//         <form
//           onSubmit={submitNewPassword}
//           className="max-w-md mx-auto my-10 p-5"
//         >
//           <h2 className="text-2xl font-bold mb-5">Reset Your Password</h2>
//           <input
//             type="password"
//             name="password"
//             className="w-full p-2 mb-2 border rounded"
//             placeholder="Enter new password"
//             required
//           />
//           <button
//             type="submit"
//             className="w-full p-2 mt-4 bg-accent1-500 text-white rounded hover:bg-accent1-600"
//           >
//             Reset Password
//           </button>
//           {error && <div className="text-red-500 mt-2">{error}</div>}
//         </form>
//       )}
//     </div>
//   );
// }

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

export default function ResetPasswordPage() {
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: ''
    }
  });

  useEffect(() => {
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
        .then(({ error: sessionError }) => {
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

  return (
    <div className="container max-w-sm mx-auto px-4">
      {showForm && (
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
      )}
    </div>
  );
}
