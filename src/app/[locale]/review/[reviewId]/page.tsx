'use client';

import { Suspense, useEffect, useState } from 'react';
import { CircleAlert, Globe } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ReviewForm, parseReviewPayload } from './review-form';

type ReviewUnavailable = {
  title: string;
  description: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function describeReviewLoadFailure(
  status: number,
  body: unknown
): ReviewUnavailable {
  if (isRecord(body) && body.valid === false) {
    return {
      title: 'Review unavailable',
      description:
        'This link is invalid, expired, or the review has already been submitted.'
    };
  }

  if (isRecord(body) && typeof body.error === 'string') {
    const apiError = body.error;
    if (status === 400 && /required/i.test(apiError)) {
      return {
        title: 'Incomplete link',
        description:
          'Open the full review link from your invitation, including the access token.'
      };
    }
    return {
      title: 'Review unavailable',
      description: apiError
    };
  }

  if (status === 404) {
    return {
      title: 'Review unavailable',
      description:
        'This link is invalid, expired, or the review has already been submitted.'
    };
  }

  if (status >= 500) {
    return {
      title: 'Something went wrong',
      description:
        'We could not load this review right now. Please try again in a few minutes.'
    };
  }

  return {
    title: 'Review unavailable',
    description: 'We could not open this review with the link you used.'
  };
}

function ReviewUnavailableMessage({ title, description }: ReviewUnavailable) {
  return (
    <div className="mx-auto max-w-lg space-y-6 pt-4">
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription>{description}</AlertDescription>
      </Alert>
      <Button variant="outline" asChild>
        <Link href="/">Back to LangQuest</Link>
      </Button>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading...</div>}>
      <ReviewPageContent />
    </Suspense>
  );
}

function ReviewHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-bold no-underline"
        >
          <Globe className="h-6 w-6 text-accent4" />
          <span className="text-xl font-bold">LangQuest</span>
        </Link>
      </div>
    </header>
  );
}

function ReviewPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const reviewIdParam = params.reviewId;
  const reviewId = Array.isArray(reviewIdParam)
    ? (reviewIdParam[0] ?? '')
    : (reviewIdParam ?? '');
  const token = searchParams.get('token') ?? '';

  const [unavailable, setUnavailable] = useState<ReviewUnavailable | null>(
    null
  );
  const [payload, setPayload] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setUnavailable(null);
      setPayload(null);

      if (!reviewId.trim() || !token.trim()) {
        setUnavailable({
          title: 'Incomplete link',
          description:
            'Open the full review link from your invitation, including the access token.'
        });
        setIsLoading(false);
        return;
      }

      const query = new URLSearchParams({
        review_id: reviewId,
        token
      });

      try {
        const response = await fetch(`/api/review?${query.toString()}`, {
          cache: 'no-store'
        });
        const body: unknown = await response.json().catch(() => null);

        if (cancelled) return;

        if (!response.ok) {
          setUnavailable(describeReviewLoadFailure(response.status, body));
          return;
        }

        const review = parseReviewPayload(body);
        if (!review) {
          setUnavailable({
            title: 'Review unavailable',
            description:
              'We received an unexpected response and could not load this review.'
          });
          return;
        }

        setPayload(body);
      } catch (err) {
        if (!cancelled) {
          setUnavailable({
            title: 'Something went wrong',
            description:
              err instanceof Error
                ? err.message
                : 'We could not load this review. Please try again.'
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [reviewId, token]);

  const review = payload ? parseReviewPayload(payload) : null;

  return (
    <div className="min-h-screen">
      <ReviewHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        {isLoading ? <div>Loading...</div> : null}
        {!isLoading && unavailable ? (
          <ReviewUnavailableMessage {...unavailable} />
        ) : null}
        {!isLoading && !unavailable && review ? (
          <ReviewForm review={review} reviewId={reviewId} token={token} />
        ) : null}
      </main>
    </div>
  );
}
