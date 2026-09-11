import type { Viewport } from '../types';

interface Props {
  brandName: string;
  viewport: Viewport;
  user: string;
  reviewOpen: boolean;
  competitorOpen: boolean;
  competitorCount?: number;
  previewUrl?: string;
  onViewportChange: (viewport: Viewport) => void;
  onToggleReview: () => void;
  onToggleCompetitors: () => void;
  onLogout: () => void;
}

const viewports: { id: Viewport; label: string }[] = [
  { id: 'desktop', label: '电脑' },
  { id: 'tablet', label: '平板' },
  { id: 'mobile', label: '手机' }
];

export function TopBar({ brandName, viewport, user, reviewOpen, competitorOpen, competitorCount = 0, previewUrl, onViewportChange, onToggleReview, onToggleCompetitors, onLogout }: Props) {
  return <header className="desk-bar">
    <div className="desk-brand-cluster">
      <div className="desk-brand">{brandName}</div>
      {competitorCount > 0 && <button className={`competitor-button ${competitorOpen ? 'is-active' : ''}`} aria-label={`竞品追踪，共 ${competitorCount} 个竞品`} aria-expanded={competitorOpen} aria-controls="competitor-drawer" onClick={onToggleCompetitors}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /><circle cx="12" cy="12" r="2" /></svg>
        <span>竞品追踪</span>
        <b aria-label={`${competitorCount} 个竞品`}>{competitorCount}</b>
      </button>}
    </div>
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
