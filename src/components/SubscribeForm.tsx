'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Zap } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { subscribeSchema } from '@/lib/schemas';
import { useMutation } from '@tanstack/react-query';

type FormValues = z.infer<typeof subscribeSchema>;

export function SubscribeForm() {
  const t = useTranslations('subscribe_form');

  const form = useForm<FormValues>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: {
      email: ''
    }
  });

  const { isPending, mutate: subscribe } = useMutation({
    mutationFn: async (data: FormValues) => {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });

      const result = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(result.error || t('errors.failed'));
      }

      return result;
    },
    onSuccess: () => {
      toast.success(t('success'));
      form.reset();
    },
    onError: (error) => {
      console.error('Subscription error:', error);
      toast.error(t('errors.tryAgain'));
    }
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data: FormValues) => subscribe(data))}
        className="flex flex-col sm:flex-row gap-2"
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormControl>
                <Input
                  placeholder={t('emailPlaceholder')}
                  {...field}
                  className="h-12"
                  disabled={isPending}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          size="lg"
          className="gap-1 bg-accent4 text-white hover:bg-accent4/90 h-12"
          disabled={isPending}
        >
          <Zap className="h-4 w-4" />
          {isPending ? t('subscribing') : t('getNotified')}
        </Button>
      </form>
    </Form>
  );
}
