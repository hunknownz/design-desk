import { FormEvent, PointerEvent, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { buildDemoUrl, isBridgeMessage } from '../lib/bridge';
import { annotationDisplayNumber, formatAnnotationNumber } from '../lib/annotations';
import { clampComposer, clampMarker, markerPosition, normalizeSelection } from '../lib/geometry';
import { annotationViewport } from '../lib/annotations';
import { calculatePreviewLayout, type PreviewLayout } from '../lib/preview-layout';
import type { Annotation, DemoMetrics, InspectedElement, LocatedTarget, PendingAnnotation, ProjectState, Viewport } from '../types';

interface Props {
  state: ProjectState;
  viewport: Viewport;
  currentPageId: string;
  annotationMode: boolean;
  selectedAnnotationId: string | null;
  focusRequest: AnnotationFocusRequest | null;
  refreshToken: number;
  onPageChange: (pageId: string) => void;
  onOpenAnnotation: (id: string) => void;
  onCreateAnnotation: (selection: PendingAnnotation, note: string) => Promise<void>;
  onCancelAnnotationMode: () => void;
}

export type AnnotationFocusRequest = { annotationId: string; sequence: number };

const emptyMetrics: DemoMetrics = { documentWidth: 1440, documentHeight: 900, viewportWidth: 1440, viewportHeight: 900, scrollX: 0, scrollY: 0 };
type ViewRect = { left: number; top: number; width: number; height: number };

export function DemoCanvas(props: Props) {
  const { state } = props;
  const canvasRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const pointerRef = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(null);
  const inspectRef = useRef(new Map<string, (value: InspectedElement | null) => void>());
  const hoverAtRef = useRef(0);
  const [metrics, setMetrics] = useState(emptyMetrics);
  const [selectionRect, setSelectionRect] = useState<ViewRect | null>(null);
  const [hoverRect, setHoverRect] = useState<ViewRect | null>(null);
  const [pending, setPending] = useState<PendingAnnotation | null>(null);
  const [targetPoints, setTargetPoints] = useState<Record<string, LocatedTarget['point']>>({});
  const [previewLayout, setPreviewLayout] = useState<PreviewLayout>({ frameWidth: 1440, frameHeight: 900, scale: 1 });

  const src = useMemo(() => buildDemoUrl(state.project.demoUrl, props.currentPageId, state.project.demoVersion), [state.project.demoUrl, state.project.demoVersion, props.currentPageId]);
  const focusedAnnotation = useMemo(() => state.annotations.find((annotation) => annotation.id === props.focusRequest?.annotationId) || null, [props.focusRequest?.annotationId, state.annotations]);
  const activeAnnotations = useMemo(() => state.annotations.filter((annotation) => annotation.status === 'open'), [state.annotations]);
  const pageAnnotations = useMemo(() => activeAnnotations.filter((annotation) => annotation.pageId === props.currentPageId && annotationViewport(annotation) === props.viewport), [activeAnnotations, props.currentPageId, props.viewport]);
  const targetIds = useMemo(() => [...new Set(pageAnnotations.map((annotation) => annotation.targetId).filter((value): value is string => Boolean(value)))], [pageAnnotations]);
  const targetIdsKey = targetIds.join('\n');
  const post = useCallback((message: object) => frameRef.current?.contentWindow?.postMessage(message, '*'), []);
  const locateTargets = useCallback(() => {
    if (targetIds.length) post({ type: 'design-desk:locate-targets', targetIds });
  }, [post, targetIds, targetIdsKey]);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow || !isBridgeMessage(event.data)) return;
      const message = event.data;
      if (message.type === 'design-desk:metrics' || message.type === 'design-desk:demo-ready') {
        setMetrics(message.metrics);
        locateTargets();
      }
      if (message.type === 'design-desk:demo-ready' && focusedAnnotation?.targetId && focusedAnnotation.pageId === props.currentPageId) {
        post({ type: 'design-desk:focus-target', targetId: focusedAnnotation.targetId });
      }
      if (message.type === 'design-desk:page-change' && state.pages.some((page) => page.id === message.pageId)) props.onPageChange(message.pageId);
      if (message.type === 'design-desk:inspect-result') {
        inspectRef.current.get(message.requestId)?.(message);
        inspectRef.current.delete(message.requestId);
      }
      if (message.type === 'design-desk:targets-result') {
        setTargetPoints(Object.fromEntries(message.targets.map((target) => [target.targetId, target.point])));
      }
    }
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [focusedAnnotation, locateTargets, post, props.currentPageId, props.onPageChange, state.pages]);

  useEffect(() => {
    if (!focusedAnnotation?.targetId || focusedAnnotation.pageId !== props.currentPageId) return;
    const timer = window.setTimeout(() => post({ type: 'design-desk:focus-target', targetId: focusedAnnotation.targetId }), 80);
    return () => window.clearTimeout(timer);
  }, [focusedAnnotation, post, props.currentPageId, props.focusRequest?.sequence, props.refreshToken]);

  useEffect(() => {
    if (!props.annotationMode) { setHoverRect(null); if (!pending) setSelectionRect(null); }
  }, [props.annotationMode, pending]);

  useEffect(() => {
    setPending(null);
    setSelectionRect(null);
    setHoverRect(null);
    setTargetPoints({});
    const timer = window.setTimeout(locateTargets, 120);
    return () => window.clearTimeout(timer);
  }, [locateTargets, props.currentPageId, props.refreshToken, props.viewport]);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const updateLayout = () => {
      const style = window.getComputedStyle(canvas);
      const horizontalPadding = Number.parseFloat(style.paddingLeft) + Number.parseFloat(style.paddingRight);
      const verticalPadding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
      const next = calculatePreviewLayout({
        viewport: props.viewport,
        windowWidth: window.innerWidth,
        canvasWidth: canvas.clientWidth,
        canvasHeight: canvas.clientHeight,
        horizontalPadding,
        verticalPadding
      });
      setPreviewLayout((current) => current.frameWidth === next.frameWidth && current.frameHeight === next.frameHeight && Math.abs(current.scale - next.scale) < .0001 ? current : next);
    };
    const observer = new ResizeObserver(updateLayout);
    observer.observe(canvas);
    window.addEventListener('resize', updateLayout);
    updateLayout();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateLayout);
    };
  }, [props.viewport]);

  function inspect(x: number, y: number): Promise<InspectedElement | null> {
    const requestId = crypto.randomUUID();
    return new Promise((resolve) => {
      inspectRef.current.set(requestId, resolve);
      post({ type: 'design-desk:inspect', requestId, x, y });
      window.setTimeout(() => { if (inspectRef.current.delete(requestId)) resolve(null); }, 1200);
    });
  }

  function localPoint(event: PointerEvent) {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = rect.width / Math.max(1, event.currentTarget.clientWidth);
    const scaleY = rect.height / Math.max(1, event.currentTarget.clientHeight);
    return { x: (event.clientX - rect.left) / scaleX, y: (event.clientY - rect.top) / scaleY };
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!props.annotationMode || pending || (event.target as HTMLElement).closest('.annotation-marker')) return;
    const point = localPoint(event);
    pointerRef.current = { id: event.pointerId, ...point, dragging: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!props.annotationMode || pending) return;
    const point = localPoint(event);
    const start = pointerRef.current;
    if (start && start.id === event.pointerId) {
      const rect = normalizeSelection(start, point);
      if (Math.hypot(rect.w, rect.h) > 7) {
        start.dragging = true;
        setSelectionRect({ left: rect.x, top: rect.y, width: rect.w, height: rect.h });
      }
      return;
    }
    if (performance.now() - hoverAtRef.current < 90) return;
    hoverAtRef.current = performance.now();
    inspect(point.x, point.y).then((value) => value && !pointerRef.current && setHoverRect(value.rect));
  }

  async function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = pointerRef.current;
    if (!start || start.id !== event.pointerId) return;
    pointerRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    const point = localPoint(event);
    const drawn = normalizeSelection(start, point);
    const area = start.dragging;
    const center = area ? { x: drawn.x + drawn.w / 2, y: drawn.y + drawn.h / 2 } : point;
    const detail = await inspect(center.x, center.y);
    const rect: ViewRect = area
      ? { left: drawn.x, top: drawn.y, width: Math.max(8, drawn.w), height: Math.max(8, drawn.h) }
      : detail?.rect || { left: Math.max(0, point.x - 20), top: Math.max(0, point.y - 20), width: 40, height: 40 };
    const location = detail?.locationLabel || '页面区域';
    setSelectionRect(rect);
    setHoverRect(null);
    setPending({
      pageId: props.currentPageId,
      x: (rect.left + metrics.scrollX) / metrics.documentWidth,
      y: (rect.top + metrics.scrollY) / metrics.documentHeight,
      w: rect.width / metrics.documentWidth,
      h: rect.height / metrics.documentHeight,
      viewportWidth: metrics.viewportWidth,
      viewport: props.viewport,
      selectionType: area ? 'area' : 'element',
      elementLabel: detail?.elementLabel || location,
      elementPath: detail?.elementPath || '',
      locationLabel: location,
      targetId: detail?.targetId || '',
      demoVersion: state.project.demoVersion,
      viewRect: rect
    });
  }

  function cancelPending() {
    setPending(null);
    setSelectionRect(null);
  }

  async function submit(selection: PendingAnnotation, note: string) {
    await props.onCreateAnnotation(selection, note);
    setPending(null);
    setSelectionRect(null);
    props.onCancelAnnotationMode();
  }

  return <main className="desk-canvas" ref={canvasRef}>
    <div
      className={`preview-shell viewport-${props.viewport}`}
      data-preview-scale={previewLayout.scale.toFixed(4)}
      style={{
        width: previewLayout.frameWidth,
        height: previewLayout.frameHeight,
        '--preview-scale': previewLayout.scale,
        '--marker-inverse-scale': 1 / Math.max(.001, previewLayout.scale)
      } as React.CSSProperties}
    >
      <div className="preview-surface" ref={surfaceRef}>
        <iframe key={props.refreshToken} ref={frameRef} className="demo-frame" src={src} title="Website review preview" />
        <div className={`annotation-layer ${props.annotationMode ? 'is-enabled' : ''}`} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={() => !pointerRef.current && setHoverRect(null)}>
          {props.annotationMode && hoverRect && !selectionRect && <Selection rect={hoverRect} element />}
          {selectionRect && <Selection rect={selectionRect} element={pending?.selectionType === 'element'} />}
          {pageAnnotations.map((annotation) => <Marker key={annotation.id} annotation={annotation} displayNumber={annotationDisplayNumber(annotation, activeAnnotations.findIndex((item) => item.id === annotation.id) + 1)} metrics={metrics} renderScale={previewLayout.scale} targetPoint={annotation.targetId ? targetPoints[annotation.targetId] : undefined} selected={props.selectedAnnotationId === annotation.id} onOpen={props.onOpenAnnotation} />)}
        </div>
        {pending && <AnnotationComposer selection={pending} surfaceRef={surfaceRef} onCancel={cancelPending} onSubmit={submit} />}
      </div>
    </div>
  </main>;
}

