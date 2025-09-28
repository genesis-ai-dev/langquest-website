import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '../../../../database.types';
import { getSupabaseCredentials } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { english_name, native_name, iso639_3, environment } =
      await request.json();

    const { url, key } = getSupabaseCredentials(environment);

    let accessToken: string | undefined;

    if (!accessToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        accessToken = authHeader.substring(7);
      }
    }

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
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

    const supabaseAdmin = createClient<Database>(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    if (!english_name) {
      return NextResponse.json(
        { error: 'Language name is required' },
        { status: 400 }
      );
    }

    // Generate ISO code if not provided
    const isoCode = iso639_3 || english_name.trim().toLowerCase().slice(0, 3);

    // Check if language already exists with same english_name and iso639_3
    const { data: existingLanguage, error: searchError } = await supabaseAdmin
      .from('language')
      .select()
      .eq('english_name', english_name.trim())
      .eq('iso639_3', isoCode)
      .single();

    // If language already exists, return it instead of creating a new one
    if (existingLanguage && !searchError) {
      return NextResponse.json({
        ...existingLanguage,
        message: 'Language already exists, returning existing record'
      });
    }

    // Insert the new language only if it doesn't exist
    const { data, error } = await supabaseAdmin
      .from('language')
      .insert({
        english_name: english_name.trim(),
        native_name: native_name || english_name.trim(),
        iso639_3: isoCode,
        creator_id: user.id
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

    return NextResponse.json({
      ...data,
      message: 'Language created successfully'
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
