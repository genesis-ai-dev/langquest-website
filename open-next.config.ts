// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';

const dotenvFile = process.env.LANGQUEST_DOTENV_FILE ?? '.env.production';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const envAlreadyDecrypted = Boolean(
	supabaseUrl && !supabaseUrl.startsWith('encrypted:')
);

/** OpenNext invokes this instead of `pnpm build` when it runs an inner next build. */
const buildCommand = envAlreadyDecrypted
	? 'next build'
	: `dotenvx run -f ${dotenvFile} -f .env.preview.txt -f .env.local --overload --ignore=MISSING_ENV_FILE -- next build`;

export default {
	...defineCloudflareConfig({
		incrementalCache: r2IncrementalCache
	}),
	buildCommand
};
