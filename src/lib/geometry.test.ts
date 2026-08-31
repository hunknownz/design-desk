import { describe, expect, it } from 'vitest';
import { clampComposer, clampMarker, normalizeSelection, markerPosition } from './geometry';

describe('annotation geometry', () => {
  it('normalizes a drag in any direction', () => {
    expect(normalizeSelection({ x: 300, y: 240 }, { x: 100, y: 80 })).toEqual({ x: 100, y: 80, w: 200, h: 160 });
  });

  it('keeps the comment composer inside the canvas', () => {
    expect(clampComposer({ x: 980, y: 700 }, { width: 1000, height: 720 }, { width: 360, height: 150 })).toEqual({ x: 624, y: 554 });
  });

  it('positions a marker from document coordinates and scroll metrics', () => {
    expect(markerPosition({ x: 0.5, y: 0.25 }, { documentWidth: 1600, documentHeight: 2400, scrollX: 100, scrollY: 300 })).toEqual({ x: 700, y: 300 });
  });

  it('keeps a marker and its selected halo inside the preview edges', () => {
    expect(clampMarker({ x: 260, y: 0 }, { width: 1200, height: 800 })).toEqual({ x: 238, y: 2 });
    expect(clampMarker({ x: 1200, y: 800 }, { width: 1200, height: 800 })).toEqual({ x: 1154, y: 754 });
  });

  it('does not move a marker that already has safe clearance', () => {
    expect(clampMarker({ x: 260, y: 120 }, { width: 1200, height: 800 })).toEqual({ x: 238, y: 98 });
  });
});
