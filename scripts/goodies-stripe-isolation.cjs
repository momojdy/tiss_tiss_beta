const assert = require('node:assert/strict');

// Stripe delivers to Dashboard webhooks as well as the local CLI listener.
// Isolated financial tests therefore require a sandbox with no enabled endpoint.
exports.verifySandboxWebhookIsolation = async function (stripe) {
  let startingAfter;
  let inspected = 0;
  for (;;) {
    const { data: page } = await stripe('GET', '/v1/webhook_endpoints', {
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    assert.ok(Array.isArray(page.data), 'Cannot establish sandbox webhook isolation.');
    assert.equal(typeof page.has_more, 'boolean', 'Cannot establish sandbox webhook isolation.');
    for (const endpoint of page.data) {
      assert.equal(endpoint.livemode, false, 'Refuse a live webhook endpoint.');
      assert.equal(endpoint.status, 'disabled',
        'Isolated Goodies payment tests require a separate Stripe sandbox with no enabled Dashboard webhook endpoints. No financial test has started.');
      inspected++;
    }
    if (!page.has_more) return { classification: 'PASS', inspectedEndpoints: inspected, enabledEndpoints: 0 };
    const next = page.data.at(-1)?.id;
    assert.match(next || '', /^we_[A-Za-z0-9]+$/, 'Sandbox webhook pagination did not advance.');
    assert.notEqual(next, startingAfter, 'Sandbox webhook pagination did not advance.');
    startingAfter = next;
  }
};
