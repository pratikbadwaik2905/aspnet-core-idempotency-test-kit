import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = new URL(process.env.BASE_URL ?? 'https://localhost:7045');
const key = process.env.DEMO_KEY;
if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname) ||
    !['https:', 'http:'].includes(base.protocol) || base.username || base.password) {
  throw new Error('Use a local, disposable API instance.');
}
if (!key) throw new Error('Set DEMO_KEY for the local tutorial fixture.');

const endpoint = new URL('/api/orders', base);
const id = randomUUID();
const makeOrder = (quantity, idempotencyKey) => {
  const headers = { 'Content-Type': 'application/json', 'X-Demo-Key': key };
  if (idempotencyKey) headers['Idempotency-Key'] = '"' + idempotencyKey + '"';
  return fetch(endpoint, {
    method: 'POST', headers, body: JSON.stringify({ sku: 'KB-01', quantity }),
    redirect: 'error', signal: AbortSignal.timeout(10000)
  });
};

const missing = await makeOrder(2);
assert.equal(missing.status, 400, 'Missing key must be rejected');
await missing.body?.cancel();

const first = await makeOrder(2, id);
assert.equal(first.status, 201, 'Initial request must create the order');
const location = first.headers.get('location');
assert.ok(location, 'Created order must return a Location');
const body = await first.text();
assert.ok(JSON.parse(body).id, 'Created order must return an ID');

const replay = await makeOrder(2, id);
assert.equal(replay.status, 201, 'Retry must replay the creation status');
assert.equal(replay.headers.get('idempotency-replayed'), 'true');
assert.equal(replay.headers.get('location'), location);
assert.equal(await replay.text(), body, 'Retry must return the saved response body');

const mismatch = await makeOrder(3, id);
assert.equal(mismatch.status, 422, 'Changing quantity under the same key must fail');
await mismatch.body?.cancel();

console.log('Passed: missing key, initial creation, exact replay, and payload conflict.');
