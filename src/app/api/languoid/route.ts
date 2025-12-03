import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Database } from '../../../../database.types';
import { getSupabaseCredentials, SupabaseEnvironment } from '@/lib/supabase';
import { env } from '@/lib/env';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      name?: string;
      iso639_3?: string;
      environment?: string;
    };
    const { name, iso639_3, environment } = body;

    const envAux = (environment ||
      env.NEXT_PUBLIC_ENVIRONMENT ||
      'production') as SupabaseEnvironment;
    const { url, key } = getSupabaseCredentials(envAux);

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

    if (!name) {
      return NextResponse.json(
        { error: 'Language name is required' },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();
    const trimmedIso = iso639_3?.trim().toLowerCase() || '';

    // Step 1: Try to find an existing languoid using the RPC function
    if (trimmedIso) {
      const { data: existingId, error: searchError } = await supabaseAdmin.rpc(
        'find_matching_languoid',
        {
          p_iso639_3: trimmedIso,
          p_english_name: trimmedName,
          p_native_name: trimmedName
        }
      );

      if (!searchError && existingId) {
        // Fetch the existing languoid details
        const { data: existingLanguoid } = await supabaseAdmin
          .from('languoid')
          .select('id, name, level, ui_ready')
          .eq('id', existingId)
          .single();

        if (existingLanguoid) {
          // Get the ISO code from languoid_source if available
          const { data: source } = await supabaseAdmin
            .from('languoid_source')
            .select('unique_identifier')
            .eq('languoid_id', existingId)
            .eq('name', 'iso639-3')
            .single();

          return NextResponse.json({
            ...existingLanguoid,
            iso_code: source?.unique_identifier || null,
            message: 'Languoid already exists, returning existing record'
          });
        }
      }
    }

    // Step 2: Check if a languoid with the same name exists locally
    const { data: existingByName } = await supabaseAdmin
      .from('languoid')
      .select('id, name, level, ui_ready')
      .ilike('name', trimmedName)
      .eq('active', true)
      .limit(1)
      .single();

    if (existingByName) {
      // Get the ISO code if available
      const { data: source } = await supabaseAdmin
        .from('languoid_source')
        .select('unique_identifier')
        .eq('languoid_id', existingByName.id)
        .eq('name', 'iso639-3')
        .single();

      return NextResponse.json({
        ...existingByName,
        iso_code: source?.unique_identifier || null,
        message: 'Languoid already exists, returning existing record'
      });
    }

    // Step 3: Create new languoid
    const { data: newLanguoid, error: insertError } = await supabaseAdmin
      .from('languoid')
      .insert({
        name: trimmedName,
        level: 'language',
        ui_ready: false,
        creator_id: user.id,
        active: true
      })
      .select('id, name, level, ui_ready')
      .single();

    if (insertError) {
      console.error('Error creating languoid:', insertError);
      return NextResponse.json(
        { error: 'Failed to create languoid' },
        { status: 500 }
      );
    }

    // Step 4: Create languoid_source record for ISO 639-3 if provided
    if (trimmedIso && newLanguoid) {
      const { error: sourceError } = await supabaseAdmin
        .from('languoid_source')
        .insert({
          languoid_id: newLanguoid.id,
          name: 'iso639-3',
          unique_identifier: trimmedIso,
          creator_id: user.id,
          active: true
        });

      if (sourceError) {
        console.error('Error creating languoid_source:', sourceError);
        // Don't fail the request, the languoid was created successfully
      }
    }

    return NextResponse.json({
      ...newLanguoid,
      iso_code: trimmedIso || null,
      message: 'Languoid created successfully'
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

