import { createHash, timingSafeEqual } from 'crypto';
import type { NextRequest } from 'next/server';
import { env } from '@/lib/env';
import { reviewResponse } from '@/lib/review/server';

export type ReviewPartner = { origin: string };

/** Stored in review.metadata.reviewer.name when the partner sends no name. */
export const PARTNER_UNKNOWN_REVIEWER_NAME = 'Name not informed';

const PARTNERS = [
  {
    origin: 'EL',
    keys: () => [env.PARTNER_EL_API_KEY, env.PARTNER_EL_API_KEY_NEXT]
  }
];

function digest(value: string) {
  return createHash('sha256').update(value).digest();
}

/**
 * Resolves the partner from `Authorization: Bearer <key>`.
 * Returns a ready-made error response when the request is not authorized.
 */
export function authenticatePartner(
  request: NextRequest
): { partner: ReviewPartner } | { response: Response } {
  const configured = PARTNERS.flatMap((partner) =>
    partner
      .keys()
      .filter((key): key is string => Boolean(key))
      .map((key) => ({ origin: partner.origin, key: digest(key) }))
  );

  // The API does not exist until a key is configured.
  if (configured.length === 0) {
    return { response: reviewResponse({ error: 'Not found' }, 404) };
  }

  const header = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const received = match ? digest(match[1].trim()) : null;
  const partner = received
    ? configured.find((entry) => timingSafeEqual(entry.key, received))
    : undefined;

  if (!partner) {
    const response = reviewResponse({ error: 'Unauthorized' }, 401);
    response.headers.set('WWW-Authenticate', 'Bearer');
    return { response };
  }

  return { partner: { origin: partner.origin } };
}
