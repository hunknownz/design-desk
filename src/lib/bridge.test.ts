import { describe, expect, it } from 'vitest';
import { buildDemoUrl, isBridgeMessage, pageIdFromDemoUrl } from './bridge';

describe('Review Bridge', () => {
  it('sets the current page without coupling to the demo DOM', () => {
    expect(buildDemoUrl('/demo/', 'products', 'ia-v2')).toBe('/demo/?page=products&reviewVersion=ia-v2');
    expect(buildDemoUrl('https://demo.example.com/', 'home', 'v3')).toBe('https://demo.example.com/?page=home&reviewVersion=v3');
  });

  it('reads page changes from the demo URL', () => {
    expect(pageIdFromDemoUrl('https://demo.test/demo/?page=showroom')).toBe('showroom');
    expect(pageIdFromDemoUrl('/demo/')).toBe('home');
  });

  it('accepts only namespaced bridge messages', () => {
    expect(isBridgeMessage({ type: 'design-desk:demo-ready', pageId: 'home' })).toBe(true);
    expect(isBridgeMessage({ type: 'focus-target' })).toBe(false);
    expect(isBridgeMessage(null)).toBe(false);
  });
});
