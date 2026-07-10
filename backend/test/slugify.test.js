import assert from 'node:assert/strict';
import test from 'node:test';
import { slugify } from '../src/utils/slugify.js';

test('slugify creates a URL-safe team slug', () => {
  assert.equal(slugify('  São Paulo United FC  '), 'sao-paulo-united-fc');
});

test('slugify removes punctuation and repeated separators', () => {
  assert.equal(slugify("St. Joseph's & Academy"), 'st-joseph-s-academy');
});
