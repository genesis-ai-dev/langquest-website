/**
 * Local: `next build` (use dotenvx locally, e.g. via deploy:preview).
 * Cloudflare Workers Builds (WORKERS_CI=1): OpenNext build with decrypted env.
 */
import { execSync } from 'node:child_process';

const dotenvxRun = (envFile, cmd) => {
	const langquest = envFile === '.env.preview' ? 'LANGQUEST_DOTENV_FILE=.env.preview ' : 'LANGQUEST_DOTENV_FILE=.env.production ';
	execSync(
		`${langquest}dotenvx run -f ${envFile} -f .env.local --overload --ignore=MISSING_ENV_FILE -- ${cmd}`,
		{ stdio: 'inherit', env: process.env }
	);
};

const inWorkersCi = process.env.WORKERS_CI === '1';

if (inWorkersCi && process.env.DOTENV_PRIVATE_KEY_PREVIEW) {
	dotenvxRun('.env.preview', `bash -c 'node scripts/sync-preview-env-for-opennext.mjs && opennextjs-cloudflare build'`);
} else if (inWorkersCi && process.env.DOTENV_PRIVATE_KEY_PRODUCTION) {
	dotenvxRun('.env.production', 'opennextjs-cloudflare build');
} else {
	execSync('next build', { stdio: 'inherit', env: process.env });
}
