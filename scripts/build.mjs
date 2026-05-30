/**
 * Local: `next build` (use dotenvx via `pnpm dev` / `deploy:preview`).
 * Cloudflare Workers Builds: decrypt `.env.preview.txt`, then OpenNext build.
 */
import { execSync } from 'node:child_process';

import {
	loadPreviewEnvFromTxt,
	normalizeDotenvPrivateKeys,
	previewEnvIsDecrypted
} from './dotenv-load-preview.mjs';

const OPENNEXT_PREVIEW_BUILD =
	"node scripts/sync-preview-env-for-opennext.mjs && opennextjs-cloudflare build";

/** Cloudflare Workers Builds runs in /opt/buildhome/repo */
const inCloudflareBuild =
	process.env.WORKERS_CI === '1' || process.cwd().includes('buildhome');

const runOpenNextPreviewBuild = () => {
	process.env.LANGQUEST_DOTENV_FILE = '.env.preview.txt';
	execSync(OPENNEXT_PREVIEW_BUILD, { stdio: 'inherit', env: process.env });
};

const printCloudflareBuildHelp = (detail) => {
	const dotenvVars = Object.keys(process.env).filter((k) => k.includes('DOTENV'));
	const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
	const supabaseStatus = !supabaseUrl
		? 'missing'
		: supabaseUrl.startsWith('encrypted:')
			? 'still encrypted'
			: 'ok';

	console.error(
		`\n[build] Could not decrypt .env.preview.txt (${detail}).\n\n` +
			'Next.js needs decrypted env at **build** time (NEXT_PUBLIC_* inlining). OpenNext docs:\n' +
			'https://opennext.js.org/cloudflare/howtos/env-vars\n\n' +
			'On **langquest-website-preview**, set the same key in BOTH places:\n' +
			'  1. Settings → Variables and Secrets → `DOTENV_PRIVATE_KEY` (runtime, dotenvx Workers pattern)\n' +
			'  2. Settings → Builds → Variables and secrets → `DOTENV_PRIVATE_KEY` (build step)\n\n' +
			'Value: hex from local `.env.keys` (`DOTENV_PRIVATE_KEY_PREVIEW=...`).\n' +
			'Runtime-only secrets are invisible to `pnpm run build` — that is why the key can be\n' +
			'"there" in the dashboard but this log still shows no DOTENV_* in the build env.\n\n' +
			`Diagnostics: branch=${process.env.WORKERS_CI_BRANCH ?? '(unset)'}, ` +
			`WORKERS_CI=${process.env.WORKERS_CI ?? '(unset)'}, ` +
			`DOTENV_* in build env: ${dotenvVars.length ? dotenvVars.join(', ') : '(none)'}, ` +
			`NEXT_PUBLIC_SUPABASE_URL=${supabaseStatus}\n`
	);
};

if (inCloudflareBuild) {
	normalizeDotenvPrivateKeys();
	const loaded = loadPreviewEnvFromTxt();

	if (loaded.ok) {
		runOpenNextPreviewBuild();
	} else if (previewEnvIsDecrypted()) {
		runOpenNextPreviewBuild();
	} else {
		printCloudflareBuildHelp(loaded.reason);
		process.exit(1);
	}
} else {
	execSync('next build', { stdio: 'inherit', env: process.env });
}
