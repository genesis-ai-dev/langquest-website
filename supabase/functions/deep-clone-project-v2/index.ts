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

    // Call the database function directly - the function itself handles large datasets efficiently
    const { data, error } = await supabase.rpc('deep_clone_project_optimized', {
      source_project_id: sourceProjectId,
      new_project_name: newProjectData.name,
      new_project_description: newProjectData.description || null,
      source_language_id: newProjectData.source_language_id || null,
      target_language_id: newProjectData.target_language_id,
      owner_user_id: userId
    });

    if (error) {
      console.error('Database function error:', error);
      throw new Error(`Database function failed: ${error.message}`);
    }

    console.log('Deep clone completed successfully:', data);

    return new Response(
      JSON.stringify(data),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
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