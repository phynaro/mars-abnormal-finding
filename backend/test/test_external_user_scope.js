/**
 * Middleware checks for internal vs external users. No database required.
 * Usage: node backend/test/test_external_user_scope.js
 */

const assert = require('assert');
const {
  resolveUserKind,
  isExternalUser,
  requireInternalUser,
} = require('../src/middleware/auth');

function mockRes() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

assert.strictEqual(resolveUserKind(null), 'internal');
assert.strictEqual(resolveUserKind(undefined), 'internal');
assert.strictEqual(resolveUserKind('internal'), 'internal');
assert.strictEqual(resolveUserKind('EXTERNAL'), 'external');

assert.strictEqual(isExternalUser({ userKind: 'external' }), true);
assert.strictEqual(isExternalUser({ userKind: 'internal' }), false);
assert.strictEqual(isExternalUser({ isApiToken: true, userKind: 'external' }), false);

let nextCalled = false;
const internalRes = mockRes();
requireInternalUser({ user: { userKind: 'internal' } }, internalRes, () => {
  nextCalled = true;
});
assert.strictEqual(nextCalled, true);
assert.strictEqual(internalRes.statusCode, 200);

const tokenRes = mockRes();
let tokenNext = false;
requireInternalUser({ user: { isApiToken: true } }, tokenRes, () => {
  tokenNext = true;
});
assert.strictEqual(tokenNext, true);

const externalRes = mockRes();
let externalNext = false;
requireInternalUser({ user: { userKind: 'external' } }, externalRes, () => {
  externalNext = true;
});
assert.strictEqual(externalNext, false);
assert.strictEqual(externalRes.statusCode, 403);
assert.strictEqual(externalRes.body.success, false);

const missingRes = mockRes();
requireInternalUser({}, missingRes, () => {
  throw new Error('should not continue');
});
assert.strictEqual(missingRes.statusCode, 401);

console.log('external user scope middleware checks passed');
