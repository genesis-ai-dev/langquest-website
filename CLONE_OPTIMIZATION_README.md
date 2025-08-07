# Optimized Project Cloning Implementation

## Overview

This implementation solves the timeout issues with project cloning by:

1. Using batch processing with `ingest_batch_id` to avoid trigger overhead
2. Implementing closure tables for efficient lookups
3. Running everything in a single atomic transaction inside the database
4. Increasing timeout limits appropriately

## Key Components

### 1. Database Migration (`20250129000000_optimized_deep_clone.sql`)

- Adds `ingest_batch_id` columns to all cloned tables
- Creates `project_closure` and `quest_closure` tables for efficient lookups
- Implements split triggers (lightweight for batch, heavy for normal operations)
- Creates the optimized `deep_clone_project_optimized` function
- Sets 10-minute timeout for service role

### 2. Edge Function (`deep-clone-project-v2`)

- Updated to call the new optimized database function
- Increased timeout to 10 minutes for large projects
- Maintains the same API interface

### 3. How It Works

1. **Batch ID Generation**: Each clone operation gets a unique batch ID
2. **Mapping Tables**: Temporary tables map old IDs to new IDs
3. **Bulk Inserts**: All records inserted with `ingest_batch_id` set
4. **Lightweight Triggers**: During batch insert, only mark closures as dirty
5. **Closure Rebuild**: After all data is inserted, rebuild closures in one pass
6. **Cleanup**: Clear batch IDs (optional but keeps data clean)

## Deployment Steps

### 1. Deploy to Preview Branch

```bash
# Push the migration to your preview branch
supabase db push --db-url "postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-DB-PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Or if using Supabase CLI with linked project
supabase db push --linked
```

### 2. Deploy Edge Function

```bash
# Deploy the updated edge function
supabase functions deploy deep-clone-project-v2 --project-ref yjgdgsycxmlvaiuynlbv
```

### 3. Verify Migration

Check that all components are created:

- Tables: `project_closure`, `quest_closure`, `app_private.closure_dirty`
- Columns: `ingest_batch_id` on all relevant tables
- Function: `deep_clone_project_optimized`
- Triggers: Split triggers on quest and quest_asset_link

## Testing

### 1. Test with Small Project First

```javascript
// In your browser console or test script
const response = await fetch(
  'https://yjgdgsycxmlvaiuynlbv.supabase.co/functions/v1/deep-clone-project-v2',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer YOUR_ANON_KEY'
    },
    body: JSON.stringify({
      sourceProjectId: 'SMALL_PROJECT_ID',
      newProjectData: {
        name: 'Test Clone - Small',
        description: 'Testing optimized clone',
        target_language_id: 'LANGUAGE_ID'
      },
      userId: 'YOUR_USER_ID'
    })
  }
);

const result = await response.json();
console.log('Clone result:', result);
```

### 2. Test with Large Project

Once small project works, test with your 100k+ record project:

- Monitor the Supabase logs during cloning
- Check that closure tables are populated correctly
- Verify all data is cloned properly

### 3. Verify Closure Tables

```sql
-- Check quest closures
SELECT quest_id, array_length(asset_ids, 1) as asset_count,
       array_length(translation_ids, 1) as translation_count
FROM quest_closure
WHERE project_id = 'NEW_PROJECT_ID';

-- Check project closure
SELECT project_id, total_quests, total_assets, total_translations
FROM project_closure
WHERE project_id = 'NEW_PROJECT_ID';
```

## Troubleshooting

### If Clone Times Out

1. Check Supabase logs for specific errors
2. Increase timeout in edge function if needed
3. Consider chunking very large projects (>1M records)

### If Closures Are Wrong

1. Check that triggers are properly split
2. Verify `rebuild_closures_for_batch` logic
3. Manually run closure rebuild if needed

### Performance Tips

1. Ensure indexes exist on foreign keys
2. Monitor table bloat after many clones
3. Consider periodic VACUUM on heavily used tables

## Benefits

1. **Atomicity**: All or nothing - no partial clones
2. **Performance**: Bulk operations are much faster
3. **Scalability**: Can handle projects with 100k+ records
4. **Maintainability**: Closure tables make queries fast
5. **Reliability**: Advisory locks prevent concurrent clone conflicts

## Future Enhancements

1. **Progress Tracking**: Add progress reporting via websocket
2. **Async Jobs**: Move to background job for truly massive projects
3. **Partial Clones**: Allow cloning specific quests only
4. **Clone Templates**: Pre-configured clone settings
