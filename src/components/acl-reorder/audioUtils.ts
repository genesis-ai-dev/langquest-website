/**
 * Robust extraction of audio file paths from the asset_content_link.audio column.
 *
 * The DB column is `jsonb`. Supabase auto-parses it, but depending on how the
 * mobile app / PowerSync wrote the value, the runtime type can be:
 *   - string[]       – canonical: ["path/to/file.wav"]
 *   - string         – bare jsonb string: "path/to/file.wav"
 *   - null/undefined – no audio
 *
 * This helper normalises all variants into a clean string[].
 */
export function extractAudioPaths(
  audio: unknown
): string[] {
  if (audio == null) return [];

  // Already an array (the happy path for jsonb arrays parsed by Supabase)
  if (Array.isArray(audio)) {
    return audio.filter(
      (p): p is string => typeof p === 'string' && p.trim().length > 0
    );
  }

  // Bare string (jsonb stored as "path.wav" instead of ["path.wav"])
  if (typeof audio === 'string') {
    const trimmed = audio.trim();
    if (!trimmed) return [];

    // Could be a JSON-encoded array string, e.g. '["path.wav"]'
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.filter(
            (p): p is string => typeof p === 'string' && p.trim().length > 0
          );
        }
      } catch {
        // Not valid JSON — fall through to treat as literal path
      }
    }

    // Plain path string
    return [trimmed];
  }

  return [];
}

/** Convenience: does this ACL have at least one audio path? */
export function hasAudioPaths(audio: unknown): boolean {
  return extractAudioPaths(audio).length > 0;
}
