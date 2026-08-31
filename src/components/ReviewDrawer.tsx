import { FormEvent, useEffect, useRef, useState } from 'react';
import { annotationDisplayNumber, formatAnnotationNumber } from '../lib/annotations';
import type { Annotation, AnnotationContentBlock, AnnotationStatus, Comment, ProjectState } from '../types';

interface Props {
  open: boolean;
  state: ProjectState;
  selectedAnnotationId: string | null;
  onClose: () => void;
  onShowList: () => void;
  onOpenAnnotation: (id: string) => void;
  onStatusChange: (id: string, status: AnnotationStatus) => Promise<void>;
  onDeleteAnnotation: (id: string) => void;
  onDeleteComment: (annotationId: string, commentId: string) => void;
  onReply: (id: string, text: string, parentId?: string) => Promise<void>;
}

const statusLabel: Record<AnnotationStatus, string> = { open: '未解决', resolved: '已解决', archived: '已归档' };
const statusOrder: AnnotationStatus[] = ['open', 'resolved', 'archived'];
const emptyCopy: Record<AnnotationStatus, { title: string; body: string }> = {
  open: { title: '暂无未解决批注', body: '点击浏览栏批注按钮，再选择页面元素或圈选区域。' },
  resolved: { title: '暂无已解决批注', body: '完成修改后，批注会保留在这里，等待归档或重新打开。' },
  archived: { title: '暂无已归档批注', body: '归档用于保留已经确认完成的历史评审记录。' }
};
const formatTime = (value: string) => new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
const annotationTitle = (annotation: Annotation) => annotation.title || annotation.elementLabel || '页面批注';
const annotationSummary = (annotation: Annotation) => annotation.summary || annotation.comments[0]?.text || '查看完整说明';
const replyCount = (annotation: Annotation) => Math.max(0, annotation.comments.length - (annotation.kind === 'rationale' ? 0 : 1));

export function ReviewDrawer(props: Props) {
  const { open, state, selectedAnnotationId } = props;
  const [filter, setFilter] = useState<AnnotationStatus>('open');
  const selectedAnnotation = state.annotations.find((item) => item.id === selectedAnnotationId) || null;
  const selectedStatus = selectedAnnotation?.status;
  const fallbackNumber = (annotation: Annotation) => state.annotations.findIndex((item) => item.id === annotation.id) + 1;
  const displayNumber = (annotation: Annotation) => annotationDisplayNumber(annotation, fallbackNumber(annotation));

  useEffect(() => {
    if (selectedStatus) setFilter(selectedStatus);
  }, [selectedAnnotationId, selectedStatus]);

  const annotations = state.annotations
    .filter((item) => item.status === filter)
    .sort((a, b) => displayNumber(a) - displayNumber(b));
  const peers = selectedAnnotation
    ? state.annotations.filter((item) => item.status === selectedAnnotation.status).sort((a, b) => displayNumber(a) - displayNumber(b))
    : [];
  const selectedIndex = selectedAnnotation ? peers.findIndex((item) => item.id === selectedAnnotation.id) : -1;
  const empty = emptyCopy[filter];
  const currentVersion = annotations.filter((annotation) => !annotation.demoVersion || annotation.demoVersion === state.project.demoVersion);
  const earlierVersions = annotations.filter((annotation) => annotation.demoVersion && annotation.demoVersion !== state.project.demoVersion);

  return <>
    <button className={`drawer-backdrop ${open ? 'is-open' : ''}`} aria-label="关闭侧栏" onClick={props.onClose} />
    <aside className={`review-drawer ${open ? 'is-open' : ''} ${selectedAnnotation ? 'is-detail' : 'is-list'}`} aria-hidden={!open}>
      {selectedAnnotation ? <header className="drawer-head drawer-thread-head">
        <button className="drawer-thread-back" aria-label="返回全部批注" onClick={props.onShowList}><span aria-hidden="true">←</span><span>全部批注</span></button>
        <div className="drawer-thread-position"><strong>{formatAnnotationNumber(displayNumber(selectedAnnotation))}</strong><span>{selectedIndex + 1} / {peers.length}</span></div>
        <div className="drawer-thread-actions">
          <button aria-label="上一条批注" disabled={selectedIndex <= 0} onClick={() => selectedIndex > 0 && props.onOpenAnnotation(peers[selectedIndex - 1].id)}>↑</button>
          <button aria-label="下一条批注" disabled={selectedIndex < 0 || selectedIndex >= peers.length - 1} onClick={() => selectedIndex >= 0 && selectedIndex < peers.length - 1 && props.onOpenAnnotation(peers[selectedIndex + 1].id)}>↓</button>
          <button aria-label="关闭" onClick={props.onClose}>×</button>
        </div>
      </header> : <>
        <header className="drawer-head">
          <div><span>{state.project.version}</span><strong>批注</strong></div>
          <button aria-label="关闭" onClick={props.onClose}>×</button>
        </header>
        <nav className="drawer-filters" aria-label="批注状态">
          {statusOrder.map((status) => <button key={status} className={filter === status ? 'is-active' : ''} aria-pressed={filter === status} onClick={() => setFilter(status)}>{statusLabel[status]}</button>)}
        </nav>
      </>}
      {selectedAnnotation ? <div className="drawer-detail-scroll">
        <AnnotationDetail annotation={selectedAnnotation} currentVersion={state.project.demoVersion} onReply={props.onReply} onStatusChange={props.onStatusChange} onDelete={props.onDeleteAnnotation} onDeleteComment={props.onDeleteComment} />
      </div> : <div className="drawer-list">
        {!annotations.length && <div className="empty-state"><strong>{empty.title}</strong><p>{empty.body}</p></div>}
        {currentVersion.length > 0 && <AnnotationListGroup title="当前版本" annotations={currentVersion} state={state} displayNumber={displayNumber} onOpen={props.onOpenAnnotation} />}
        {earlierVersions.length > 0 && <AnnotationListGroup title="较早版本" annotations={earlierVersions} state={state} displayNumber={displayNumber} onOpen={props.onOpenAnnotation} muted />}
      </div>}
    </aside>
  </>;
}

