import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from './api';
import { BrowserBar } from './components/BrowserBar';
import { DemoCanvas } from './components/DemoCanvas';
import { LoginScreen } from './components/LoginScreen';
import { ReviewDrawer } from './components/ReviewDrawer';
import { TopBar } from './components/TopBar';
import { buildSeoUrl } from './lib/seo-url';
import { annotationViewport } from './lib/annotations';
import type { AnnotationStatus, PendingAnnotation, ProjectState, Viewport } from './types';

type UndoStatus = { id: string; status: AnnotationStatus };
type ToastState = { message: string; undo?: UndoStatus };

export default function App() {
  const [user, setUser] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [state, setState] = useState<ProjectState | null>(null);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [currentPageId, setCurrentPageId] = useState('home');
  const [annotationMode, setAnnotationMode] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const [, setHistoryRevision] = useState(0);
  const pageHistory = useRef(['home']);
  const pageHistoryIndex = useRef(0);
  const toastTimer = useRef<number | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const loadState = useCallback(async () => setState(await api.state()), []);
  const notify = useCallback((message: string, undo?: UndoStatus) => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast({ message, undo });
    toastTimer.current = window.setTimeout(() => setToast(null), undo ? 4800 : 2400);
  }, []);

  useEffect(() => () => {
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    api.session().then(async (session) => {
      if (session.authenticated && session.user) { setUser(session.user); await loadState(); }
    }).finally(() => setChecking(false));
  }, [loadState]);

  useEffect(() => {
    if (!user || !state) return;
    const events = new EventSource('/api/events');
    events.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'state-changed' && message.revision !== state.revision) loadState().catch(() => undefined);
    };
    return () => events.close();
  }, [loadState, state, user]);

  async function login(name: string, code: string) {
    const result = await api.login(name, code);
    setUser(result.user);
    await loadState();
  }

  async function logout() {
    await api.logout().catch(() => undefined);
    setUser(null);
    setState(null);
  }

  function navigateTo(pageId: string) {
    if (pageId === currentPageId) return;
    const next = pageHistory.current.slice(0, pageHistoryIndex.current + 1);
    next.push(pageId);
    pageHistory.current = next;
    pageHistoryIndex.current = next.length - 1;
    setHistoryRevision((value) => value + 1);
    setCurrentPageId(pageId);
  }

  function navigateHistory(direction: -1 | 1) {
    const nextIndex = pageHistoryIndex.current + direction;
    if (nextIndex < 0 || nextIndex >= pageHistory.current.length) return;
    pageHistoryIndex.current = nextIndex;
    setHistoryRevision((value) => value + 1);
    setAnnotationMode(false);
    setCurrentPageId(pageHistory.current[nextIndex]);
  }

  function openAnnotation(id: string) {
    const annotation = state?.annotations.find((item) => item.id === id);
    if (!annotation) return;
    setViewport(annotationViewport(annotation));
    setSelectedAnnotationId(id);
    navigateTo(annotation.pageId);
    setDrawerOpen(true);
  }

  async function createAnnotation(selection: PendingAnnotation, note: string) {
    const created = await api.createAnnotation(selection, note);
    setSelectedAnnotationId(created.id);
    await loadState();
    setDrawerOpen(true);
    notify('批注已保存并同步');
  }

  async function changeAnnotationStatus(id: string, status: AnnotationStatus) {
    const annotation = state?.annotations.find((item) => item.id === id);
    if (!annotation) return;
    const previousStatus = annotation.status;
    await api.updateAnnotation(id, { status });
    await loadState();
    if (status === 'resolved') notify('批注已解决', { id, status: previousStatus });
    else if (status === 'archived') notify('批注已归档', { id, status: previousStatus });
    else notify('批注已重新打开');
  }

  async function undoToastAction() {
    const undo = toast?.undo;
    if (!undo) return;
    if (toastTimer.current) window.clearTimeout(toastTimer.current);
    setToast(null);
    await api.updateAnnotation(undo.id, { status: undo.status });
    await loadState();
    notify('操作已撤销');
  }

  async function deleteAnnotation(id: string) {
    if (!window.confirm('确定永久删除这条批注及其全部回复吗？')) return;
    await api.deleteAnnotation(id);
    setSelectedAnnotationId(null);
    await loadState();
    notify('批注已删除');
  }

  async function deleteComment(annotationId: string, commentId: string) {
    const annotation = state?.annotations.find((item) => item.id === annotationId);
    const hasChildren = Boolean(annotation?.comments.some((comment) => comment.parentId === commentId));
    const confirmation = hasChildren
      ? '确定删除这条回复吗？其下回复会保留，并显示最小删除占位。'
      : '确定永久删除这条回复吗？';
    if (!window.confirm(confirmation)) return;
    const result = await api.deleteComment(annotationId, commentId);
    await loadState();
    notify(result.mode === 'tombstone' ? '回复已删除，关联讨论已保留' : '回复已永久删除');
  }

  async function reply(id: string, text: string, parentId?: string) { await api.reply(id, text, parentId); await loadState(); notify('回复已同步'); }

  if (checking) return <div className="loading-screen">Design Desk</div>;
  if (!user) return <LoginScreen onLogin={login} />;
  if (!state) return <div className="loading-screen">正在载入设计台…</div>;

  const currentPage = state.pages.find((page) => page.id === currentPageId);
  const displayUrl = buildSeoUrl(state.project.siteUrl, currentPage?.path || '/');
  const canGoBack = pageHistoryIndex.current > 0;
  const canGoForward = pageHistoryIndex.current < pageHistory.current.length - 1;
  const viewportState = {
    ...state,
    annotations: state.annotations.filter((item) => annotationViewport(item) === viewport)
  };

  function changeViewport(nextViewport: Viewport) {
    if (nextViewport === viewport) return;
    setViewport(nextViewport);
    setAnnotationMode(false);
    setSelectedAnnotationId(null);
  }

  return <div className={`workspace ${drawerOpen ? 'is-review-open' : ''} ${selectedAnnotationId ? 'is-review-detail' : 'is-review-list'}`}>
    <TopBar viewport={viewport} user={user} reviewOpen={drawerOpen} onViewportChange={changeViewport} onToggleReview={() => setDrawerOpen((value) => !value)} onLogout={logout} />
    <BrowserBar url={displayUrl} annotationMode={annotationMode} canGoBack={canGoBack} canGoForward={canGoForward} onBack={() => navigateHistory(-1)} onForward={() => navigateHistory(1)} onRefresh={() => { setRefreshToken((value) => value + 1); setAnnotationMode(false); }} onToggleAnnotation={() => { setAnnotationMode((value) => !value); setDrawerOpen(false); }} />
    <DemoCanvas state={viewportState} viewport={viewport} currentPageId={currentPageId} annotationMode={annotationMode} selectedAnnotationId={selectedAnnotationId} refreshToken={refreshToken} onPageChange={navigateTo} onOpenAnnotation={openAnnotation} onCreateAnnotation={createAnnotation} onCancelAnnotationMode={() => setAnnotationMode(false)} />
    <ReviewDrawer open={drawerOpen} state={viewportState} selectedAnnotationId={selectedAnnotationId} onClose={() => setDrawerOpen(false)} onShowList={() => setSelectedAnnotationId(null)} onOpenAnnotation={openAnnotation} onStatusChange={changeAnnotationStatus} onDeleteAnnotation={deleteAnnotation} onDeleteComment={deleteComment} onReply={reply} />
    <div className={`toast ${toast ? 'is-visible' : ''}`} role="status" aria-live="polite">
      <span>{toast?.message}</span>
      {toast?.undo && <button onClick={undoToastAction}>撤销</button>}
    </div>
  </div>;
}
