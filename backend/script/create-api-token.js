#!/usr/bin/env node
/**
 * Create a read-only service API token for 3rd-party integrations.
 * Uses the same API as the admin UI (POST /api/api-tokens) so all rules match.
 *
 * Usage:
 *   node script/create-api-token.js [tokenName]
 *
 * Environment:
 *   API_URL    - Base API URL (e.g. http://localhost:3001/api). Default: https://pch.trazor.cloud/api
 *   AUTH_TOKEN - Admin JWT (Bearer token). If not set, the script logs in with username/password.
 *   TOKEN_NAME - Name/label for the token (optional; can also be passed as the first arg or prompted).
 *   EXPIRES_AT - Optional expiry date (e.g. 2027-01-01). Empty = never expires.
 *
 * The plaintext token is printed ONCE on success and is never retrievable again.
 */

const readline = require('readline');

const API_URL = process.env.API_URL || 'https://pch.trazor.cloud/api';

function createInterface() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function ask(rl, question) {
  return new Promise((resolve) => rl.question(question, (answer) => resolve((answer || '').trim())));
}

async function loginAndGetToken() {
  const rl = createInterface();
  try {
    console.log('No AUTH_TOKEN provided. Logging in via /auth/login...');
    const username = await ask(rl, 'Admin username: ');
    const password = await ask(rl, 'Admin password: ');

    const loginUrl = `${API_URL.replace(/\/$/, '')}/auth/login`;
    const res = await fetch(loginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success || !body.token) {
      throw new Error(body.message || body.error || `Login failed (HTTP ${res.status})`);
    }

    console.log(`Login successful as ${body.user?.username || username}.`);
    return body.token;
  } finally {
    rl.close();
  }
}

async function createApiToken(payload, token) {
  const url = `${API_URL.replace(/\/$/, '')}/api-tokens`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.message || body.error || `HTTP ${res.status}`);
  }
  return body.data;
}

async function main() {
  let token = process.env.AUTH_TOKEN || process.env.TOKEN || '';
  if (!token) {
    try {
      token = await loginAndGetToken();
    } catch (err) {
      console.error(`Failed to log in and obtain token: ${err.message}`);
      process.exit(1);
    }
  }

  // Token name: CLI arg > env var > prompt.
  let name = (process.argv[2] || process.env.TOKEN_NAME || '').trim();
  let expiresAt = (process.env.EXPIRES_AT || '').trim();

  if (!name || !process.env.EXPIRES_AT) {
    const rl = createInterface();
    try {
      if (!name) {
        name = await ask(rl, 'Token name (e.g. "SCADA integration"): ');
      }
      if (process.env.EXPIRES_AT === undefined) {
        expiresAt = await ask(rl, 'Expiry date (YYYY-MM-DD, blank = never): ');
      }
    } finally {
      rl.close();
    }
  }

  if (!name) {
    console.error('A token name is required.');
    process.exit(1);
  }

  const payload = { name };
  if (expiresAt) payload.expiresAt = expiresAt;

  console.log(`\nAPI: ${API_URL}`);
  console.log(`Creating read-only API token "${name}"${expiresAt ? ` (expires ${expiresAt})` : ' (never expires)'}...`);

  try {
    const data = await createApiToken(payload, token);
    console.log('\n✅ API token created successfully.');
    console.log('----------------------------------------------------------------');
    console.log(`  id:        ${data.id}`);
    console.log(`  name:      ${data.name}`);
    console.log(`  scope:     ${data.scope}`);
    console.log(`  createdAt: ${data.createdAt}`);
    console.log(`  expiresAt: ${data.expiresAt || 'never'}`);
    console.log('----------------------------------------------------------------');
    console.log('  TOKEN (copy now — it will NOT be shown again):');
    console.log(`\n  ${data.token}\n`);
    console.log('  Use it as:  Authorization: Bearer ' + data.token);
    console.log('----------------------------------------------------------------');
  } catch (err) {
    console.error(`\nFailed to create API token: ${err.message}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
