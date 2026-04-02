import { env } from '@/lib/env';
import { NextResponse } from 'next/server';

export const dynamic = 'force-static';

export function GET() {
  const entries = env.APP_IDS.map((id) => ({
    relation: [
      'delegate_permission/common.handle_all_urls',
      'delegate_permission/common.get_login_creds'
    ],
    target: {
      namespace: 'android_app',
      package_name: id,
      sha256_cert_fingerprints: [env.ANDROID_SHA256_FINGERPRINT]
    }
  }));

  return NextResponse.json(entries, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=300'
    }
  });
}