function AnnotationListGroup({ title, annotations, state, displayNumber, onOpen, muted = false }: {
  title: string;
  annotations: Annotation[];
  state: ProjectState;
  displayNumber: (annotation: Annotation) => number;
  onOpen: (id: string) => void;
  muted?: boolean;
}) {
  const grouped = state.pages.map((page) => ({ page, annotations: annotations.filter((annotation) => annotation.pageId === page.id) })).filter((group) => group.annotations.length);
  const unknown = annotations.filter((annotation) => !state.pages.some((page) => page.id === annotation.pageId));
  if (unknown.length) grouped.push({ page: { id: 'other', label: '其他页面', description: '', path: '' }, annotations: unknown });

  return <section className={`annotation-list-section ${muted ? 'is-muted' : ''}`}>
    <header className="annotation-list-section-title"><strong>{title}</strong><span>{annotations.length}</span></header>
    {grouped.map((group) => <section className="annotation-page-group" key={group.page.id}>
      <h3>{group.page.label}</h3>
      {group.annotations.map((annotation) => {
        const number = displayNumber(annotation);
        const replies = replyCount(annotation);
        return <button key={annotation.id} aria-label={`批注 ${formatAnnotationNumber(number)}`} className={`annotation-card is-${annotation.status}`} onClick={() => onOpen(annotation.id)}>
          <b aria-hidden="true">{number}</b>
          <span className="annotation-card-body">
            <small className="annotation-card-location">{annotation.locationLabel || annotation.elementLabel || group.page.label}</small>
            <strong>{annotationTitle(annotation)}</strong>
            <p>{annotationSummary(annotation)}</p>
            <small className="annotation-card-meta"><span>{annotation.author} · {formatTime(annotation.createdAt)}</span>{replies > 0 && <em>{replies} 条回复</em>}</small>
            {annotation.kind === 'rationale' && <em className="annotation-kind">设计说明 · 含横评</em>}
          </span>
        </button>;
      })}
    </section>)}
  </section>;
}

