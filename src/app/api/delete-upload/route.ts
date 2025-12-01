import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseCredentials, SupabaseEnvironment } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../../../../database.types';
import { env } from '@/lib/env';

export async function DELETE(request: NextRequest) {
  try {
    const { uploadPath, environment } = await request.json();

    if (!uploadPath) {
      return NextResponse.json(
        { error: 'uploadPath is required' },
        { status: 400 }
      );
    }

    // Get authentication token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const envAux = (environment ||
      env.NEXT_PUBLIC_ENVIRONMENT ||
      'production') as SupabaseEnvironment;
    const { url, key } = getSupabaseCredentials(envAux);

    // Create Supabase client with service role key for admin operations
    const supabase = createClient<Database>(url, key);

    // Delete the file from storage
    const { error } = await supabase.storage
      .from('uploads')
      .remove([uploadPath]);

    if (error) {
      console.error('Error deleting file:', error);
      return NextResponse.json(
        { error: 'Failed to delete file' },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in delete-upload:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
