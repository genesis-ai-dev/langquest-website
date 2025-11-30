import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../database.types';
import { getSupabaseCredentials, SupabaseEnvironment } from '@/lib/supabase';
import { randomUUID } from 'crypto';
import { env } from '@/lib/env';

export async function POST(req: NextRequest) {
  try {
    const { filename, environment } = await req.json();

    if (!filename) {
      return NextResponse.json({ error: 'Missing filename' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const envAux = (
      environment && environment !== ''
        ? environment
        : env.NEXT_PUBLIC_ENVIRONMENT
    ) as SupabaseEnvironment;

    console.log('Using environment:', envAux);

    const { url, key } = getSupabaseCredentials(envAux);

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

    // Usar authenticated client com ANON_KEY e token do usuário
    const supabase = createClient<Database>(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    if (!url || !key) {
      console.error('Missing Supabase credentials:', {
        url,
        key: !!key
      });
      return NextResponse.json(
        { error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const fileExt = filename.split('.').pop();
    const finalName = `${Date.now()}-${randomUUID()}.${fileExt}`;

    const filePath = `temp-uploads/${finalName}`;

    // Gera URL assinada válida por 1 hora
    const { data, error } = await supabase.storage
      .from('uploads')
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error(error);
      return NextResponse.json(
        { error: 'Failed to generate signed URL' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      uploadUrl: data.signedUrl,
      path: filePath
    });
  } catch (err) {
    console.error('upload-url error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
