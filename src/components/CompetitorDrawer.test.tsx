import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CompetitorTracker } from '../types';
import { CompetitorDrawer } from './CompetitorDrawer';

const tracker: CompetitorTracker = {
  title: '竞品追踪',
  subtitle: '2 个品牌',
  updatedAt: '2026-09-02',
  rankingNote: '当前评审引用优先；不是市场份额或自然搜索排名。',
  coverageNote: 'Synthetic test data.',
  items: [
    {
      id: 'northline', rank: 1, name: 'Northline', url: 'https://northline.example', market: 'North America',
      sources: ['client-provided', 'project-research'], annotationPriority: true, priorityReason: 'Used in the active review.',
      learn: ['Role-based navigation', 'Resource library'],
      seo: { level: 'strong', label: 'SEO 较强', summary: 'Structured content baseline.', observedAt: '2026-07-01', evidenceStatus: '项目核验' }
    },
    {
      id: 'formwork', rank: 2, name: 'Formwork', url: 'https://formwork.example',
      sources: ['client-provided'], learn: ['System storytelling'],
      seo: { level: 'pending', label: '待复核', summary: 'No page-level baseline.', evidenceStatus: '客户提供名单' }
    }
  ]
};

describe('CompetitorDrawer', () => {
  it('shows ranking context, learning points, SEO evidence dates and source labels', () => {
    render(<CompetitorDrawer open tracker={tracker} onClose={() => {}} />);
    expect(screen.getByText('当前评审引用优先；不是市场份额或自然搜索排名。')).toBeVisible();
    expect(screen.getByText('Role-based navigation')).toBeVisible();
    expect(screen.getByText('SEO 较强')).toBeVisible();
    expect(screen.getByText(/观察 2026.07.01/)).toBeVisible();
    expect(screen.getAllByText('客户提供')).toHaveLength(3);
    expect(screen.getByText('批注正在对比')).toBeVisible();
  });

  it('filters priority brands and searches across learning and SEO content', () => {
    render(<CompetitorDrawer open tracker={tracker} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: '批注优先' }));
    expect(screen.getByRole('heading', { name: 'Northline' })).toBeVisible();
    expect(screen.queryByRole('heading', { name: 'Formwork' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '全部' }));
    fireEvent.change(screen.getByRole('searchbox', { name: '搜索竞品' }), { target: { value: 'System storytelling' } });
    expect(screen.queryByRole('heading', { name: 'Northline' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Formwork' })).toBeVisible();
  });

  it('closes from its close control', () => {
    const onClose = vi.fn();
    render(<CompetitorDrawer open tracker={tracker} onClose={onClose} />);
    fireEvent.click(screen.getAllByRole('button', { name: '关闭竞品追踪' })[1]);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
