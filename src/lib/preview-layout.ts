import type { Viewport } from '../types';

type PreviewLayoutInput = {
  viewport: Viewport;
  windowWidth: number;
  canvasWidth: number;
  canvasHeight: number;
  horizontalPadding: number;
  verticalPadding: number;
};

export type PreviewLayout = {
  frameWidth: number;
  frameHeight: number;
  scale: number;
};

const viewportMaximums: Record<Viewport, number> = {
  desktop: Number.POSITIVE_INFINITY,
  tablet: 820,
  mobile: 430
};

export function calculatePreviewLayout(input: PreviewLayoutInput): PreviewLayout {
  const fullCanvasWidth = Math.max(1, input.windowWidth - input.horizontalPadding);
  const availableWidth = Math.max(1, input.canvasWidth - input.horizontalPadding);
  const frameWidth = Math.max(1, Math.min(fullCanvasWidth, viewportMaximums[input.viewport]));
  const frameHeight = Math.max(1, input.canvasHeight - input.verticalPadding);
  const scale = Math.min(1, availableWidth / frameWidth);

  return { frameWidth, frameHeight, scale };
}
