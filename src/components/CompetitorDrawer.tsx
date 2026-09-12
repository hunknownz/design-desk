import { useEffect, useMemo, useRef, useState } from 'react';
import type { CompetitorSource, CompetitorTracker } from '../types';

interface Props {
  open: boolean;
  tracker: CompetitorTracker;
  onClose: () => void;
}

type TrackerFilter = 'all' | 'priority' | CompetitorSource;

const filters: { id: TrackerFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'priority', label: '批注优先' },
  { id: 'client-provided', label: '客户提供' },
  { id: 'project-research', label: '项目调研' }
];

const sourceLabel: Record<CompetitorSource, string> = {
  'client-provided': '客户提供',
  'project-research': '项目调研'
};

const normalized = (value: string) => value.trim().toLocaleLowerCase('zh-CN');
const displayDate = (value?: string) => value ? value.slice(0, 10).replaceAll('-', '.') : '待记录';

export function CompetitorDrawer({ open, tracker, onClose }: Props) {
  const [filter, setFilter] = useState<TrackerFilter>('all');
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 280);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [onClose, open]);

  const items = useMemo(() => {
    const search = normalized(query);
    return [...tracker.items]
      .sort((a, b) => a.rank - b.rank)
      .filter((item) => {
        if (filter === 'priority' && !item.annotationPriority) return false;
        if (filter !== 'all' && filter !== 'priority' && !item.sources.includes(filter)) return false;
        if (!search) return true;
        const searchable = [item.name, item.market, ...item.learn, item.seo.label, item.seo.summary].filter(Boolean).join(' ');
        return normalized(searchable).includes(search);
      });
  }, [filter, query, tracker.items]);

  return <>
    <button className={`competitor-backdrop ${open ? 'is-open' : ''}`} aria-label="关闭竞品追踪" aria-hidden={!open} tabIndex={open ? 0 : -1} onClick={onClose} />
    <aside id="competitor-drawer" className={`competitor-drawer ${open ? 'is-open' : ''}`} aria-hidden={!open} aria-label={tracker.title} inert={!open}>
      <header className="competitor-drawer-head">
        <div>
          <span>COMPETITIVE INTELLIGENCE</span>
          <strong>{tracker.title}</strong>
          <small>{tracker.subtitle || `${tracker.items.length} 个品牌`}</small>
        </div>
        <button aria-label="关闭竞品追踪" onClick={onClose}>×</button>
      </header>
      <section className="competitor-toolbar" aria-label="筛选竞品">
        <label>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
          <input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索品牌、学习点或 SEO" aria-label="搜索竞品" />
        </label>
        <nav aria-label="竞品来源">
          {filters.map((item) => <button key={item.id} className={filter === item.id ? 'is-active' : ''} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
        </nav>
      </section>
      <div className="competitor-ledger">
        <section className="competitor-ranking-note">
          <div><span>排序口径</span><time>{displayDate(tracker.updatedAt)} 更新</time></div>
          <p>{tracker.rankingNote}</p>
          {tracker.coverageNote && <small>{tracker.coverageNote}</small>}
        </section>
        <div className="competitor-results-meta" role="status"><span>当前显示</span><strong>{items.length}</strong><span>/ {tracker.items.length}</span></div>
        {!items.length && <div className="competitor-empty"><strong>没有匹配的竞品</strong><p>换一个品牌名、学习点或筛选条件试试。</p></div>}
        {items.length > 0 && <ol className="competitor-list">
          {items.map((item) => <li key={item.id} className={item.annotationPriority ? 'is-priority' : ''}>
            <article className="competitor-card">
              <header>
                <span className="competitor-rank" aria-label={`第 ${item.rank} 名`}>{String(item.rank).padStart(2, '0')}</span>
                <div className="competitor-name">
                  <div><h2>{item.name}</h2>{item.market && <small>{item.market}</small>}</div>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`打开 ${item.name} 官网`}>官网 ↗</a>
                </div>
              </header>
              <div className="competitor-badges">
                {item.annotationPriority && <em>批注正在对比</em>}
                {item.sources.map((source) => <span key={source}>{sourceLabel[source]}</span>)}
              </div>
              {item.priorityReason && <p className="competitor-priority-reason">{item.priorityReason}</p>}
              <section className="competitor-learning">
                <h3>可学习</h3>
                <ul>{item.learn.map((point) => <li key={point}>{point}</li>)}</ul>
              </section>
              <section className="competitor-seo">
                <div><h3>SEO 现状</h3><span className={`seo-level is-${item.seo.level}`}>{item.seo.label}</span></div>
                <p>{item.seo.summary}</p>
                <small>{item.seo.observedAt ? `观察 ${displayDate(item.seo.observedAt)}` : '尚无页面级基线'} · {item.seo.evidenceStatus}</small>
              </section>
            </article>
          </li>)}
        </ol>}
      </div>
    </aside>
  </>;
}
