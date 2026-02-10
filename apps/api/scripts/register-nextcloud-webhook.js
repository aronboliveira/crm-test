#!/usr/bin/env node
const fetch = require('node-fetch');

const regUrl = process.env.NEXTCLOUD_REG_URL;
const user = process.env.NEXTCLOUD_USER;
const pass = process.env.NEXTCLOUD_PASS;
const target = process.env.WEBHOOK_TARGET;
const events = (
  process.env.WEBHOOK_EVENTS || 'file_created,file_deleted'
).split(',');

if (!regUrl || !user || !pass || !target) {
  console.error(
    'Missing required env vars: NEXTCLOUD_REG_URL, NEXTCLOUD_USER, NEXTCLOUD_PASS, WEBHOOK_TARGET',
  );
  process.exit(1);
}

async function register() {
  const body = {
    url: target,
    events,
    secret: process.env.NEXTCLOUD_WEBHOOK_SECRET || undefined,
  };

  const res = await fetch(regUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'OCS-APIRequest': 'true',
      Authorization: `Basic ${Buffer.from(`${user}:${pass}`).toString('base64')}`,
    },
    body: JSON.stringify(body),
    redirect: 'follow',
  });

  if (!res.ok) {
    console.error('Failed to register webhook', res.status, await res.text());
    process.exit(2);
  }

  console.log('Webhook registration response:', await res.text());
}

register().catch((err) => {
  console.error('Error registering webhook:', err);
  process.exit(3);
});
