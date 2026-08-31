import { describe, expect, it } from 'vitest';
import { annotationDisplayNumber, annotationViewport } from './annotations';

describe('annotation viewport compatibility', () => {
  it('preserves an explicit viewport', () => {
    expect(annotationViewport({ viewport: 'tablet', viewportWidth: 1440 })).toBe('tablet');
  });

  it('migrates legacy widths into independent device views', () => {
    expect(annotationViewport({ viewportWidth: 1430 })).toBe('desktop');
    expect(annotationViewport({ viewportWidth: 820 })).toBe('tablet');
    expect(annotationViewport({ viewportWidth: 430 })).toBe('mobile');
  });
});

describe('annotation display numbers', () => {
  it('uses a persisted sequence rather than a filtered list index', () => {
    expect(annotationDisplayNumber({ id: 'a', sequence: 17 }, 1)).toBe(17);
  });

  it('keeps legacy annotations readable until the server assigns a sequence', () => {
    expect(annotationDisplayNumber({ id: 'legacy' }, 3)).toBe(3);
  });
});
