import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { Database } from '../../../../database.types';

// Create a Supabase client with server-side auth
const supabaseAdmin = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy-key-for-build'
);

export async function POST(request: Request) {
  try {
    // Check if we have the required environment variable at runtime
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Service not configured' },
        { status: 503 }
      );
    }

    const { english_name, native_name, iso639_3 } = await request.json();

    // Validate input
    if (!english_name) {
      return NextResponse.json(
        { error: 'Language name is required' },
        { status: 400 }
      );
    }

    // Generate ISO code if not provided
    const isoCode = iso639_3 || english_name.trim().toLowerCase().slice(0, 3);

    // Insert the new language
    const { data, error } = await supabaseAdmin
      .from('language')
      .insert({
        english_name: english_name.trim(),
        native_name: native_name || english_name.trim(),
        iso639_3: isoCode
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating language:', error);
      return NextResponse.json(
        { error: 'Failed to create language' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
