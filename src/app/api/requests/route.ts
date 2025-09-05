import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { projectId, environment } = await request.json();

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient(environment);
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user already has a pending request
    const { data: existingRequest } = await supabase
      .from('request')
      .select('*')
      .eq('sender_profile_id', user.id)
      .eq('project_id', projectId)
      .eq('active', true)
      .single();

    if (existingRequest) {
      // Update existing request to pending
      const { data, error } = await supabase
        .from('request')
        .update({
          status: 'pending',
          count: (existingRequest.count || 0) + 1,
          last_updated: new Date().toISOString()
        })
        .eq('id', existingRequest.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      // Create new request
      const { data, error } = await supabase
        .from('request')
        .insert({
          sender_profile_id: user.id,
          project_id: projectId,
          status: 'pending',
          count: 1
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error('Error creating membership request:', error);
    return NextResponse.json(
      { error: 'Failed to create membership request' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const environment = searchParams.get('environment');

    if (!projectId || !environment) {
      return NextResponse.json(
        { error: 'Project ID and environment are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient(environment);
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get existing request for this project
    const { data, error } = await supabase
      .from('request')
      .select('*')
      .eq('sender_profile_id', user.id)
      .eq('project_id', projectId)
      .eq('active', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }

    return NextResponse.json(data || null);
  } catch (error) {
    console.error('Error fetching membership request:', error);
    return NextResponse.json(
      { error: 'Failed to fetch membership request' },
      { status: 500 }
    );
  }
}
