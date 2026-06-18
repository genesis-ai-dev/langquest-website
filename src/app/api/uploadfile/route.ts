import { randomUUID } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { env } from '@/lib/env';

import type { Database } from '../../../../database.types';

const MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024;
const allowedUploadTypes = new Set(['project', 'quest', 'asset']);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const filename = getStringValue(body.filename);
    const uploadType = getStringValue(body.uploadType);
    const fileSize = getNumberValue(body.fileSize);

    if (!filename) {
      return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
    }

    if (!filename.toLowerCase().endsWith('.zip')) {
      return NextResponse.json(
        { error: 'Only ZIP files are supported' },
        { status: 400 }
      );
    }

    if (!uploadType || !allowedUploadTypes.has(uploadType)) {
      return NextResponse.json(
        { error: 'uploadType must be one of: project, quest, asset' },
        { status: 400 }
      );
    }

    if (!fileSize || fileSize > MAX_UPLOAD_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File size must be greater than 0 and no larger than 50MB' },
        { status: 400 }
      );
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabaseAuth = createClient<Database>(url, key);
    const {
      data: { user },
      error: authError
    } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const supabase = createClient<Database>(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    const fileExtension = filename.split('.').pop()?.toLowerCase() || 'zip';
    const storageFileName = `${Date.now()}-${randomUUID()}.${fileExtension}`;
    const filePath = `temp-uploads/${user.id}/${uploadType}/${storageFileName}`;

    const { data, error } = await supabase.storage
      .from('uploads')
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error('[UPLOAD FILE] Failed to generate signed URL:', error);
      return NextResponse.json(
        { error: 'Failed to generate signed upload URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      path: filePath,
      expiresIn: 3600
    });
  } catch (error) {
    console.error('[UPLOAD FILE] Unexpected error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

function getStringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function getNumberValue(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
