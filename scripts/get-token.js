#!/usr/bin/env node

/**
 * Helper to get Supabase access token
 * Usage: node scripts/get-token.js <email> <password>
 * 
 * This will authenticate and print your access token
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://dev.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_ANON) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_ANON_KEY not set');
  process.exit(1);
}

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error('Usage: node scripts/get-token.js <email> <password>');
  console.error('');
  console.error('This will sign in and return your access token');
  process.exit(1);
}

async function getToken() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

  console.log('🔐 Signing in...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error || !data.session) {
    console.error('❌ Failed to sign in:', error?.message);
    process.exit(1);
  }

  console.log('');
  console.log('✅ Signed in successfully!');
  console.log('');
  console.log('Your access token:');
  console.log(data.session.access_token);
  console.log('');
  console.log('To test export, run:');
  console.log(`node scripts/test-export-simple.js "${data.session.access_token}"`);
}

getToken();

