/**
 * OpenNext compileEnvFiles only merges `.env`, `.env.production`, `.env.local`,
 * `.env.production.local` — not `.env.preview`. For preview Worker builds, write
 * decrypted preview vars into `.env.production.local` so runtime `next-env.mjs`
 * matches preview.
 *
 * Run inside: dotenvx run -f .env.preview -- node scripts/sync-preview-env-for-opennext.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@dotenvx/dotenvx';

const previewPath = path.join(process.cwd(), '.env.preview');
const parsed = parse(fs.readFileSync(previewPath, 'utf8'));

const lines = Object.keys(parsed)
	.map((key) => {
		if (key.startsWith('DOTENV_')) return null;
		const value = process.env[key];
		if (value === undefined || value === '') return null;
		const escaped =
			value.includes('\n') || value.includes(' ') || value.includes('#')
				? JSON.stringify(value)
				: value;
		return `${key}=${escaped}`;
	})
	.filter(Boolean);

fs.writeFileSync('.env.production.local', `${lines.join('\n')}\n`);
console.log(`Wrote ${lines.length} preview vars to .env.production.local for OpenNext`);
