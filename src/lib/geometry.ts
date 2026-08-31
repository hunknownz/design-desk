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
  margin = 2
): Point {
  const half = size / 2;
  return {
    x: Math.max(margin, Math.min(center.x - half, viewport.width - size - margin)),
    y: Math.max(margin, Math.min(center.y - half, viewport.height - size - margin))
  };
}
