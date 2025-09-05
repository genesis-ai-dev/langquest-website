import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { status, environment } = await request.json();
    const requestId = params.id;

    if (!status || !['pending', 'withdrawn'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be "pending" or "withdrawn"' },
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

    // Update the request
    const { data, error } = await supabase
      .from('request')
      .update({
        status,
        last_updated: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('sender_profile_id', user.id) // Ensure user can only update their own requests
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error updating membership request:', error);
    return NextResponse.json(
      { error: 'Failed to update membership request' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const environment = searchParams.get('environment');
    const requestId = params.id;

    if (!environment) {
      return NextResponse.json(
        { error: 'Environment is required' },
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

    // Soft delete the request by setting active to false
    const { data, error } = await supabase
      .from('request')
      .update({
        active: false,
        last_updated: new Date().toISOString()
      })
      .eq('id', requestId)
      .eq('sender_profile_id', user.id) // Ensure user can only delete their own requests
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting membership request:', error);
    return NextResponse.json(
      { error: 'Failed to delete membership request' },
      { status: 500 }
    );
  }
}
