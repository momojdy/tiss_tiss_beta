const { test } = require('node:test');
const assert = require('node:assert/strict');
const { verifySandboxWebhookIsolation } = require('../scripts/goodies-stripe-isolation.cjs');

function provider(pages) {
  const calls = [];
  return { calls, read: async (method, path, params) => {
    calls.push({ method, path, params });
    assert.equal(method, 'GET', 'Preflight must never write to Stripe.');
    assert.equal(path, '/v1/webhook_endpoints');
    assert.ok(pages.length, 'No unexpected provider request.');
    return { data: pages.shift() };
  } };
}

test('isolated Stripe acceptance permits a sandbox without Dashboard webhook forwarding', async () => {
  const p = provider([{ data: [], has_more: false }]);
  assert.deepEqual(await verifySandboxWebhookIsolation(p.read), { classification: 'PASS', inspectedEndpoints: 0, enabledEndpoints: 0 });
  assert.equal(p.calls.length, 1);
});

test('an enabled hosted webhook blocks financial acceptance before any provider write', async () => {
  const p = provider([{ data: [{ id: 'we_hosted', livemode: false, status: 'enabled', url: 'https://production.invalid/webhook' }], has_more: false }]);
  await assert.rejects(() => verifySandboxWebhookIsolation(p.read), /no enabled Dashboard webhook endpoints/);
  assert.equal(p.calls.length, 1);
});

test('webhook isolation checks later pages instead of trusting a disabled first page', async () => {
  const p = provider([
    { data: [{ id: 'we_disabled', livemode: false, status: 'disabled' }], has_more: true },
    { data: [{ id: 'we_hosted', livemode: false, status: 'enabled' }], has_more: false },
  ]);
  await assert.rejects(() => verifySandboxWebhookIsolation(p.read), /no enabled Dashboard webhook endpoints/);
  assert.equal(p.calls[1].params.starting_after, 'we_disabled');
});

test('unknown/live webhook state and nonadvancing pagination fail closed', async () => {
  for (const page of [
    { data: [{ id: 'we_live', livemode: true, status: 'disabled' }], has_more: false },
    { data: [{ id: 'we_unknown', livemode: false, status: 'unknown' }], has_more: false },
    { data: [], has_more: true },
    { data: [], has_more: 'unknown' },
  ]) {
    const p = provider([page]);
    await assert.rejects(() => verifySandboxWebhookIsolation(p.read));
    assert.equal(p.calls.length, 1);
  }
});
