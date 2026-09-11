import type { DemoMetrics } from '../types';

export interface Point { x: number; y: number }
export interface Selection { x: number; y: number; w: number; h: number }

export function normalizeSelection(start: Point, end: Point): Selection {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    w: Math.abs(end.x - start.x),
    h: Math.abs(end.y - start.y)
  };
}

export function clampComposer(
  point: Point,
  canvas: { width: number; height: number },
  composer: { width: number; height: number },
  margin = 16
): Point {
  return {
    x: Math.max(margin, Math.min(point.x, canvas.width - composer.width - margin)),
    y: Math.max(margin, Math.min(point.y, canvas.height - composer.height - margin))
  };
}

export function markerPosition(
  annotation: Pick<Point, 'x' | 'y'>,
  metrics: Pick<DemoMetrics, 'documentWidth' | 'documentHeight' | 'scrollX' | 'scrollY'>
): Point {
  return {
    x: annotation.x * metrics.documentWidth - metrics.scrollX,
    y: annotation.y * metrics.documentHeight - metrics.scrollY
  };
}

export function clampMarker(
  center: Point,
  viewport: { width: number; height: number },
  size = 44,
  margin = 2,
  renderScale = 1
): Point {
  const half = size / 2;
  const safeScale = Number.isFinite(renderScale) && renderScale > 0 ? renderScale : 1;
  const visibleHalf = half / safeScale;
  const visibleMargin = margin / safeScale;
  const minimumCenter = visibleHalf + visibleMargin;
  const maximumX = Math.max(minimumCenter, viewport.width - minimumCenter);
  const maximumY = Math.max(minimumCenter, viewport.height - minimumCenter);
  return {
    x: Math.max(minimumCenter, Math.min(center.x, maximumX)) - half,
    y: Math.max(minimumCenter, Math.min(center.y, maximumY)) - half
  };
}
