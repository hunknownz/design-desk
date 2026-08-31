import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Annotation, ProjectState } from '../types';
import { ReviewDrawer } from './ReviewDrawer';

const createdAt = '2026-08-28T08:00:00.000Z';

function annotation(overrides: Partial<Annotation>): Annotation {
  return {
    id: 'annotation',
    sequence: 17,
    pageId: 'home',
    taskId: null,
    x: 0.2,
    y: 0.2,
    w: 0.1,
    h: 0.1,
    viewportWidth: 1440,
    viewport: 'desktop',
    selectionType: 'element',
    elementLabel: 'Hero 标题',
    elementPath: 'main > h1',
    locationLabel: '首页 · Hero',
    targetId: 'hero-title',
    demoVersion: 'older-version',
    status: 'open',
    author: '客户',
    createdAt,
    resolvedBy: null,
    resolvedAt: null,
    archivedBy: null,
    archivedAt: null,
    comments: [{ id: 'comment', author: '客户', text: '这里要更清楚', createdAt }],
    ...overrides
  };
}

const state: ProjectState = {
  revision: 1,
  updatedAt: createdAt,
  project: {
    name: 'Design Desk',
    subtitle: 'Design Desk',
    version: 'V4.6',
    description: 'Review workspace',
    siteUrl: 'https://example.test',
    demoUrl: '/demo-site/',
    demoVersion: 'current-version'
  },
  pages: [{ id: 'home', label: '首页', description: '首页', path: '/' }],
  tasks: [],
  annotations: [
    annotation({ id: 'a1' }),
    annotation({
      id: 'a2',
      status: 'resolved',
      demoVersion: 'current-version',
      resolvedBy: '设计团队',
      resolvedAt: '2026-08-28T09:00:00.000Z',
      comments: [{ id: 'c2', author: '客户', text: '已完成修改', createdAt }]
    }),
    annotation({
      id: 'a3',
      status: 'archived',
      resolvedBy: '设计团队',
      resolvedAt: '2026-08-28T09:00:00.000Z',
      archivedBy: '项目负责人',
      archivedAt: '2026-08-28T10:00:00.000Z',
      comments: [{ id: 'c3', author: '客户', text: '历史确认记录', createdAt }]
    })
  ],
  activity: []
};

function renderDrawer(overrides: Partial<Parameters<typeof ReviewDrawer>[0]> = {}) {
  const props: Parameters<typeof ReviewDrawer>[0] = {
    open: true,
    state,
    selectedAnnotationId: null,
    onClose: vi.fn(),
    onShowList: vi.fn(),
    onOpenAnnotation: vi.fn(),
    onStatusChange: vi.fn().mockResolvedValue(undefined),
    onDeleteAnnotation: vi.fn(),
    onDeleteComment: vi.fn(),
    onReply: vi.fn().mockResolvedValue(undefined),
    ...overrides
  };
  render(<ReviewDrawer {...props} />);
  return props;
}

