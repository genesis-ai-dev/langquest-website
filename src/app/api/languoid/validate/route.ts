import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { languages } = body;

    if (!languages || !Array.isArray(languages)) {
      return NextResponse.json(
        { error: 'Languages array is required' },
        { status: 400 }
      );
    }

    // Autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const accessToken = authHeader.substring(7);
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabaseAuth = createClient(url, key);
    const {
      data: { user },
      error: authError
    } = await supabaseAuth.auth.getUser(accessToken);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    const supabase = createClient(url, key, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    });

    const validLanguages: string[] = [];
    const invalidLanguages: Array<{ language: string; suggestions: any[] }> =
      [];

    for (const languageName of languages) {
      if (!languageName || typeof languageName !== 'string') {
        invalidLanguages.push({
          language: languageName,
          suggestions: []
        });
        continue;
      }

      const trimmedName = languageName.trim();
      if (!trimmedName) {
        invalidLanguages.push({
          language: languageName,
          suggestions: []
        });
        continue;
      }

      try {
        const { data: languoid, error } = await supabase
          .from('languoid')
          .select('name')
          .ilike('name', trimmedName)
          .eq('active', true)
          .limit(1)
          .single();

        if (error || !languoid) {
          // Buscar sugestões usando RPC search_languoids
          try {
            const { data: suggestions, error: rpcError } = await supabase.rpc(
              'search_languoids',
              {
                search_query: trimmedName,
                result_limit: 5,
                ui_ready_only: false
              }
            );

            if (rpcError) {
              console.error('Error calling search_languoids:', rpcError);
            }

            invalidLanguages.push({
              language: languageName,
              suggestions: suggestions || []
            });
          } catch (rpcError) {
            console.error('Error calling search_languoids:', rpcError);
            invalidLanguages.push({
              language: languageName,
              suggestions: []
            });
          }
        } else {
          validLanguages.push(languageName);
        }
      } catch (error) {
        // Se houver erro na consulta principal, também buscar sugestões
        try {
          const { data: suggestions, error: rpcError } = await supabase.rpc(
            'search_languoids',
            {
              search_query: trimmedName,
              result_limit: 5,
              ui_ready_only: false
            }
          );

          invalidLanguages.push({
            language: languageName,
            suggestions: suggestions || []
          });
        } catch (rpcError) {
          console.error('Error calling search_languoids:', rpcError);
          invalidLanguages.push({
            language: languageName,
            suggestions: []
          });
        }
      }
    }

    console.log(
      'Language validation completed. Valid:',
      validLanguages,
      'Invalid:',
      invalidLanguages
    );

    const filteredInvalidLanguages = invalidLanguages.map((il) => {
      return {
        name: il.language,
        suggestions: il.suggestions
          .map(
            (sug) =>
              sug.level === 'language' && {
                id: sug.id,
                name: sug.name
              }
          )
          .filter(Boolean)
      };
    });

    console.log(
      'Filtered Invalid Languages with Suggestions:',
      filteredInvalidLanguages
    );

    return NextResponse.json({
      validLanguages,
      invalidLanguages: filteredInvalidLanguages,
      totalChecked: languages.length,
      validCount: validLanguages.length,
      invalidCount: filteredInvalidLanguages.length
    });
  } catch (error: any) {
    console.error('Language validation error:', error);
    return NextResponse.json(
      { error: `Validation failed: ${error.message}` },
      { status: 500 }
    );
  }
}
