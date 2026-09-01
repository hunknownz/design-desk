import type { Viewport } from '../types';

interface Props {
  viewport: Viewport;
  user: string;
  reviewOpen: boolean;
  previewUrl?: string;
  onViewportChange: (viewport: Viewport) => void;
  onToggleReview: () => void;
  onLogout: () => void;
}

const viewports: { id: Viewport; label: string }[] = [
  { id: 'desktop', label: '电脑' },
  { id: 'tablet', label: '平板' },
  { id: 'mobile', label: '手机' }
];

export function TopBar({ viewport, user, reviewOpen, previewUrl, onViewportChange, onToggleReview, onLogout }: Props) {
  return <header className="desk-bar">
    <div className="desk-brand">Design Desk</div>
    <div className="viewport-tabs" aria-label="预览设备">
      {viewports.map((item) => <button key={item.id} className={viewport === item.id ? 'is-active' : ''} aria-pressed={viewport === item.id} aria-label={`${item.label}预览`} onClick={() => onViewportChange(item.id)}>{item.label}</button>)}
    </div>
    <div className="desk-actions">
      {previewUrl && <a className="preview-link" href={previewUrl} target="_blank" rel="noopener noreferrer" aria-label="在新标签页打开网站预发布效果">预发布站 <span aria-hidden="true">↗</span></a>}
      <button className="review-button" aria-expanded={reviewOpen} onClick={onToggleReview}>批注</button>
      <button className="user-button" title={`${user} · 点击退出`} onClick={onLogout}>{user.slice(0, 1).toUpperCase()}</button>
    </div>
  </header>;
}
