const params = new URLSearchParams(location.search);
const pageId = params.get('page') || 'home';
const version = params.get('reviewVersion') || 'unversioned';
history.scrollRestoration = 'manual';
scrollTo(0, 0);

function metrics() {
  const root = document.documentElement;
  return {
    documentWidth: Math.max(root.scrollWidth, root.clientWidth),
    documentHeight: Math.max(root.scrollHeight, root.clientHeight),
    viewportWidth: root.clientWidth,
    viewportHeight: root.clientHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY
  };
}

function send(payload) {
  parent.postMessage(payload, '*');
}

function compactText(value, limit = 64) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function elementPath(element) {
  if (!element) return '';
  const parts = [];
  let node = element;
  while (node && node.nodeType === 1 && parts.length < 5) {
    let part = node.tagName.toLowerCase();
    if (node.id) { parts.unshift(`${part}#${node.id}`); break; }
    if (node.dataset?.reviewTarget) part += `[data-review-target="${node.dataset.reviewTarget}"]`;
    else if (node.classList?.length) part += `.${[...node.classList].slice(0, 2).join('.')}`;
    parts.unshift(part);
    node = node.parentElement;
  }
  return parts.join(' > ');
}

function locationLabel(element, rect) {
  if (element.closest('.site-header')) return '页面顶栏';
  if (element.closest('.site-footer')) return '页面页脚';
  if (element.closest('.mega-menu')) return '导航下拉菜单';
  const current = metrics();
  const centerY = rect.top + current.scrollY + rect.height / 2;
  const centerX = rect.left + current.scrollX + rect.width / 2;
  const vertical = centerY / current.documentHeight < .24 ? '页面顶部' : centerY / current.documentHeight > .76 ? '页面底部' : '页面中部';
  const horizontal = centerX / current.documentWidth < .34 ? '左侧' : centerX / current.documentWidth > .66 ? '右侧' : '中部';
  return `${vertical} · ${horizontal}`;
}

function inspect(requestId, x, y) {
  const hit = document.elementFromPoint(x, y);
  if (!hit) return;
  const element = hit.closest('[data-review-label], [data-review-target], a, button, h1, h2, h3, nav, header, footer, main, section, article') || hit;
  const controlledTarget = element.matches('.nav-trigger') && element.getAttribute('aria-controls')
    ? document.getElementById(element.getAttribute('aria-controls'))
    : null;
  const host = controlledTarget?.matches('[data-review-target]')
    ? controlledTarget
    : element.closest('[data-review-target], [data-review-label]');
  const source = element.getBoundingClientRect();
  const rect = {
    left: Math.max(0, source.left),
    top: Math.max(0, source.top),
    width: Math.max(8, Math.min(innerWidth, source.right) - Math.max(0, source.left)),
    height: Math.max(8, Math.min(innerHeight, source.bottom) - Math.max(0, source.top))
  };
  const where = locationLabel(element, rect);
  const label = compactText(element.dataset?.reviewLabel || host?.dataset?.reviewLabel || element.getAttribute('aria-label') || element.textContent || element.tagName.toLowerCase());
  send({
    type: 'design-desk:inspect-result', requestId,
    targetId: host?.dataset?.reviewTarget || '',
    elementLabel: `${where} · ${label}`,
    elementPath: elementPath(element),
    locationLabel: where,
    rect
  });
}

function targetAnchor(target) {
  const navigationGroup = target.matches('.nav-group') ? target : target.closest('.nav-group');
  const navigationTrigger = navigationGroup?.querySelector(':scope > .nav-trigger');
  const anchor = navigationTrigger || target;
  const rect = anchor.getBoundingClientRect();

  if (!rect.width && !rect.height) return null;
  if (navigationTrigger) {
    return {
      x: Math.min(innerWidth - 10, rect.right + 6),
      y: rect.top + rect.height / 2
    };
  }
  if (target.matches('.site-footer') || target.closest('.site-footer')) {
    return {
      x: Math.max(18, Math.min(innerWidth - 18, rect.left + 24)),
      y: rect.top + 24
    };
  }
  return {
    x: Math.max(12, Math.min(innerWidth - 12, rect.right - 8)),
    y: rect.top + Math.min(18, rect.height / 2)
  };
}

function locateTargets(targetIds) {
  const targets = targetIds.flatMap((targetId) => {
    const target = document.querySelector(`[data-review-target="${CSS.escape(targetId)}"]`);
    const point = target && targetAnchor(target);
    return point ? [{ targetId, point }] : [];
  });
  send({ type: 'design-desk:targets-result', targets });
}

function focusTarget(targetId) {
  const target = document.querySelector(`[data-review-target="${CSS.escape(targetId)}"]`);
  if (!target) return;
  document.querySelectorAll('.nav-group').forEach((item) => {
    item.classList.remove('is-review-focused', 'is-menu-open');
    item.querySelector(':scope > .nav-trigger')?.setAttribute('aria-expanded', 'false');
  });
  document.body.classList.remove('menu-open');
  document.querySelector('.menu-scrim')?.setAttribute('aria-hidden', 'true');
  const group = target.closest('.nav-group');
  if (group) {
    scrollTo({ top: 0, behavior: 'smooth' });
    const trigger = group.querySelector(':scope > .nav-trigger');
    group.classList.add('is-review-focused');
    trigger?.setAttribute('aria-expanded', 'true');
  }
  if (target.closest('.site-footer')) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  target.classList.remove('focus-flash');
  requestAnimationFrame(() => target.classList.add('focus-flash'));
  setTimeout(() => target.classList.remove('focus-flash'), 1900);
}

window.addEventListener('message', (event) => {
  const message = event.data;
  if (!message || typeof message.type !== 'string' || !message.type.startsWith('design-desk:')) return;
  if (message.type === 'design-desk:inspect') inspect(message.requestId, Number(message.x), Number(message.y));
  if (message.type === 'design-desk:focus-target') focusTarget(String(message.targetId || ''));
  if (message.type === 'design-desk:locate-targets') locateTargets(Array.isArray(message.targetIds) ? message.targetIds.map(String) : []);
});

let frame = 0;
function sendMetrics() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => send({ type: 'design-desk:metrics', metrics: metrics() }));
}
window.addEventListener('scroll', sendMetrics, { passive: true });
window.addEventListener('resize', sendMetrics, { passive: true });
new ResizeObserver(sendMetrics).observe(document.documentElement);
document.fonts?.ready.then(sendMetrics);
window.addEventListener('load', () => {
  scrollTo(0, 0);
  send({ type: 'design-desk:demo-ready', pageId, version, metrics: metrics() });
});
send({ type: 'design-desk:demo-ready', pageId, version, metrics: metrics() });
