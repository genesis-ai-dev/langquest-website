-- Migration: Optimized Deep Clone Project with Batch Processing
-- This migration implements an efficient cloning system that avoids trigger overhead

-- Step 1: Add ingest_batch_id column to all tables involved in cloning
ALTER TABLE project ADD COLUMN IF NOT EXISTS ingest_batch_id UUID;
ALTER TABLE quest ADD COLUMN IF NOT EXISTS ingest_batch_id UUID;
ALTER TABLE asset ADD COLUMN IF NOT EXISTS ingest_batch_id UUID;
ALTER TABLE asset_content_link ADD COLUMN IF NOT EXISTS ingest_batch_id UUID;
ALTER TABLE quest_asset_link ADD COLUMN IF NOT EXISTS ingest_batch_id UUID;
ALTER TABLE quest_tag_link ADD COLUMN IF NOT EXISTS ingest_batch_id UUID;
ALTER TABLE asset_tag_link ADD COLUMN IF NOT EXISTS ingest_batch_id UUID;
ALTER TABLE tag ADD COLUMN IF NOT EXISTS ingest_batch_id UUID;

-- Step 2: Create closure tables for efficient lookups
CREATE TABLE IF NOT EXISTS project_closure (
  project_id UUID PRIMARY KEY REFERENCES project(id) ON DELETE CASCADE,
  quest_ids TEXT[] DEFAULT '{}',
  asset_ids TEXT[] DEFAULT '{}',
  translation_ids TEXT[] DEFAULT '{}',
  tag_ids TEXT[] DEFAULT '{}',
  quest_asset_link_ids TEXT[] DEFAULT '{}',
  asset_content_link_ids TEXT[] DEFAULT '{}',
  quest_tag_link_ids TEXT[] DEFAULT '{}',
  asset_tag_link_ids TEXT[] DEFAULT '{}',
  total_quests INTEGER DEFAULT 0,
  total_assets INTEGER DEFAULT 0,
  total_translations INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quest_closure (
  quest_id UUID PRIMARY KEY REFERENCES quest(id) ON DELETE CASCADE,
  project_id UUID REFERENCES project(id) ON DELETE CASCADE,
  asset_ids TEXT[] DEFAULT '{}',
  translation_ids TEXT[] DEFAULT '{}',
  tag_ids TEXT[] DEFAULT '{}',
  quest_asset_link_ids TEXT[] DEFAULT '{}',
  asset_content_link_ids TEXT[] DEFAULT '{}',
  asset_tag_link_ids TEXT[] DEFAULT '{}',
  total_assets INTEGER DEFAULT 0,
  total_translations INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create dirty tracking table for batch operations
CREATE SCHEMA IF NOT EXISTS app_private;

CREATE TABLE IF NOT EXISTS app_private.closure_dirty (
  project_id UUID,
  quest_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, quest_id)
);

-- Step 4: Create lightweight trigger for marking closures dirty during batch operations
CREATE OR REPLACE FUNCTION app_private.mark_dirty_for_closure() 
RETURNS TRIGGER 
LANGUAGE plpgsql AS $$
BEGIN
  -- For quest inserts/updates
  IF TG_TABLE_NAME = 'quest' THEN
    INSERT INTO app_private.closure_dirty(project_id, quest_id)
    VALUES (NEW.project_id, NEW.id)
    ON CONFLICT DO NOTHING;
  
  -- For quest_asset_link operations
  ELSIF TG_TABLE_NAME = 'quest_asset_link' THEN
    INSERT INTO app_private.closure_dirty(project_id, quest_id)
    SELECT q.project_id, q.id
    FROM quest q
    WHERE q.id = NEW.quest_id
    ON CONFLICT DO NOTHING;
    
  -- For asset operations
  ELSIF TG_TABLE_NAME = 'asset' THEN
    INSERT INTO app_private.closure_dirty(project_id, quest_id)
    SELECT DISTINCT q.project_id, q.id
    FROM quest q
    JOIN quest_asset_link qal ON qal.quest_id = q.id
    WHERE qal.asset_id = NEW.id
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Step 5: Create heavy trigger for normal operations (maintains closures immediately)
CREATE OR REPLACE FUNCTION app_private.maintain_quest_closure() 
RETURNS TRIGGER 
LANGUAGE plpgsql AS $$
BEGIN
  -- This is a placeholder - implement your actual closure maintenance logic here
  -- For now, we'll just mark it dirty and rely on periodic refresh
  INSERT INTO app_private.closure_dirty(project_id, quest_id)
  SELECT q.project_id, q.id
  FROM quest q
  WHERE q.id = COALESCE(NEW.quest_id, NEW.id, OLD.quest_id, OLD.id)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Step 6: Split triggers for batch vs normal operations
-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS quest_ai_dirty ON quest;
DROP TRIGGER IF EXISTS quest_ai_closure ON quest;
DROP TRIGGER IF EXISTS quest_au_dirty ON quest;
DROP TRIGGER IF EXISTS quest_au_closure ON quest;

-- Quest triggers
CREATE TRIGGER quest_ai_dirty
  AFTER INSERT ON quest
  FOR EACH ROW
  WHEN (NEW.ingest_batch_id IS NOT NULL)
  EXECUTE FUNCTION app_private.mark_dirty_for_closure();

CREATE TRIGGER quest_ai_closure
  AFTER INSERT ON quest
  FOR EACH ROW
  WHEN (NEW.ingest_batch_id IS NULL)
  EXECUTE FUNCTION app_private.maintain_quest_closure();

CREATE TRIGGER quest_au_dirty
  AFTER UPDATE ON quest
  FOR EACH ROW
  WHEN (NEW.ingest_batch_id IS NOT NULL)
  EXECUTE FUNCTION app_private.mark_dirty_for_closure();

CREATE TRIGGER quest_au_closure
  AFTER UPDATE ON quest
  FOR EACH ROW
  WHEN (NEW.ingest_batch_id IS NULL)
  EXECUTE FUNCTION app_private.maintain_quest_closure();

-- Similar triggers for quest_asset_link
DROP TRIGGER IF EXISTS quest_asset_link_ai_dirty ON quest_asset_link;
DROP TRIGGER IF EXISTS quest_asset_link_ai_closure ON quest_asset_link;

CREATE TRIGGER quest_asset_link_ai_dirty
  AFTER INSERT ON quest_asset_link
  FOR EACH ROW
  WHEN (NEW.ingest_batch_id IS NOT NULL)
  EXECUTE FUNCTION app_private.mark_dirty_for_closure();

CREATE TRIGGER quest_asset_link_ai_closure
  AFTER INSERT ON quest_asset_link
  FOR EACH ROW
  WHEN (NEW.ingest_batch_id IS NULL)
  EXECUTE FUNCTION app_private.maintain_quest_closure();

-- Step 7: Function to rebuild closures for a batch
CREATE OR REPLACE FUNCTION app_private.rebuild_closures_for_batch(batch_id UUID)
RETURNS VOID
LANGUAGE plpgsql AS $$
BEGIN
  -- Delete existing closures for affected quests
  DELETE FROM quest_closure qc
  USING app_private.closure_dirty cd
  WHERE qc.quest_id = cd.quest_id;
  
  -- Rebuild quest closures
  INSERT INTO quest_closure(
    quest_id, project_id, asset_ids, translation_ids, tag_ids,
    quest_asset_link_ids, asset_content_link_ids, asset_tag_link_ids,
    total_assets, total_translations, last_updated
  )
  SELECT 
    q.id,
    q.project_id,
    array_agg(DISTINCT a.id::text) FILTER (WHERE a.id IS NOT NULL),
    array_agg(DISTINCT t.id::text) FILTER (WHERE t.id IS NOT NULL),
    array_agg(DISTINCT tag.id::text) FILTER (WHERE tag.id IS NOT NULL),
    array_agg(DISTINCT qal.id::text) FILTER (WHERE qal.id IS NOT NULL),
    array_agg(DISTINCT acl.id::text) FILTER (WHERE acl.id IS NOT NULL),
    array_agg(DISTINCT atl.id::text) FILTER (WHERE atl.id IS NOT NULL),
    count(DISTINCT a.id)::integer,
    count(DISTINCT t.id)::integer,
    NOW()
  FROM quest q
  LEFT JOIN quest_asset_link qal ON qal.quest_id = q.id
  LEFT JOIN asset a ON a.id = qal.asset_id
  LEFT JOIN translation t ON t.asset_id = a.id
  LEFT JOIN asset_content_link acl ON acl.asset_id = a.id
  LEFT JOIN quest_tag_link qtl ON qtl.quest_id = q.id
  LEFT JOIN tag ON tag.id = qtl.tag_id
  LEFT JOIN asset_tag_link atl ON atl.asset_id = a.id
  WHERE q.id IN (SELECT quest_id FROM app_private.closure_dirty)
  GROUP BY q.id, q.project_id;
  
  -- Delete existing project closures for affected projects
  DELETE FROM project_closure pc
  USING (SELECT DISTINCT project_id FROM app_private.closure_dirty) cd
  WHERE pc.project_id = cd.project_id;
  
  -- Rebuild project closures
  INSERT INTO project_closure(
    project_id, quest_ids, asset_ids, translation_ids, tag_ids,
    quest_asset_link_ids, asset_content_link_ids, quest_tag_link_ids, 
    asset_tag_link_ids, total_quests, total_assets, total_translations, 
    last_updated
  )
  SELECT 
    p.id,
    array_agg(DISTINCT q.id::text) FILTER (WHERE q.id IS NOT NULL),
    array_agg(DISTINCT a.id::text) FILTER (WHERE a.id IS NOT NULL),
    array_agg(DISTINCT t.id::text) FILTER (WHERE t.id IS NOT NULL),
    array_agg(DISTINCT tag.id::text) FILTER (WHERE tag.id IS NOT NULL),
    array_agg(DISTINCT qal.id::text) FILTER (WHERE qal.id IS NOT NULL),
    array_agg(DISTINCT acl.id::text) FILTER (WHERE acl.id IS NOT NULL),
    array_agg(DISTINCT qtl.id::text) FILTER (WHERE qtl.id IS NOT NULL),
    array_agg(DISTINCT atl.id::text) FILTER (WHERE atl.id IS NOT NULL),
    count(DISTINCT q.id)::integer,
    count(DISTINCT a.id)::integer,
    count(DISTINCT t.id)::integer,
    NOW()
  FROM project p
  LEFT JOIN quest q ON q.project_id = p.id
  LEFT JOIN quest_asset_link qal ON qal.quest_id = q.id
  LEFT JOIN asset a ON a.id = qal.asset_id
  LEFT JOIN translation t ON t.asset_id = a.id
  LEFT JOIN asset_content_link acl ON acl.asset_id = a.id
  LEFT JOIN quest_tag_link qtl ON qtl.quest_id = q.id
  LEFT JOIN tag ON tag.id = qtl.tag_id
  LEFT JOIN asset_tag_link atl ON atl.asset_id = a.id
  WHERE p.id IN (SELECT DISTINCT project_id FROM app_private.closure_dirty)
  GROUP BY p.id;
  
  -- Clear dirty records
  DELETE FROM app_private.closure_dirty;
END;
$$;

-- Step 8: Optimized deep clone function with batch processing
CREATE OR REPLACE FUNCTION deep_clone_project_optimized(
  source_project_id UUID,
  new_project_name TEXT,
  new_project_description TEXT DEFAULT NULL,
  source_language_id UUID DEFAULT NULL,
  target_language_id UUID DEFAULT NULL,
  owner_user_id UUID DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  batch_id UUID;
  new_project_id UUID;
  source_project_rec RECORD;
  result JSON;
BEGIN
  -- Generate batch ID for this clone operation
  batch_id := gen_random_uuid();
  
  -- Take advisory lock to prevent concurrent clones of same project
  PERFORM pg_advisory_xact_lock(hashtext('clone:' || source_project_id::text));
  
  -- Get source project
  SELECT * INTO source_project_rec
  FROM project
  WHERE id = source_project_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source project % not found', source_project_id;
  END IF;
  
  -- Create temporary mapping tables
  CREATE TEMP TABLE map_project (old_id UUID PRIMARY KEY, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE map_quest (old_id UUID PRIMARY KEY, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE map_asset (old_id UUID PRIMARY KEY, new_id UUID) ON COMMIT DROP;
  CREATE TEMP TABLE map_tag (old_id UUID PRIMARY KEY, new_id UUID) ON COMMIT DROP;
  
  -- Populate project mapping
  new_project_id := gen_random_uuid();
  INSERT INTO map_project(old_id, new_id) VALUES (source_project_id, new_project_id);
  
  -- Populate quest mappings
  INSERT INTO map_quest(old_id, new_id)
  SELECT q.id, gen_random_uuid()
  FROM quest q
  WHERE q.project_id = source_project_id
  AND q.active = true;
  
  -- Populate asset mappings
  INSERT INTO map_asset(old_id, new_id)
  SELECT DISTINCT a.id, gen_random_uuid()
  FROM asset a
  JOIN quest_asset_link qal ON qal.asset_id = a.id
  JOIN map_quest mq ON mq.old_id = qal.quest_id
  WHERE a.active = true
  AND qal.active = true;
  
  -- Populate tag mappings (if cloning tags)
  INSERT INTO map_tag(old_id, new_id)
  SELECT DISTINCT t.id, gen_random_uuid()
  FROM tag t
  LEFT JOIN quest_tag_link qtl ON qtl.tag_id = t.id
  LEFT JOIN asset_tag_link atl ON atl.tag_id = t.id
  WHERE (qtl.quest_id IN (SELECT old_id FROM map_quest)
     OR atl.asset_id IN (SELECT old_id FROM map_asset))
  AND t.active = true;
  
  -- Insert new project with batch ID
  INSERT INTO project (
    id, name, description, source_language_id, target_language_id, 
    active, ingest_batch_id
  ) VALUES (
    new_project_id,
    new_project_name,
    COALESCE(new_project_description, source_project_rec.description),
    COALESCE(source_language_id, source_project_rec.source_language_id),
    COALESCE(target_language_id, source_project_rec.target_language_id),
    true,
    batch_id
  );
  
  -- Create ownership
  IF owner_user_id IS NOT NULL THEN
    INSERT INTO profile_project_link (
      profile_id, project_id, membership, active
    ) VALUES (
      owner_user_id, new_project_id, 'owner', true
    );
  END IF;
  
  -- Bulk insert quests
  INSERT INTO quest (id, name, description, project_id, active, ingest_batch_id, created_at, last_updated)
  SELECT 
    mq.new_id,
    q.name,
    q.description,
    mp.new_id,
    q.active,
    batch_id,
    NOW(),
    NOW()
  FROM quest q
  JOIN map_quest mq ON mq.old_id = q.id
  JOIN map_project mp ON mp.old_id = q.project_id;
  
  -- Bulk insert assets
  INSERT INTO asset (id, name, source_language_id, images, active, ingest_batch_id, created_at, last_updated)
  SELECT 
    ma.new_id,
    a.name,
    a.source_language_id,
    a.images,
    a.active,
    batch_id,
    NOW(),
    NOW()
  FROM asset a
  JOIN map_asset ma ON ma.old_id = a.id;
  
  -- Bulk insert tags (if any)
  INSERT INTO tag (id, name, active, ingest_batch_id, created_at, last_updated)
  SELECT 
    mt.new_id,
    t.name,
    t.active,
    batch_id,
    NOW(),
    NOW()
  FROM tag t
  JOIN map_tag mt ON mt.old_id = t.id
  WHERE NOT EXISTS (
    SELECT 1 FROM tag existing WHERE existing.name = t.name
  );
  
  -- Bulk insert quest_asset_links
  INSERT INTO quest_asset_link (quest_id, asset_id, active, ingest_batch_id, created_at, last_updated)
  SELECT 
    mq.new_id,
    ma.new_id,
    qal.active,
    batch_id,
    NOW(),
    NOW()
  FROM quest_asset_link qal
  JOIN map_quest mq ON mq.old_id = qal.quest_id
  JOIN map_asset ma ON ma.old_id = qal.asset_id
  WHERE qal.active = true;
  
  -- Bulk insert asset_content_links (sharing audio files)
  INSERT INTO asset_content_link (id, asset_id, text, audio_id, active, ingest_batch_id, created_at, last_updated)
  SELECT 
    gen_random_uuid(),
    ma.new_id,
    acl.text,
    acl.audio_id,  -- Shared audio reference
    acl.active,
    batch_id,
    NOW(),
    NOW()
  FROM asset_content_link acl
  JOIN map_asset ma ON ma.old_id = acl.asset_id
  WHERE acl.active = true;
  
  -- Bulk insert quest_tag_links
  INSERT INTO quest_tag_link (quest_id, tag_id, active, ingest_batch_id, created_at, last_updated)
  SELECT 
    mq.new_id,
    COALESCE(mt.new_id, qtl.tag_id),  -- Use new tag ID if cloned, else original
    qtl.active,
    batch_id,
    NOW(),
    NOW()
  FROM quest_tag_link qtl
  JOIN map_quest mq ON mq.old_id = qtl.quest_id
  LEFT JOIN map_tag mt ON mt.old_id = qtl.tag_id
  WHERE qtl.active = true;
  
  -- Bulk insert asset_tag_links
  INSERT INTO asset_tag_link (asset_id, tag_id, active, ingest_batch_id, created_at, last_modified)
  SELECT 
    ma.new_id,
    COALESCE(mt.new_id, atl.tag_id),  -- Use new tag ID if cloned, else original
    atl.active,
    batch_id,
    NOW(),
    NOW()
  FROM asset_tag_link atl
  JOIN map_asset ma ON ma.old_id = atl.asset_id
  LEFT JOIN map_tag mt ON mt.old_id = atl.tag_id
  WHERE atl.active = true;
  
  -- Rebuild closures for the batch
  PERFORM app_private.rebuild_closures_for_batch(batch_id);
  
  -- Clear batch IDs (optional - keeps data cleaner)
  UPDATE project SET ingest_batch_id = NULL WHERE ingest_batch_id = batch_id;
  UPDATE quest SET ingest_batch_id = NULL WHERE ingest_batch_id = batch_id;
  UPDATE asset SET ingest_batch_id = NULL WHERE ingest_batch_id = batch_id;
  UPDATE tag SET ingest_batch_id = NULL WHERE ingest_batch_id = batch_id;
  UPDATE quest_asset_link SET ingest_batch_id = NULL WHERE ingest_batch_id = batch_id;
  UPDATE asset_content_link SET ingest_batch_id = NULL WHERE ingest_batch_id = batch_id;
  UPDATE quest_tag_link SET ingest_batch_id = NULL WHERE ingest_batch_id = batch_id;
  UPDATE asset_tag_link SET ingest_batch_id = NULL WHERE ingest_batch_id = batch_id;
  
  -- Return success result
  result := json_build_object(
    'success', true,
    'projectId', new_project_id,
    'message', 'Project cloned successfully with optimized batch processing'
  );
  
  RETURN result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Transaction will automatically roll back
    RAISE EXCEPTION 'Deep clone failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Increase statement timeout for service role (for long-running clones)
ALTER ROLE service_role SET statement_timeout = '10min';

-- Step 10: Grant permissions
GRANT EXECUTE ON FUNCTION deep_clone_project_optimized TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.rebuild_closures_for_batch TO service_role;

-- Notify PostgREST to reload configuration
NOTIFY pgrst, 'reload config';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quest_ingest_batch_id ON quest(ingest_batch_id) WHERE ingest_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_asset_ingest_batch_id ON asset(ingest_batch_id) WHERE ingest_batch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_project_closure_project_id ON project_closure(project_id);
CREATE INDEX IF NOT EXISTS idx_quest_closure_quest_id ON quest_closure(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_closure_project_id ON quest_closure(project_id);
CREATE INDEX IF NOT EXISTS idx_closure_dirty_project_quest ON app_private.closure_dirty(project_id, quest_id);