function AnnotationDetail({ annotation, currentVersion, onReply, onStatusChange, onDelete, onDeleteComment }: {
  annotation: ProjectState['annotations'][number];
  currentVersion: string;
  onReply: (id: string, text: string, parentId?: string) => Promise<void>;
  onStatusChange: (id: string, status: AnnotationStatus) => Promise<void>;
  onDelete: (id: string) => void;
  onDeleteComment: (annotationId: string, commentId: string) => void;
}) {
  const [reply, setReply] = useState('');
  const [replyTarget, setReplyTarget] = useState<Comment | null>(null);
  const [replying, setReplying] = useState(false);
  const replyInputRef = useRef<HTMLInputElement>(null);
  const statusActor = annotation.status === 'archived' ? annotation.archivedBy : annotation.resolvedBy;
  const statusTime = annotation.status === 'archived' ? annotation.archivedAt : annotation.resolvedAt;
  const rootComment = annotation.kind === 'rationale' ? null : annotation.comments[0] || null;
  const discussionComments = annotation.kind === 'rationale' ? annotation.comments : annotation.comments.slice(1);
  const commentTree = buildCommentTree(discussionComments);
  const rootAuthor = rootComment?.author || annotation.author;
  const rootTime = rootComment?.createdAt || annotation.createdAt;
  const fromOlderVersion = Boolean(annotation.demoVersion && annotation.demoVersion !== currentVersion);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reply.trim() || replying) return;
    setReplying(true);
    try {
      if (replyTarget) await onReply(annotation.id, reply.trim(), replyTarget.id);
      else await onReply(annotation.id, reply.trim());
      setReply('');
      setReplyTarget(null);
    } finally {
      setReplying(false);
    }
  }

  function beginReply(comment: Comment) {
    setReplyTarget(comment);
    window.setTimeout(() => replyInputRef.current?.focus(), 0);
  }

  return <section className="annotation-detail">
    <div className="annotation-context">
      <div>
        <span>{annotation.selectionType === 'element' ? '元素批注' : '区域批注'}{fromOlderVersion ? ' · 较早版本' : ' · 当前版本'}</span>
        <strong>{annotation.locationLabel || annotation.pageId}</strong>
        <small>{annotation.elementLabel || '页面区域'}{annotation.demoVersion ? ` · ${annotation.demoVersion}` : ''}</small>
      </div>
      <details className="annotation-more">
        <summary aria-label="更多批注操作">•••</summary>
        <button className="annotation-delete-button" onClick={() => onDelete(annotation.id)}>删除批注</button>
      </details>
    </div>
    <article className="annotation-root-post">
      <header className="annotation-root-meta">
        <div><span aria-hidden="true">{rootAuthor.slice(0, 1)}</span><p><strong>{rootAuthor}</strong><time>{formatTime(rootTime)}</time></p></div>
        <em>{annotation.kind === 'rationale' ? '设计说明' : '批注正文'}</em>
      </header>
      <h2>{annotationTitle(annotation)}</h2>
      {annotation.summary && <p className="annotation-root-summary">{annotation.summary}</p>}
      {rootComment && <p className="annotation-root-message">{rootComment.deletedAt ? '该批注已删除' : rootComment.text}</p>}
      {annotation.content?.length ? <AnnotationRichContent blocks={annotation.content} /> : null}
    </article>
    {annotation.status !== 'open' && <div className={`annotation-status-note is-${annotation.status}`}>
      <strong>{statusLabel[annotation.status]}</strong>
      {statusActor && statusTime && <small>{statusActor} · {formatTime(statusTime)}</small>}
    </div>}
    {commentTree.length > 0 && <section className="annotation-discussion" aria-label="批注讨论">
      <h3>讨论 <span>{discussionComments.length}</span></h3>
      {commentTree.map((node) => <CommentThread key={node.comment.id} node={node} depth={0} allowReply={annotation.status !== 'archived'} onReply={beginReply} onDelete={(commentId) => onDeleteComment(annotation.id, commentId)} />)}
    </section>}
    <footer className="annotation-thread-footer">
    {annotation.status !== 'archived' && <>
      {replyTarget && <div className="annotation-reply-target"><span>回复 @{replyTarget.author}</span><button type="button" aria-label="取消回复评论" onClick={() => setReplyTarget(null)}>取消</button></div>}
      <form className="annotation-reply-form" onSubmit={submit}>
        <input ref={replyInputRef} aria-label={replyTarget ? `回复${replyTarget.author}的评论` : '回复批注'} value={reply} onChange={(event) => setReply(event.target.value)} placeholder={replyTarget ? `回复 @${replyTarget.author}…` : '回复这条批注…'} />
        <button disabled={!reply.trim() || replying}>{replying ? '发送中…' : '发送'}</button>
      </form>
    </>}
    {annotation.status === 'open' && <button className="resolve-button" onClick={() => onStatusChange(annotation.id, 'resolved')}>标记为已解决</button>}
    {annotation.status === 'resolved' && <div className="annotation-status-actions">
      <button className="archive-button" onClick={() => onStatusChange(annotation.id, 'archived')}>归档</button>
      <button className="reopen-button" onClick={() => onStatusChange(annotation.id, 'open')}>重新打开</button>
    </div>}
    {annotation.status === 'archived' && <button className="reopen-button is-full" onClick={() => onStatusChange(annotation.id, 'open')}>重新打开</button>}
    </footer>
  </section>;
}

