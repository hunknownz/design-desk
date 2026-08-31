interface Props {
  url: string;
  annotationMode: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  onToggleAnnotation: () => void;
}

export function BrowserBar({ url, annotationMode, canGoBack, canGoForward, onBack, onForward, onRefresh, onToggleAnnotation }: Props) {
  const address = splitAddress(url);
  return <nav className="browser-bar" aria-label="Demo 浏览工具">
    <div className="browser-navigation">
      <IconButton label="返回" disabled={!canGoBack} onClick={onBack}><ArrowIcon direction="left" /></IconButton>
      <IconButton label="前进" disabled={!canGoForward} onClick={onForward}><ArrowIcon direction="right" /></IconButton>
      <IconButton label="刷新 Demo" onClick={onRefresh}><RefreshIcon /></IconButton>
    </div>
    <div className="browser-address" aria-label="当前页面地址" title={url}>
      <SecureIcon />
      <div className="browser-url-text"><span className="browser-protocol">{address.protocol}://</span><strong>{address.host}</strong><span className="browser-path">{address.path}</span></div>
    </div>
    <div className="browser-review-action">
      <button className={`browser-annotate ${annotationMode ? 'is-active' : ''}`} aria-label={annotationMode ? '退出批注' : '添加批注'} aria-pressed={annotationMode} onClick={onToggleAnnotation} title={annotationMode ? '退出批注' : '添加批注'}>
        <CommentIcon />
      </button>
    </div>
  </nav>;
}

function splitAddress(url: string) {
  try {
    const value = new URL(url);
    return { protocol: value.protocol.slice(0, -1), host: value.host, path: `${value.pathname}${value.search}${value.hash}` };
  } catch {
    return { protocol: 'https', host: url, path: '' };
  }
}

function IconButton({ label, disabled = false, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button className="browser-icon-button" aria-label={label} title={label} disabled={disabled} onClick={onClick}>{children}</button>;
}

function ArrowIcon({ direction }: { direction: 'left' | 'right' }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={direction === 'left' ? 'M14.5 5 7.5 12l7 7M8 12h10' : 'M9.5 5l7 7-7 7M16 12H6'} /></svg>;
}

function RefreshIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 8V4m0 0h-4m4 0-3.1 3.1A7 7 0 1 0 19 15" /></svg>;
}

function SecureIcon() {
  return <svg className="browser-secure-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7.5 11V8.5a4.5 4.5 0 0 1 9 0V11" /><rect x="5.5" y="11" width="13" height="9" rx="2" /></svg>;
}

function CommentIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8 8.7 8.7 0 0 1-3.5-.8L4 20l1.3-4.1A8 8 0 1 1 20 11.5Z" /><path d="M12 8v7M8.5 11.5h7" /></svg>;
}
