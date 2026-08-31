import { describe, expect, it } from 'vitest';
import { calculatePreviewLayout } from './preview-layout';

describe('calculatePreviewLayout', () => {
  it('keeps the desktop iframe width stable and only scales its presentation when the review dock opens', () => {
    const closed = calculatePreviewLayout({
      viewport: 'desktop',
      windowWidth: 1280,
      canvasWidth: 1280,
      canvasHeight: 594,
      horizontalPadding: 36,
      verticalPadding: 36
    });
    const docked = calculatePreviewLayout({
      viewport: 'desktop',
      windowWidth: 1280,
      canvasWidth: 860,
      canvasHeight: 594,
      horizontalPadding: 36,
      verticalPadding: 36
    });

    expect(closed.frameWidth).toBe(1244);
    expect(docked.frameWidth).toBe(closed.frameWidth);
    expect(closed.scale).toBe(1);
    expect(docked.scale).toBeCloseTo(824 / 1244, 4);
  });

  it('does not scale up tablet previews when the dock still leaves enough room', () => {
    const layout = calculatePreviewLayout({
      viewport: 'tablet',
      windowWidth: 1440,
      canvasWidth: 900,
      canvasHeight: 700,
      horizontalPadding: 36,
      verticalPadding: 36
    });

    expect(layout.frameWidth).toBe(820);
    expect(layout.scale).toBe(1);
  });

  it('keeps the mobile preview at full available width when the drawer overlays it', () => {
    const layout = calculatePreviewLayout({
      viewport: 'mobile',
      windowWidth: 390,
      canvasWidth: 390,
      canvasHeight: 718,
      horizontalPadding: 20,
      verticalPadding: 20
    });

    expect(layout).toEqual({ frameWidth: 370, frameHeight: 698, scale: 1 });
  });
});
