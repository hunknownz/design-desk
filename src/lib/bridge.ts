import type { DemoMetrics, InspectedElement, LocatedTarget } from '../types';

export type BridgeMessage =
  | { type: 'design-desk:demo-ready'; pageId: string; version: string; metrics: DemoMetrics }
  | { type: 'design-desk:page-change'; pageId: string }
  | { type: 'design-desk:metrics'; metrics: DemoMetrics }
  | { type: 'design-desk:targets-result'; targets: LocatedTarget[] }
  | ({ type: 'design-desk:inspect-result' } & InspectedElement);

export function buildDemoUrl(base: string, pageId: string, version: string): string {
  const url = new URL(base, 'https://design-desk.local');
  url.searchParams.set('page', pageId);
  url.searchParams.set('reviewVersion', version);
  return base.startsWith('http') ? url.toString() : `${url.pathname}${url.search}`;
}

export function pageIdFromDemoUrl(value: string): string {
  try {
    return new URL(value, 'https://design-desk.local').searchParams.get('page') || 'home';
  } catch {
    return 'home';
  }
}

export function isBridgeMessage(value: unknown): value is BridgeMessage {
  return Boolean(value && typeof value === 'object' && 'type' in value && typeof value.type === 'string' && value.type.startsWith('design-desk:'));
}
