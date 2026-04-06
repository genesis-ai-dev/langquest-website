import { SupabaseClient } from '@supabase/supabase-js';

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
