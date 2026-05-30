// default open-next.config.ts file created by @opennextjs/cloudflare
import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';

const dotenvFile = process.env.LANGQUEST_DOTENV_FILE ?? '.env.production';

/** OpenNext invokes this instead of `pnpm build` (see package.json `build`). */
const buildCommand = `dotenvx run -f ${dotenvFile} -f .env.local --overload --ignore=MISSING_ENV_FILE -- next build`;

export default {
	...defineCloudflareConfig({
		incrementalCache: r2IncrementalCache
	}),
	buildCommand
};
