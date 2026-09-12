import http from 'node:http';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createHash, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = process.env.DESIGN_DESK_APP_DIR || path.join(ROOT, 'dist');
const DEMO_DIR = process.env.DESIGN_DESK_DEMO_DIR || path.join(ROOT, 'demo-site');
const DATA_FILE = process.env.DESIGN_DESK_DATA_FILE || path.join(ROOT, 'data', 'project.json');
const DESIGN_NOTES_FILE = process.env.DESIGN_DESK_DESIGN_NOTES_FILE || path.join(ROOT, 'data', 'design-notes.json');
const COMPETITOR_TRACKER_FILE = process.env.DESIGN_DESK_COMPETITOR_TRACKER_FILE || path.join(path.dirname(DATA_FILE), 'competitor-tracker.json');
const PORT = Number(process.env.PORT || 4471);
const HOST = process.env.HOST || '127.0.0.1';
const ACCESS_CODE = String(process.env.DESIGN_DESK_REVIEW_CODE || '');
if (!ACCESS_CODE) {
  throw new Error('DESIGN_DESK_REVIEW_CODE is required');
}
const SESSION_SECRET = process.env.DESIGN_DESK_SESSION_SECRET || createHash('sha256').update(`${ACCESS_CODE}:${ROOT}`).digest('hex');
const DEMO_ORIGIN = String(process.env.DESIGN_DESK_DEMO_ORIGIN || '').replace(/[^a-zA-Z0-9:./_-]/g, '');
const clients = new Set();
const reviewViewports = new Set(['desktop', 'tablet', 'mobile']);
const annotationStatuses = new Set(['open', 'resolved', 'archived']);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function securityHeaders() {
  return {
    'Content-Security-Policy': `default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; frame-src 'self'${DEMO_ORIGIN ? ` ${DEMO_ORIGIN}` : ''}; frame-ancestors 'self'; base-uri 'self'; form-action 'self'`,
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
  };
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    ...securityHeaders(),
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

function sendText(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(status, {
    ...securityHeaders(),
    'Content-Type': contentType,
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

async function readBody(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 1_000_000) throw new Error('请求内容过大');
  }
  return raw ? JSON.parse(raw) : {};
}

function parseCookies(req) {
  const cookies = {};
  for (const part of String(req.headers.cookie || '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    cookies[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return cookies;
}

function sign(value) {
  return createHmac('sha256', SESSION_SECRET).update(value).digest('base64url');
}

function createSession(name) {
  const payload = Buffer.from(JSON.stringify({ name, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function getSession(req) {
  const token = parseCookies(req).design_desk_session;
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = sign(payload);
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!parsed.name || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isSecureRequest(req) {
  return req.headers['x-forwarded-proto'] === 'https' || !String(req.headers.host || '').startsWith('127.0.0.1');
}

function normalizeViewport(value, viewportWidth = 0) {
  if (reviewViewports.has(value)) return value;
  if (Number(viewportWidth) >= 1001) return 'desktop';
  if (Number(viewportWidth) >= 601) return 'tablet';
  return 'mobile';
}

function assignAnnotationSequences(annotations) {
  const reserved = new Set(annotations
    .map((annotation) => Number(annotation.sequence))
    .filter((sequence) => Number.isInteger(sequence) && sequence > 0));
  const seen = new Set();
  let next = 1;

  return annotations.map((annotation) => {
    const sequence = Number(annotation.sequence);
    if (Number.isInteger(sequence) && sequence > 0 && !seen.has(sequence)) {
      seen.add(sequence);
      return { ...annotation, sequence };
    }
    while (reserved.has(next) || seen.has(next)) next += 1;
    const assigned = next;
    seen.add(assigned);
    next += 1;
    return { ...annotation, sequence: assigned };
  });
}

async function readState() {
  const state = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  const competitorTracker = await readOptionalJson(COMPETITOR_TRACKER_FILE);
  if (competitorTracker) state.competitorTracker = competitorTracker;
  state.project = {
    ...state.project,
    siteUrl: state.project?.siteUrl || process.env.DESIGN_DESK_SITE_URL || 'https://example.test',
    previewUrl: state.project?.previewUrl || process.env.DESIGN_DESK_PREVIEW_URL || '',
    demoUrl: state.project?.demoUrl || process.env.DESIGN_DESK_DEMO_URL || '/demo/',
    demoVersion: state.project?.demoVersion || 'sample-v1'
  };
  state.annotations = Array.isArray(state.annotations)
    ? state.annotations.map((annotation) => ({
        ...annotation,
        viewport: normalizeViewport(annotation.viewport, annotation.viewportWidth),
        status: annotationStatuses.has(annotation.status) ? annotation.status : 'open',
        resolvedBy: annotation.resolvedBy || null,
        resolvedAt: annotation.resolvedAt || null,
        archivedBy: annotation.archivedBy || null,
        archivedAt: annotation.archivedAt || null
      }))
    : [];
  const designNotes = await readDesignNotes();
  if (designNotes.length) {
    const noteIds = new Set(designNotes.map((note) => note.id));
    const deletedNoteIds = new Set(Array.isArray(state.deletedDesignNoteIds) ? state.deletedDesignNoteIds : []);
    const visibleNotes = designNotes.filter((note) => !deletedNoteIds.has(note.id));
    const storedNotes = new Map(state.annotations.filter((annotation) => noteIds.has(annotation.id)).map((annotation) => [annotation.id, annotation]));
    const mergedNotes = visibleNotes.map((note) => {
      const stored = storedNotes.get(note.id);
      if (!stored) return note;
      return {
        ...note,
        ...stored,
        kind: 'rationale',
        title: note.title,
        summary: note.summary,
        content: note.content,
        targetId: note.targetId,
        elementLabel: note.elementLabel,
        locationLabel: note.locationLabel,
        demoVersion: state.project.demoVersion
      };
    });
    state.annotations = [...mergedNotes, ...state.annotations.filter((annotation) => !noteIds.has(annotation.id))];
  }
  state.annotations = assignAnnotationSequences(state.annotations).map((annotation) => ({
    ...annotation,
    comments: Array.isArray(annotation.comments) ? annotation.comments.map((comment) => ({
      ...comment,
      parentId: comment.parentId || null,
      deletedBy: comment.deletedBy || null,
      deletedAt: comment.deletedAt || null,
      text: comment.deletedAt ? '' : String(comment.text || '')
    })) : []
  }));
  return state;
}

async function readDesignNotes() {
  try {
    const payload = JSON.parse(await fs.readFile(DESIGN_NOTES_FILE, 'utf8'));
    const notes = Array.isArray(payload) ? payload : payload.annotations;
    return Array.isArray(notes) ? notes : [];
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

async function readOptionalJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeState(state) {
  state.revision = Number(state.revision || 0) + 1;
  state.updatedAt = new Date().toISOString();
  const persistedState = { ...state };
  delete persistedState.competitorTracker;
  const tempFile = `${DATA_FILE}.tmp`;
  await fs.writeFile(tempFile, `${JSON.stringify(persistedState, null, 2)}\n`, 'utf8');
  await fs.rename(tempFile, DATA_FILE);
  broadcast({ type: 'state-changed', revision: state.revision, updatedAt: state.updatedAt });
}

function addActivity(state, user, verb, detail, targetId = null) {
  state.activity.unshift({ id: randomUUID(), user, verb, detail, targetId, createdAt: new Date().toISOString() });
  state.activity = state.activity.slice(0, 100);
}

function broadcast(payload) {
  const message = `data: ${JSON.stringify(payload)}\n\n`;
  for (const response of clients) response.write(message);
}

function cleanText(value, max = 800) {
  return String(value || '').trim().slice(0, max);
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, service: 'Design Desk', time: new Date().toISOString() });
  }

  if (url.pathname === '/api/session' && req.method === 'GET') {
    const session = getSession(req);
    return sendJson(res, 200, { authenticated: Boolean(session), user: session?.name || null });
  }

  if (url.pathname === '/api/login' && req.method === 'POST') {
    const body = await readBody(req);
    const code = String(body.code || '');
    const name = cleanText(body.name, 40);
    const codeBuffer = Buffer.from(code);
    const expectedBuffer = Buffer.from(ACCESS_CODE);
    const valid = codeBuffer.length === expectedBuffer.length && timingSafeEqual(codeBuffer, expectedBuffer);
    if (!valid || !name) return sendJson(res, 401, { error: '访问码或姓名不正确' });
    const secure = isSecureRequest(req) ? '; Secure' : '';
    res.setHeader('Set-Cookie', `design_desk_session=${encodeURIComponent(createSession(name))}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000${secure}`);
    return sendJson(res, 200, { authenticated: true, user: name });
  }

  if (url.pathname === '/api/logout' && req.method === 'POST') {
    res.setHeader('Set-Cookie', 'design_desk_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return sendJson(res, 200, { ok: true });
  }

  const session = getSession(req);
  if (!session) return sendJson(res, 401, { error: '请先输入访问码' });

  if (url.pathname === '/api/events' && req.method === 'GET') {
    res.writeHead(200, {
      ...securityHeaders(),
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive'
    });
    res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  if (url.pathname === '/api/state' && req.method === 'GET') {
    return sendJson(res, 200, await readState());
  }

  if (url.pathname === '/api/annotations' && req.method === 'POST') {
    const body = await readBody(req);
    const state = await readState();
    if (!state.pages.some((page) => page.id === body.pageId)) return sendJson(res, 400, { error: '页面不存在' });
    const annotation = {
      id: randomUUID(),
      sequence: state.annotations.reduce((highest, item) => Math.max(highest, Number(item.sequence) || 0), 0) + 1,
      pageId: body.pageId,
      taskId: body.taskId || null,
      x: Number(body.x),
      y: Number(body.y),
      w: Number(body.w),
      h: Number(body.h),
      viewportWidth: Number(body.viewportWidth || 0),
      viewport: normalizeViewport(body.viewport, body.viewportWidth),
      selectionType: body.selectionType === 'element' ? 'element' : 'area',
      elementLabel: cleanText(body.elementLabel, 120),
      elementPath: cleanText(body.elementPath, 240),
      locationLabel: cleanText(body.locationLabel, 120),
      targetId: cleanText(body.targetId, 120),
      demoVersion: cleanText(body.demoVersion, 80),
      status: 'open',
      author: session.name,
      createdAt: new Date().toISOString(),
      resolvedBy: null,
      resolvedAt: null,
      archivedBy: null,
      archivedAt: null,
      comments: [{ id: randomUUID(), author: session.name, text: cleanText(body.note, 1200), createdAt: new Date().toISOString(), parentId: null, deletedBy: null, deletedAt: null }]
    };
    if (![annotation.x, annotation.y, annotation.w, annotation.h].every(Number.isFinite) || !annotation.comments[0].text) {
      return sendJson(res, 400, { error: '批注信息不完整' });
    }
    state.annotations.push(annotation);
    addActivity(state, session.name, '新增批注', annotation.elementLabel || '页面圈选', annotation.id);
    await writeState(state);
    return sendJson(res, 201, annotation);
  }

  const annotationMatch = url.pathname.match(/^\/api\/annotations\/([^/]+)$/);
  if (annotationMatch && req.method === 'PATCH') {
    const body = await readBody(req);
    const state = await readState();
    const annotation = state.annotations.find((item) => item.id === annotationMatch[1]);
    if (!annotation) return sendJson(res, 404, { error: '批注不存在' });
    if (!annotationStatuses.has(body.status)) return sendJson(res, 400, { error: '批注状态无效' });
    if (body.status === 'archived' && annotation.status !== 'resolved') return sendJson(res, 409, { error: '请先解决批注，再进行归档' });

    const previousStatus = annotation.status;
    const changedAt = new Date().toISOString();
    annotation.status = body.status;
    let activityVerb = '更新批注';

    if (body.status === 'open') {
      annotation.resolvedBy = null;
      annotation.resolvedAt = null;
      annotation.archivedBy = null;
      annotation.archivedAt = null;
      activityVerb = '重新打开批注';
    } else if (body.status === 'resolved') {
      if (previousStatus !== 'archived') {
        annotation.resolvedBy = session.name;
        annotation.resolvedAt = changedAt;
      }
      annotation.archivedBy = null;
      annotation.archivedAt = null;
      activityVerb = previousStatus === 'archived' ? '撤销批注归档' : '解决批注';
    } else {
      annotation.archivedBy = session.name;
      annotation.archivedAt = changedAt;
      activityVerb = '归档批注';
    }

    addActivity(state, session.name, activityVerb, annotation.elementLabel || '页面圈选', annotation.id);
    await writeState(state);
    return sendJson(res, 200, annotation);
  }

  if (annotationMatch && req.method === 'DELETE') {
    const state = await readState();
    const index = state.annotations.findIndex((item) => item.id === annotationMatch[1]);
    if (index < 0) return sendJson(res, 404, { error: '批注不存在' });
    const [removed] = state.annotations.splice(index, 1);
    if (removed.kind === 'rationale') {
      state.deletedDesignNoteIds = [...new Set([...(Array.isArray(state.deletedDesignNoteIds) ? state.deletedDesignNoteIds : []), removed.id])];
    }
    addActivity(state, session.name, '删除批注', removed.elementLabel || '页面圈选', removed.id);
    await writeState(state);
    return sendJson(res, 200, { ok: true });
  }

  const commentMatch = url.pathname.match(/^\/api\/annotations\/([^/]+)\/comments$/);
  if (commentMatch && req.method === 'POST') {
    const body = await readBody(req);
    const text = cleanText(body.text, 1200);
    const parentId = cleanText(body.parentId, 120) || null;
    if (!text) return sendJson(res, 400, { error: '请输入回复内容' });
    const state = await readState();
    const annotation = state.annotations.find((item) => item.id === commentMatch[1]);
    if (!annotation) return sendJson(res, 404, { error: '批注不存在' });
    if (annotation.status === 'archived') return sendJson(res, 409, { error: '已归档批注不能回复，请先重新打开' });
    const parent = parentId ? annotation.comments.find((comment) => comment.id === parentId) : null;
    if (parentId && !parent) return sendJson(res, 400, { error: '要回复的评论不存在' });
    if (parent?.deletedAt) return sendJson(res, 409, { error: '不能回复已删除的评论' });
    const comment = { id: randomUUID(), author: session.name, text, createdAt: new Date().toISOString(), parentId, deletedBy: null, deletedAt: null };
    annotation.comments.push(comment);
    addActivity(state, session.name, parent ? '回复评论' : '回复批注', parent ? `回复 ${parent.author}` : (annotation.elementLabel || '页面圈选'), annotation.id);
    await writeState(state);
    return sendJson(res, 201, comment);
  }

  const commentItemMatch = url.pathname.match(/^\/api\/annotations\/([^/]+)\/comments\/([^/]+)$/);
  if (commentItemMatch && req.method === 'DELETE') {
    const state = await readState();
    const annotation = state.annotations.find((item) => item.id === commentItemMatch[1]);
    if (!annotation) return sendJson(res, 404, { error: '批注不存在' });
    const commentIndex = annotation.comments.findIndex((item) => item.id === commentItemMatch[2]);
    const comment = annotation.comments[commentIndex];
    if (!comment) return sendJson(res, 404, { error: '回复不存在' });
    if (annotation.kind !== 'rationale' && annotation.comments[0]?.id === comment.id) {
      return sendJson(res, 409, { error: '主批注请使用“删除批注”操作' });
    }
    const hasChildren = annotation.comments.some((item) => item.parentId === comment.id);
    let mode = 'removed';
    if (hasChildren) {
      if (comment.deletedAt) return sendJson(res, 409, { error: '回复已经删除' });
      comment.text = '';
      comment.deletedBy = session.name;
      comment.deletedAt = new Date().toISOString();
      mode = 'tombstone';
    } else {
      let ancestorId = comment.parentId || null;
      annotation.comments.splice(commentIndex, 1);
      while (ancestorId) {
        const ancestorIndex = annotation.comments.findIndex((item) => item.id === ancestorId);
        const ancestor = annotation.comments[ancestorIndex];
        if (!ancestor?.deletedAt || annotation.comments.some((item) => item.parentId === ancestor.id)) break;
        ancestorId = ancestor.parentId || null;
        annotation.comments.splice(ancestorIndex, 1);
      }
    }
    addActivity(state, session.name, '删除回复', annotation.elementLabel || '页面圈选', annotation.id);
    await writeState(state);
    return sendJson(res, 200, { ok: true, mode });
  }

  const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (taskMatch && req.method === 'PATCH') {
    const body = await readBody(req);
    const state = await readState();
    const task = state.tasks.find((item) => item.id === taskMatch[1]);
    if (!task) return sendJson(res, 404, { error: '待办不存在' });
    if (['review', 'waiting', 'in_progress', 'done'].includes(body.status)) task.status = body.status;
    if (body.note !== undefined) task.note = cleanText(body.note, 1000);
    task.updatedAt = new Date().toISOString();
    addActivity(state, session.name, '更新待办', task.title, task.id);
    await writeState(state);
    return sendJson(res, 200, task);
  }

  return sendJson(res, 404, { error: '接口不存在' });
}

async function serveStatic(req, res, url) {
  if (url.pathname.startsWith('/demo') && !getSession(req)) {
    return sendText(res, 401, '<!doctype html><meta charset="utf-8"><style>body{font:16px sans-serif;padding:48px;background:#eee}p{max-width:420px}</style><p>登录已失效，请回到 Design Desk 重新输入访问码。</p>', 'text/html; charset=utf-8');
  }
  const isDemo = url.pathname === '/demo' || url.pathname.startsWith('/demo/');
  const staticRoot = isDemo ? DEMO_DIR : APP_DIR;
  let relativePath = isDemo
    ? decodeURIComponent(url.pathname.replace(/^\/demo\/?/, '') || 'index.html')
    : decodeURIComponent(url.pathname === '/' ? 'index.html' : url.pathname.slice(1));
  let filePath = path.resolve(staticRoot, relativePath);
  if (!filePath.startsWith(staticRoot)) return sendText(res, 403, 'Forbidden');
  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    const body = await fs.readFile(filePath);
    const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, {
      ...securityHeaders(),
      'Content-Type': contentType,
      'Content-Length': body.length,
      'Cache-Control': 'no-cache',
      'CDN-Cache-Control': 'no-store',
      'Cloudflare-CDN-Cache-Control': 'no-store'
    });
    res.end(body);
  } catch {
    if (!isDemo && !path.extname(relativePath)) {
      try {
        const body = await fs.readFile(path.join(APP_DIR, 'index.html'));
        res.writeHead(200, {
          ...securityHeaders(),
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Length': body.length,
          'Cache-Control': 'no-cache',
          'CDN-Cache-Control': 'no-store',
          'Cloudflare-CDN-Cache-Control': 'no-store'
        });
        return res.end(body);
      } catch {}
    }
    sendText(res, 404, 'Not found');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (url.pathname.startsWith('/api/')) await handleApi(req, res, url);
    else await serveStatic(req, res, url);
  } catch (error) {
    console.error(error);
    if (!res.headersSent) sendJson(res, 500, { error: '服务暂时不可用' });
    else res.end();
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Design Desk listening on http://${HOST}:${PORT}`);
});