describe('ReviewDrawer', () => {
  it('defaults to a grouped unresolved list with stable annotation numbers', () => {
    renderDrawer();

    expect(screen.getByRole('button', { name: '未解决' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('这里要更清楚')).toBeVisible();
    expect(screen.getByText('较早版本')).toBeVisible();
    expect(screen.getByRole('button', { name: '批注 #017' })).toBeVisible();
    expect(screen.queryByText('已完成修改')).not.toBeInTheDocument();
    expect(screen.queryByText('历史确认记录')).not.toBeInTheDocument();
    expect(screen.queryByText('待办')).not.toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '批注状态' })).not.toHaveTextContent(/\d/);
  });

  it('opens one focused thread instead of expanding detail below a duplicate card', () => {
    const props = renderDrawer({ selectedAnnotationId: 'a1' });

    expect(screen.queryByRole('button', { name: '批注 #017' })).not.toBeInTheDocument();
    expect(screen.getByText('#017')).toBeVisible();
    expect(screen.getByText('1 / 1')).toBeVisible();
    expect(screen.getAllByText('这里要更清楚')).toHaveLength(1);
    expect(screen.getByText('首页 · Hero')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '返回全部批注' }));
    expect(props.onShowList).toHaveBeenCalledTimes(1);
  });

  it('navigates between focused threads without returning to the list', () => {
    const next = annotation({ id: 'a4', sequence: 23, demoVersion: 'current-version', comments: [{ id: 'c4', author: '客户', text: '下一条批注', createdAt }] });
    const props = renderDrawer({ state: { ...state, annotations: [state.annotations[0], next] }, selectedAnnotationId: 'a1' });

    fireEvent.click(screen.getByRole('button', { name: '下一条批注' }));
    expect(props.onOpenAnnotation).toHaveBeenCalledWith('a4');
    expect(screen.getByRole('button', { name: '上一条批注' })).toBeDisabled();
  });

  it('supports reply, resolve and permanent delete for an open annotation', () => {
    const props = renderDrawer({ selectedAnnotationId: 'a1' });

    fireEvent.change(screen.getByRole('textbox', { name: '回复批注' }), { target: { value: '已经确认' } });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
    expect(props.onReply).toHaveBeenCalledWith('a1', '已经确认');

    fireEvent.click(screen.getByRole('button', { name: '标记为已解决' }));
    expect(props.onStatusChange).toHaveBeenCalledWith('a1', 'resolved');

    fireEvent.click(screen.getByRole('button', { name: '删除批注' }));
    expect(props.onDeleteAnnotation).toHaveBeenCalledWith('a1');
  });

  it('supports threaded replies and deletion without removing child replies', () => {
    const threaded = annotation({
      id: 'threaded',
      comments: [
        { id: 'root', author: '客户', text: '主批注', createdAt },
        { id: 'reply-1', author: '设计团队', text: '第一条回复', createdAt, parentId: 'root' },
        { id: 'reply-2', author: '项目负责人', text: '继续讨论', createdAt, parentId: 'reply-1' }
      ]
    });
    const props = renderDrawer({ state: { ...state, annotations: [threaded] }, selectedAnnotationId: 'threaded' });

    expect(screen.getByText('继续讨论').closest('.annotation-comment')).toHaveAttribute('data-depth', '1');
    fireEvent.click(screen.getByRole('button', { name: '回复“第一条回复”' }));
    expect(screen.getByText('回复 @设计团队')).toBeVisible();
    fireEvent.change(screen.getByRole('textbox', { name: '回复设计团队的评论' }), { target: { value: '补充说明' } });
    fireEvent.click(screen.getByRole('button', { name: '发送' }));
    expect(props.onReply).toHaveBeenCalledWith('threaded', '补充说明', 'reply-1');

    fireEvent.click(screen.getByRole('button', { name: '删除“第一条回复”' }));
    expect(props.onDeleteComment).toHaveBeenCalledWith('threaded', 'reply-1');
  });

  it('renders a deleted reply as a thread-preserving tombstone', () => {
    const deleted = annotation({
      id: 'deleted-reply',
      comments: [
        { id: 'root', author: '客户', text: '主批注', createdAt },
        { id: 'deleted', author: '设计团队', text: '', createdAt, parentId: 'root', deletedAt: createdAt, deletedBy: '项目负责人' },
        { id: 'child', author: '客户', text: '这条仍需保留', createdAt, parentId: 'deleted' }
      ]
    });
    renderDrawer({ state: { ...state, annotations: [deleted] }, selectedAnnotationId: 'deleted-reply' });

    const tombstone = screen.getByText('该回复已删除');
    expect(tombstone).toBeVisible();
    expect(tombstone).toHaveClass('annotation-comment-tombstone');
    expect(tombstone.closest('article')).toBeNull();
    expect(screen.queryByText('设计团队')).not.toBeInTheDocument();
    expect(screen.getByText('这条仍需保留')).toBeVisible();
    expect(screen.queryByRole('button', { name: '删除“该回复已删除”' })).not.toBeInTheDocument();
  });

  it('lets a resolved annotation be archived or reopened', () => {
    const props = renderDrawer({ selectedAnnotationId: 'a2' });

    expect(screen.getAllByText('已完成修改')).toHaveLength(1);
    expect(screen.getByText('设计团队', { exact: false })).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '归档' }));
    fireEvent.click(screen.getByRole('button', { name: '重新打开' }));
    expect(props.onStatusChange).toHaveBeenNthCalledWith(1, 'a2', 'archived');
    expect(props.onStatusChange).toHaveBeenNthCalledWith(2, 'a2', 'open');
  });

  it('keeps archived annotations read-only until reopened', () => {
    const props = renderDrawer({ selectedAnnotationId: 'a3' });

    expect(screen.getAllByText('历史确认记录')).toHaveLength(1);
    expect(screen.getByText('项目负责人', { exact: false })).toBeVisible();
    expect(screen.queryByRole('textbox', { name: '回复批注' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '重新打开' }));
    expect(props.onStatusChange).toHaveBeenCalledWith('a3', 'open');
  });

  it('uses a concise empty state without repeating the active device', () => {
    renderDrawer({ state: { ...state, annotations: [] } });
    expect(screen.getByText('暂无未解决批注')).toBeVisible();
    expect(screen.queryByText(/电脑视图|平板视图|手机视图/)).not.toBeInTheDocument();
  });

  it('renders structured rationale tables and sources with explicit deletion', () => {
    const rationale = annotation({
      id: 'rationale',
      kind: 'rationale',
      title: '为什么需要 Products',
      summary: '让用户按系统、系列与选配理解产品。',
      comments: [],
      content: [
        { type: 'table', caption: '竞品横评', columns: ['竞品', '机制'], rows: [['Pella', '按任务组织']] },
        { type: 'sources', items: [{ label: 'Pella', url: 'https://www.pella.com/', note: '官方公开页面' }] }
      ]
    });
    const props = renderDrawer({ state: { ...state, annotations: [rationale] }, selectedAnnotationId: 'rationale' });

    expect(screen.getByRole('heading', { name: '为什么需要 Products' })).toBeVisible();
    expect(screen.getAllByText('让用户按系统、系列与选配理解产品。')).toHaveLength(1);
    expect(screen.getByText('竞品横评')).toBeVisible();
    expect(screen.getByRole('table')).toHaveTextContent('按任务组织');
    expect(screen.getByRole('link', { name: 'Pella' })).toHaveAttribute('href', 'https://www.pella.com/');
    fireEvent.click(screen.getByRole('button', { name: '删除批注' }));
    expect(props.onDeleteAnnotation).toHaveBeenCalledWith('rationale');
  });
});
