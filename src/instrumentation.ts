/**
 * Runtime decrypt for Cloudflare Workers (preview).
 * @see https://dotenvx.com/docs/secrets-in-cloudflare-workers
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import dotenvx from '@dotenvx/dotenvx';

export async function register() {
	if (process.env.NEXT_RUNTIME === 'edge') return;

	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	if (url && !url.startsWith('encrypted:')) return;

	const envPath = join(process.cwd(), '.env.preview.txt');
	let envSrc: string;
	try {
		envSrc = readFileSync(envPath, 'utf8');
	} catch {
		return;
	}

	const privateKey =
		process.env.DOTENV_PRIVATE_KEY_PREVIEW?.trim() ||
		process.env.DOTENV_PRIVATE_KEY?.trim();
	if (!privateKey) return;

	const keyName = process.env.DOTENV_PRIVATE_KEY_PREVIEW
		? 'DOTENV_PRIVATE_KEY_PREVIEW'
		: 'DOTENV_PRIVATE_KEY';

	dotenvx.config({
		envs: [{ type: 'env', value: envSrc, privateKeyName: keyName }]
	});
}
