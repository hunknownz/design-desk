import { describe, expect, it } from 'vitest';
import { buildSeoUrl } from './seo-url';

describe('buildSeoUrl', () => {
  it('uses the official site origin and the proposed SEO path', () => {
    expect(buildSeoUrl('https://example.test', '/products/')).toBe('https://example.test/products/');
    expect(buildSeoUrl('https://example.test', '/')).toBe('https://example.test/');
  });

  it('normalizes a path without allowing it to replace the official origin', () => {
    expect(buildSeoUrl('https://example.test/', 'for-professionals/')).toBe('https://example.test/for-professionals/');
    expect(buildSeoUrl('https://example.test/', 'https://other.test/wrong')).toBe('https://example.test/https://other.test/wrong');
  });
});
