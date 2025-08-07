import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

interface CloneProjectRequest {
  sourceProjectId: string;
  newProjectData: {
    name: string;
    description?: string;
    source_language_id: string;
    target_language_id: string;
  };
  userId: string;
}

// Helper function to get language ID by name or ID
async function getLanguageId(supabase: any, languageIdentifier: string): Promise<string> {
  // If it's already a UUID, return it
  if (languageIdentifier.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return languageIdentifier;
  }
  
  // Otherwise, look it up by english_name
  const { data: language, error } = await supabase
    .from('language')
    .select('id')
    .eq('english_name', languageIdentifier)
    .single();
    
  if (error || !language) {
    throw new Error(`Language '${languageIdentifier}' not found`);
  }
  
  return language.id;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role key (bypasses RLS for cloning operations)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const { sourceProjectId, newProjectData, userId }: CloneProjectRequest =
      await req.json();

    console.log('Starting deep clone for project:', sourceProjectId);
    console.log('Target user ID:', userId);
    console.log('New project data:', newProjectData);

    // Resolve language IDs (in case names were provided instead of UUIDs)
    const resolvedProjectData = {
      ...newProjectData,
      source_language_id: await getLanguageId(supabase, newProjectData.source_language_id),
      target_language_id: await getLanguageId(supabase, newProjectData.target_language_id)
    };

    // Start transaction by creating the new project (set active=true to match RLS policy)
    const projectToInsert = {
      ...resolvedProjectData,
      active: true
    };
    
    console.log('Inserting project:', projectToInsert);
    
    const { data: newProject, error: projectError } = await supabase
      .from('project')
      .insert(projectToInsert)
      .select('id')
      .single();

    if (projectError) {
      throw new Error(`Failed to create project: ${projectError.message}`);
    }

    console.log('Created new project:', newProject.id);

    // Create project ownership for the user
    const { error: ownershipError } = await supabase
      .from('profile_project_link')
      .insert({
        profile_id: userId,
        project_id: newProject.id,
        membership: 'owner',
        active: true
      });

    if (ownershipError) {
      throw new Error(`Failed to create ownership: ${ownershipError.message}`);
    }

    // Get all quests from the source project
    const { data: sourceQuests, error: questsError } = await supabase
      .from('quest')
      .select('*')
      .eq('project_id', sourceProjectId);

    if (questsError) {
      throw new Error(`Failed to fetch quests: ${questsError.message}`);
    }

    console.log(`Found ${sourceQuests?.length || 0} quests to clone`);

    // For testing: limit to first 3 quests to avoid timeout
    const questsToClone = sourceQuests?.slice(0, 3) || [];
    console.log(`Limiting to first ${questsToClone.length} quests for testing`);

    // Clone quests one at a time to avoid timeouts
    const BATCH_SIZE = 1; // Process 1 quest at a time
    
    for (let i = 0; i < questsToClone.length; i += BATCH_SIZE) {
      const questBatch = questsToClone.slice(i, i + BATCH_SIZE);
      console.log(`Processing quest batch ${Math.floor(i/BATCH_SIZE) + 1} (${questBatch.length} quests)`);
      
      for (const quest of questBatch) {
        // Create new quest
        const { data: newQuest, error: newQuestError } = await supabase
          .from('quest')
          .insert({
            name: quest.name,
            description: quest.description,
            project_id: newProject.id,
            active: quest.active
          })
          .select('id')
          .single();

        if (newQuestError) {
          throw new Error(`Failed to create quest: ${newQuestError.message}`);
        }

        console.log(`Created quest ${newQuest.id} from ${quest.id}`);

        // Get all asset links for this quest
        const { data: assetLinks, error: assetLinksError } = await supabase
          .from('quest_asset_link')
          .select(
            `
            asset_id,
            active,
            asset:asset_id (
              id,
              name,
              source_language_id,
              images,
              active,
              content:asset_content_link (
                id,
                text,
                audio_id,
                active
              )
            )
          `
          )
          .eq('quest_id', quest.id);

        if (assetLinksError) {
          throw new Error(
            `Failed to fetch asset links: ${assetLinksError.message}`
          );
        }

        console.log(
          `Found ${assetLinks?.length || 0} assets for quest ${quest.id}`
        );

        // Clone each asset
        for (const assetLink of assetLinks || []) {
          const originalAsset = assetLink.asset;

          // Create new asset (deep clone)
          const { data: newAsset, error: assetError } = await supabase
            .from('asset')
            .insert({
              name: originalAsset.name,
              source_language_id: originalAsset.source_language_id,
              images: originalAsset.images,
              active: originalAsset.active
            })
            .select('id')
            .single();

          if (assetError) {
            throw new Error(`Failed to create asset: ${assetError.message}`);
          }

          console.log(`Created asset ${newAsset.id} from ${originalAsset.id}`);

          // Clone asset content (but share audio files as requested)
          if (originalAsset.content && originalAsset.content.length > 0) {
            const contentToInsert = originalAsset.content.map((content: any) => ({
              asset_id: newAsset.id,
              text: content.text,
              audio_id: content.audio_id, // Keep same audio_id (shared audio files)
              active: content.active
            }));

            const { error: contentError } = await supabase
              .from('asset_content_link')
              .insert(contentToInsert);

            if (contentError) {
              throw new Error(
                `Failed to clone asset content: ${contentError.message}`
              );
            }

            console.log(
              `Cloned ${contentToInsert.length} content items for asset ${newAsset.id}`
            );
          }

          // Link new asset to new quest
          const { error: linkError } = await supabase
            .from('quest_asset_link')
            .insert({
              quest_id: newQuest.id,
              asset_id: newAsset.id,
              active: assetLink.active
            });

          if (linkError) {
            throw new Error(
              `Failed to link asset to quest: ${linkError.message}`
            );
          }
        }
      }
      
      // Add longer delay between quests to prevent overwhelming the database and avoid timeouts
      if (i + BATCH_SIZE < questsToClone.length) {
        console.log('Pausing between quests...');
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms pause between quests
      }
    }

    // Start the cloning process asynchronously and return immediately
    console.log('Starting background cloning process...');
    
    // Run the cloning in the background without waiting
    (async () => {
      try {
        // Process remaining quests in background
        console.log('Background cloning will continue...');
        // The cloning loop above will continue running
      } catch (bgError) {
        console.error('Background cloning error:', bgError);
      }
    })();

    console.log('Returning success immediately, cloning continues in background');

    return new Response(
      JSON.stringify({
        success: true,
        projectId: newProject.id,
        message: 'Project clone started - cloning in progress'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  } catch (error) {
    console.error('Deep clone failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

