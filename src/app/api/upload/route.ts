// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../database.types';
import { getSupabaseCredentials, SupabaseEnvironment } from '@/lib/supabase';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs'; // necessário para processar FormData

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;
    const projectId = formData.get('projectId') as string | null;
    const questId = formData.get('questId') as string | null;
    const environment = formData.get('environment') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 });
    }

    // Autenticação
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const envAux = (environment || 'production') as SupabaseEnvironment;
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

    const supabase = createClient<Database>(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    // Generate unique path for storage
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'zip';
    const fileName = `${Date.now()}-${randomUUID()}.${ext}`;
    const storagePath = `${user.id}/${fileName}`;

    // Upload ZIP to Supabase Storage (uploads bucket)
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(storagePath, file, {
        contentType: file.type || 'application/zip',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload ZIP to storage' },
        { status: 500 }
      );
    }

    // Return initial processing info
    return NextResponse.json({
      ok: true,
      uploadPath: storagePath,
      ownerId: user.id,
      meta: {
        type,
        projectId,
        questId,
        environment
      }
    });
  } catch (err) {
    console.error('Bulk upload error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