function Selection({ rect, element = false }: { rect: ViewRect; element?: boolean }) {
  return <div className={`selection-box ${element ? 'is-element' : ''}`} style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />;
}

function Marker({ annotation, displayNumber, metrics, renderScale, targetPoint, selected, onOpen }: { annotation: Annotation; displayNumber: number; metrics: DemoMetrics; renderScale: number; targetPoint?: LocatedTarget['point']; selected: boolean; onOpen: (id: string) => void }) {
  const point = targetPoint || markerPosition({ x: annotation.x + (annotation.w || 0), y: annotation.y }, metrics);
  if (point.x < -44 || point.y < -44 || point.x > metrics.viewportWidth + 44 || point.y > metrics.viewportHeight + 44) return null;
  const marker = clampMarker(point, { width: metrics.viewportWidth, height: metrics.viewportHeight }, 44, 2, renderScale);
  return <button className={`annotation-marker ${selected ? 'is-selected' : ''}`} style={{ left: marker.x, top: marker.y }} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onOpen(annotation.id); }} aria-label={`打开批注 ${formatAnnotationNumber(displayNumber)}`}><span className="annotation-marker-core" aria-hidden="true">{displayNumber}</span></button>;
}

function AnnotationComposer({ selection, surfaceRef, onCancel, onSubmit }: { selection: PendingAnnotation; surfaceRef: React.RefObject<HTMLDivElement | null>; onCancel: () => void; onSubmit: (selection: PendingAnnotation, note: string) => Promise<void> }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const surface = surfaceRef.current;
  const surfaceWidth = surface?.clientWidth || 1200;
  const surfaceHeight = surface?.clientHeight || 800;
  const composerWidth = Math.min(360, Math.max(280, surfaceWidth - 24));
  const below = { x: selection.viewRect.left + selection.viewRect.width / 2 - composerWidth / 2, y: selection.viewRect.top + selection.viewRect.height + 12 };
  const point = clampComposer(below, { width: surfaceWidth, height: surfaceHeight }, { width: composerWidth, height: 168 });
  async function submit(event: FormEvent) { event.preventDefault(); if (!note.trim()) return; setBusy(true); try { await onSubmit(selection, note.trim()); } finally { setBusy(false); } }
  return <form className="annotation-composer" style={{ left: point.x, top: point.y, width: composerWidth }} onSubmit={submit}>
    <header><span>{selection.selectionType === 'element' ? '已选择页面元素' : '已圈选页面区域'}</span><button type="button" onClick={onCancel}>×</button></header>
    <strong>{selection.elementLabel}</strong>
    <textarea autoFocus value={note} onChange={(event) => setNote(event.target.value)} placeholder="输入批注…" />
    <footer><button disabled={!note.trim() || busy}>{busy ? '保存中…' : '发送'}</button></footer>
  </form>;
}
