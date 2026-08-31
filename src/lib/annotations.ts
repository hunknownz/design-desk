import type { Annotation, Viewport } from '../types';

export function annotationViewport(annotation: Pick<Annotation, 'viewport' | 'viewportWidth'>): Viewport {
  if (annotation.viewport === 'desktop' || annotation.viewport === 'tablet' || annotation.viewport === 'mobile') return annotation.viewport;
  if (annotation.viewportWidth >= 1001) return 'desktop';
  if (annotation.viewportWidth >= 601) return 'tablet';
  return 'mobile';
}

export function annotationDisplayNumber(annotation: Pick<Annotation, 'id' | 'sequence'>, fallback: number): number {
  const sequence = Number(annotation.sequence);
  return Number.isInteger(sequence) && sequence > 0 ? sequence : fallback;
}

export function formatAnnotationNumber(value: number): string {
  return `#${String(value).padStart(3, '0')}`;
}
