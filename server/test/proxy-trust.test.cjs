const assert = require('node:assert/strict');
const test = require('node:test');
const proxyaddr = require('proxy-addr');

test('IPv4-mapped IPv6 trust prefixes never trust an unrelated IPv4 client', () => {
  // A short mapped prefix previously trusted every IPv4 address (GHSA-jqcg-44mw-7w3h).
  assert.equal(proxyaddr.compile('::ffff:10.0.0.0/8')('203.0.113.9'), false);
  for (const subnet of ['10.0.0.0/8', '::ffff:10.0.0.0/104']) {
    const trust = proxyaddr.compile(subnet);
    assert.equal(trust('10.1.2.3'), true);
    assert.equal(trust('203.0.113.9'), false);
  }
});
