'use client';

import { Suspense, useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { useParams, useSearchParams } from 'next/navigation';
import { Link } from '@/i18n/navigation';
import { ReviewForm, parseReviewPayload } from './review-form';

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

  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);
      setPayload(null);

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
          const message =
            body &&
            typeof body === 'object' &&
            'error' in body &&
            typeof body.error === 'string'
              ? body.error
              : JSON.stringify(body);
          setError(message);
          return;
        }

        setPayload(body);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load review'
          );
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
        {!isLoading && error ? (
          <pre className="whitespace-pre-wrap wrap-break-word">{error}</pre>
        ) : null}
        {!isLoading && !error && review ? (
          <ReviewForm review={review} reviewId={reviewId} token={token} />
        ) : null}
        {!isLoading && !error && payload && !review ? (
          <pre className="whitespace-pre-wrap wrap-break-word">
            {JSON.stringify(payload, null, 2)}
          </pre>
        ) : null}
      </main>
    </div>
  );
}
