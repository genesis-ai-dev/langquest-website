import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface CloneProjectRequest {
  sourceProjectId: string;
  newProjectData: {
    name: string;
    description?: string;
    source_language_id?: string;
    target_language_id: string;
  };
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { sourceProjectId, newProjectData, userId }: CloneProjectRequest =
      await req.json();

    console.log('Starting optimized batch deep clone for project:', sourceProjectId);

    // Call optimized database function asynchronously to avoid 60-second PostgREST limit
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const adminKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/deep_clone_project_optimized`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminKey}`,
        'apikey': adminKey, // PostgREST requires this header
        'Prefer': 'resolution=async' // run in background
      },
      body: JSON.stringify({
        source_project_id: sourceProjectId,
        new_project_name: newProjectData.name,
        new_project_description: newProjectData.description || null,
        source_language_id: newProjectData.source_language_id || null,
        target_language_id: newProjectData.target_language_id,
        owner_user_id: userId
      })
    });

    if (rpcResponse.status !== 202) {
      const txt = await rpcResponse.text();
      console.error('Unexpected RPC response:', rpcResponse.status, txt);
      return new Response(
        JSON.stringify({ success: false, error: 'Unexpected RPC response', details: txt }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const jobLocation = rpcResponse.headers.get('Content-Location');
    console.log('Clone job accepted. Job status endpoint:', jobLocation);

    return new Response(
      JSON.stringify({ success: true, jobLocation }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 202 }
    );

  } catch (error) {
    console.error('Deep clone failed:', error);
    
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});