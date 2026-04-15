import { NextResponse } from 'next/server';

/**
 * GET /api/dashboard/execution-job
 * Triggered by Vercel Cron every 5 minutes.
 */
export async function GET() {
  const now = new Date();

  console.log('================ CRON JOB START ================');
  console.log('Job: dashboard/execution-job');
  console.log(`Executing in: ${now.toISOString()}`);
  console.log(`Local Timezone: ${now.toString()}`);
  console.log('================= CRON JOB END =================');

  return NextResponse.json({
    ok: true,
    job: 'dashboard/execution-job',
    ranAt: now.toISOString()
  });
}
