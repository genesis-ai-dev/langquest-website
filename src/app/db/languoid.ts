import { SupabaseClient } from '@supabase/supabase-js';

export interface FiaLanguoid {
  id: string;
  name: string;
  active: boolean;
  [key: string]: unknown;
}

export async function lookupFiaLanguageCode(
  supabase: SupabaseClient,
  languoidId: string
): Promise<string | null> {
  if (!languoidId) {
    return null;
  }

  const { data, error } = await supabase
    .from('languoid_property')
    .select('value')
    .eq('languoid_id', languoidId)
    .eq('key', 'fia_language_code')
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  if (error || !data?.value) {
    return null;
  }

  return data.value;
}

export async function fetchFiaLanguoids(
  supabase: SupabaseClient
): Promise<FiaLanguoid[]> {
  const { data: properties, error: propError } = await supabase
    .from('languoid_property')
    .select('languoid_id')
    .eq('key', 'fia_available')
    .eq('value', 'true')
    .eq('active', true);

  if (propError) {
    throw propError;
  }

  const languoidIds = Array.from(
    new Set(
      (properties || [])
        .map((property) => property.languoid_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  );

  if (languoidIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('languoid')
    .select('*')
    .in('id', languoidIds)
    .eq('active', true)
    .order('name');

  if (error) {
    throw error;
  }

  return (data || []) as FiaLanguoid[];
}
