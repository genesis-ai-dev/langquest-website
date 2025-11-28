#!/usr/bin/env node

/**
 * Simple test script for chapter export API
 * Usage: node scripts/test-export-simple.js <access_token>
 * 
 * Get access token from:
 * - Mobile app: Check network requests in dev tools
 * - Supabase dashboard: Auth → Users → Generate token
 * - Or use: system.supabaseConnector.client.auth.getSession() in mobile app console
 */

const QUEST_ID = '3412a854-6739-436c-83d2-8c3673b9a764';
const EXPORT_TYPE = 'feedback';
const ENVIRONMENT = 'production';
const SITE_URL = process.env.SITE_URL || 'http://localhost:3000';

const accessToken = process.argv[2];

if (!accessToken) {
  console.error('Usage: node scripts/test-export-simple.js <access_token>');
  console.error('');
  console.error('To get access token:');
  console.error('1. Open LangQuest mobile app');
  console.error('2. Open dev tools/console');
  console.error('3. Run: await system.supabaseConnector.client.auth.getSession()');
  console.error('4. Copy the access_token from the result');
  process.exit(1);
}

async function testExport() {
  console.log('🧪 Testing Chapter Export API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Quest ID: ${QUEST_ID}`);
  console.log(`Export Type: ${EXPORT_TYPE}`);
  console.log(`Environment: ${ENVIRONMENT}`);
  console.log(`Site URL: ${SITE_URL}`);
  console.log('');

  try {
    // Step 1: Create export
    console.log('📤 Creating export...');
    const createResponse = await fetch(`${SITE_URL}/api/export/chapter`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        quest_id: QUEST_ID,
        export_type: EXPORT_TYPE,
        environment: ENVIRONMENT
      })
    });

    const createData = await createResponse.json();

    if (!createResponse.ok) {
      console.error('❌ Failed to create export:');
      console.error(JSON.stringify(createData, null, 2));
      process.exit(1);
    }

    console.log('✅ Export created!');
    console.log(`   Export ID: ${createData.id}`);
    console.log(`   Status: ${createData.status}`);
    if (createData.share_url) {
      console.log(`   Share URL: ${createData.share_url}`);
    }
    console.log('');

    const exportId = createData.id;

    // Step 2: Poll for status updates
    console.log('⏳ Polling export status...');
    let attempts = 0;
    const maxAttempts = 30; // 60 seconds max (2s intervals)

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

      const statusResponse = await fetch(
        `${SITE_URL}/api/export/${exportId}?environment=${ENVIRONMENT}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      const statusData = await statusResponse.json();

      if (!statusResponse.ok) {
        console.error('❌ Failed to fetch status:');
        console.error(JSON.stringify(statusData, null, 2));
        break;
      }

      console.log(`   [${attempts + 1}/${maxAttempts}] Status: ${statusData.status}`);

      if (statusData.status === 'ready') {
        console.log('');
        console.log('🎉 Export completed successfully!');
        console.log(`   Audio URL: ${statusData.audio_url || 'N/A'}`);
        if (statusData.share_url) {
          console.log(`   Share URL: ${statusData.share_url}`);
        }
        break;
      } else if (statusData.status === 'failed') {
        console.log('');
        console.error('❌ Export failed!');
        console.error(`   Error: ${statusData.error_message || 'Unknown error'}`);
        break;
      }

      attempts++;
    }

    if (attempts >= maxAttempts) {
      console.log('');
      console.warn('⚠️  Timeout waiting for export to complete');
      console.log('   Check status manually or try again later');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

testExport();