type CommentNode = { comment: Comment; children: CommentNode[] };

function buildCommentTree(comments: Comment[]): CommentNode[] {
  const nodes = new Map(comments.map((comment) => [comment.id, { comment, children: [] as CommentNode[] }]));
  const roots: CommentNode[] = [];
  comments.forEach((comment) => {
    const node = nodes.get(comment.id)!;
    const parent = comment.parentId && comment.parentId !== comment.id ? nodes.get(comment.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  });
  return roots;
}

function CommentThread({ node, depth, allowReply, onReply, onDelete }: {
  node: CommentNode;
  depth: number;
  allowReply: boolean;
  onReply: (comment: Comment) => void;
  onDelete: (commentId: string) => void;
}) {
  const { comment } = node;
  const deleted = Boolean(comment.deletedAt);
  const displayText = deleted ? '该回复已删除' : comment.text;
  const actionText = comment.text.length > 28 ? `${comment.text.slice(0, 27)}…` : comment.text;
  const canDelete = !deleted;

  return <div className={`annotation-comment ${deleted ? 'is-deleted' : ''}`} data-depth={depth}>
    {deleted ? <div className="annotation-comment-tombstone">该回复已删除</div> : <article>
      <header>
        <strong>{comment.author}</strong>
        <span>
          <time>{formatTime(comment.createdAt)}</time>
          {allowReply && !deleted && <button type="button" aria-label={`回复“${actionText}”`} onClick={() => onReply(comment)}>回复</button>}
          {canDelete && <button type="button" className="comment-delete-button" aria-label={`删除“${actionText}”`} onClick={() => onDelete(comment.id)}>删除</button>}
        </span>
      </header>
      <p>{displayText}</p>
    </article>}
    {node.children.length > 0 && <div className="annotation-comment-children">
      {node.children.map((child) => <CommentThread key={child.comment.id} node={child} depth={depth + 1} allowReply={allowReply} onReply={onReply} onDelete={onDelete} />)}
    </div>}
  </div>;
}

function AnnotationRichContent({ blocks }: { blocks: AnnotationContentBlock[] }) {
  return <div className="annotation-rich-content">
    {blocks.map((block, index) => <AnnotationBlock key={`${block.type}-${index}`} block={block} />)}
  </div>;
}

function AnnotationBlock({ block }: { block: AnnotationContentBlock }) {
  if (block.type === 'lead') return <p className="annotation-lead">{block.text}</p>;
  if (block.type === 'heading') return <h3>{block.text}</h3>;
  if (block.type === 'paragraph') return <p>{block.text}</p>;
  if (block.type === 'list') return <ul>{block.items.map((item, index) => <li key={index}>{item}</li>)}</ul>;
  if (block.type === 'callout') return <aside className={`annotation-callout is-${block.tone || 'neutral'}`}><small>{block.label}</small><p>{block.text}</p></aside>;
  if (block.type === 'table') return <figure className="annotation-table">
    {block.caption && <figcaption>{block.caption}</figcaption>}
    <div className="annotation-table-scroll" tabIndex={0} aria-label={block.caption || '批注表格'}>
      <table>
        <thead><tr>{block.columns.map((column) => <th key={column} scope="col">{column}</th>)}</tr></thead>
        <tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{block.columns.map((_, cellIndex) => <td key={cellIndex}>{row[cellIndex] || '—'}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </figure>;
  return <section className="annotation-sources">
    <h3>{block.title || '依据与来源'}</h3>
    <ul>{block.items.map((item) => <li key={`${item.label}-${item.url}`}><a href={item.url} target="_blank" rel="noreferrer">{item.label}</a>{item.note && <span>{item.note}</span>}</li>)}</ul>
  </section>;
}
