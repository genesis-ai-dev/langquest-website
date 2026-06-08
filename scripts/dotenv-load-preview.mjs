/**
 * Load decrypted preview env from committed `.env.preview.txt` (dotenvx encrypted).
 * @see https://dotenvx.com/docs/secrets-in-cloudflare-workers
 */
import { existsSync, readFileSync } from 'node:fs';

import dotenvx from '@dotenvx/dotenvx';

export const PREVIEW_ENV_TXT = '.env.preview.txt';

const PRIVATE_KEY_NAMES = ['DOTENV_PRIVATE_KEY_PREVIEW', 'DOTENV_PRIVATE_KEY'];

/** Accept `DOTENV_PRIVATE_KEY` (Workers doc) and `DOTENV_PRIVATE_KEY_PREVIEW` (.env.keys). */
export function normalizeDotenvPrivateKeys() {
	for (const name of PRIVATE_KEY_NAMES) {
		const raw = process.env[name]?.trim();
		if (!raw) continue;
		const prefixed = raw.match(new RegExp(`^${name}=(.+)$`));
		const key = (prefixed ? prefixed[1] : raw).replace(/^["']|["']$/g, '').trim();
		if (key) process.env[name] = key;
	}

	if (!process.env.DOTENV_PRIVATE_KEY_PREVIEW && process.env.DOTENV_PRIVATE_KEY) {
		process.env.DOTENV_PRIVATE_KEY_PREVIEW = process.env.DOTENV_PRIVATE_KEY;
	}
	if (!process.env.DOTENV_PRIVATE_KEY && process.env.DOTENV_PRIVATE_KEY_PREVIEW) {
		process.env.DOTENV_PRIVATE_KEY = process.env.DOTENV_PRIVATE_KEY_PREVIEW;
	}

	if (existsSync('.env.keys')) {
		for (const line of readFileSync('.env.keys', 'utf8').split('\n')) {
			const match = line.match(/^DOTENV_PRIVATE_KEY_PREVIEW=(.+)$/);
			if (match?.[1]) {
				process.env.DOTENV_PRIVATE_KEY_PREVIEW = match[1].trim();
				process.env.DOTENV_PRIVATE_KEY ??= match[1].trim();
			}
		}
	}
}

export function previewEnvIsDecrypted() {
	const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
	return Boolean(url && !url.startsWith('encrypted:'));
}

/**
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function loadPreviewEnvFromTxt() {
	if (!existsSync(PREVIEW_ENV_TXT)) {
		return { ok: false, reason: `missing ${PREVIEW_ENV_TXT}` };
	}

	normalizeDotenvPrivateKeys();

	if (!process.env.DOTENV_PRIVATE_KEY_PREVIEW) {
		return { ok: false, reason: 'no private key (set DOTENV_PRIVATE_KEY on the Worker)' };
	}

	const envSrc = readFileSync(PREVIEW_ENV_TXT, 'utf8');
	const result = dotenvx.config({
		envs: [
			{
				type: 'env',
				value: envSrc,
				privateKeyName: 'DOTENV_PRIVATE_KEY_PREVIEW'
			}
		]
	});

	if (result.parsed) {
		Object.assign(process.env, result.parsed);
	}

	if (!previewEnvIsDecrypted()) {
		return { ok: false, reason: result.error?.message ?? 'decrypt failed' };
	}

	return { ok: true };
}
