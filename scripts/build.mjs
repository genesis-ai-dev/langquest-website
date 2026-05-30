/**
 * Local: `next build` (use dotenvx locally, e.g. via deploy:preview).
 * Cloudflare Workers Builds: OpenNext build with decrypted preview env.
 */
import { execSync } from 'node:child_process';

const dotenvxRun = (envFile, cmd) => {
	const langquest =
		envFile === '.env.preview'
			? 'LANGQUEST_DOTENV_FILE=.env.preview '
			: 'LANGQUEST_DOTENV_FILE=.env.production ';
	execSync(
		`${langquest}dotenvx run -f ${envFile} -f .env.local --overload --ignore=MISSING_ENV_FILE -- ${cmd}`,
		{ stdio: 'inherit', env: process.env }
	);
};

/** Cloudflare Workers Builds runs in /opt/buildhome/repo */
const inCloudflareBuild =
	process.env.WORKERS_CI === '1' || process.cwd().includes('buildhome');

if (inCloudflareBuild) {
	const hasPreviewKey = Boolean(process.env.DOTENV_PRIVATE_KEY_PREVIEW);
	const hasProductionKey = Boolean(process.env.DOTENV_PRIVATE_KEY_PRODUCTION);

	if (!hasPreviewKey && !hasProductionKey) {
		console.error(
			'\n[build] Cloudflare build detected but no dotenvx private key is set.\n' +
				'In Workers → Settings → Builds → Variables and secrets, add:\n' +
				'  Name:  DOTENV_PRIVATE_KEY_PREVIEW\n' +
				'  Value: (copy from your local .env.keys file)\n' +
				'Do not leave DOTENV_PRIVATE_KEY_PRODUCTION empty on the preview worker.\n'
		);
		process.exit(1);
	}

	if (hasPreviewKey) {
		dotenvxRun(
			'.env.preview',
			`bash -c 'node scripts/sync-preview-env-for-opennext.mjs && opennextjs-cloudflare build'`
		);
	} else {
		dotenvxRun('.env.production', 'opennextjs-cloudflare build');
	}
} else {
	execSync('next build', { stdio: 'inherit', env: process.env });
}
