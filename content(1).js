(function () {
'use strict';

const STRIP_ID = 'cg-nav-strip';
const TRACK_ID = 'cg-nav-bars-track';
const TOOLTIP_ID = 'cg-nav-tooltip';
const DEBOUNCE_MS = 1200;
const HIDE_DELAY_MS = 220;
const INIT_DELAY_MS = 1800;
const TRUNCATE_LEN = 28;

let debounceTimer = null;
let hideTooltipTimer = null;
let observer = null;
let tooltipDirty = true;
let allUserMessages = [];
let pinnedIds = new Set();
let lastMsgCount = -1;
let cachedScrollEl = null;

function init() {
if (document.getElementById(STRIP_ID)) return;

const strip = document.createElement('div');
strip.id = STRIP_ID;

const track = document.createElement('div');
track.id = TRACK_ID;
strip.appendChild(track);

const tooltip = document.createElement('div');
tooltip.id = TOOLTIP_ID;
tooltip.setAttribute('role', 'listbox');

document.body.appendChild(strip);
document.body.appendChild(tooltip);

strip.addEventListener('mouseenter', onEnter);
strip.addEventListener('mouseleave', onLeave);
tooltip.addEventListener('mouseenter', onEnter);
tooltip.addEventListener('mouseleave', onLeave);

startObserving();
setTimeout(scan, INIT_DELAY_MS);
}

function onEnter() {
clearTimeout(hideTooltipTimer);
showTooltip();
}

function onLeave() {
hideTooltipTimer = setTimeout(collapseTooltip, HIDE_DELAY_MS);
}

function getStableId(el, fallbackIdx) {
return el.getAttribute('data-message-id') ||
el.getAttribute('data-testid') ||
`cg-idx-${fallbackIdx}`;
}

function findUserMessages() {
let els = Array.from(document.querySelectorAll('article[data-message-author-role="user"]'));
if (els.length === 0) {
els = Array.from(document.querySelectorAll('[data-message-author-role="user"]'));
}
return els;
}

function getText(el) {
const ps = el.querySelectorAll('p');
if (ps.length > 0) return Array.from(ps).map(p => p.textContent).join(' ').trim();
return (el.textContent || '').replace(/\s+/g, ' ').trim();
}

function truncate(str, max) {
const s = str.replace(/\s+/g, ' ').trim();
return s.length > max ? s.slice(0, max) + '…' : s;
}

function scan() {
const elements = findUserMessages();
const newCount = elements.length;
const countChanged = newCount !== lastMsgCount;
lastMsgCount = newCount;

allUserMessages = elements
.map((el, idx) => ({ id: getStableId(el, idx), text: getText(el), idx }))
.filter(m => m.text.length > 1);

if (countChanged) tooltipDirty = true;

renderBars();

const tip = document.getElementById(TOOLTIP_ID);
if (tip?.classList.contains('visible') && tooltipDirty) {
renderTooltip();
tooltipDirty = false;
}
}

function getScrollContainer() {
if (cachedScrollEl && document.contains(cachedScrollEl)) return cachedScrollEl;

const firstMsg = document.querySelector('article[data-message-author-role]');
if (firstMsg) {
let el = firstMsg.parentElement;
while (el && el !== document.body) {
const s = getComputedStyle(el);
if ((s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) {
cachedScrollEl = el;
return el;
}
el = el.parentElement;
}
}
const main = document.querySelector('main');
cachedScrollEl = (main && main.scrollHeight > main.clientHeight) ? main : document.documentElement;
return cachedScrollEl;
}

function getRelativeTop(el, container) {
try {
const cRect = container.getBoundingClientRect();
const eRect = el.getBoundingClientRect();
return eRect.top - cRect.top + container.scrollTop;
} catch (_) {
return el.offsetTop || 0;
}
}

function getLiveElement(id, idx) {
if (id && !id.startsWith('cg-idx-')) {
try {
const el = document.querySelector(`[data-message-id="${CSS.escape(id)}"]`) ||
document.querySelector(`[data-testid="${CSS.escape(id)}"]`);
if (el) return el;
} catch (_) {}
}
return findUserMessages()[idx] || null;
}

function renderBars() {
const track = document.getElementById(TRACK_ID);
if (!track) return;
track.innerHTML = '';
if (allUserMessages.length === 0) return;

const container = getScrollContainer();
const totalH = container.scrollHeight || 1;

allUserMessages.forEach((msg) => {
const el = getLiveElement(msg.id, msg.idx);
if (!el) return;

const bar = document.createElement('div');
bar.className = 'cg-nav-bar' + (pinnedIds.has(msg.id) ? ' cg-bar-pinned' : '');
bar.title = truncate(msg.text, 60);

const pct = Math.min(99, Math.max(0, (getRelativeTop(el, container) / totalH) * 100));
bar.style.top = pct + '%';

bar.addEventListener('mousedown', (e) => {
e.preventDefault();
e.stopPropagation();
scrollToMsg(msg.id, msg.idx);
});

track.appendChild(bar);
});
}

function renderTooltip() {
const tooltip = document.getElementById(TOOLTIP_ID);
if (!tooltip) return;

tooltip.innerHTML = '';

const header = document.createElement('div');
header.id = 'cg-nav-tooltip-header';
header.textContent = `${allUserMessages.length} message${allUserMessages.length !== 1 ? 's' : ''}`;
tooltip.appendChild(header);

if (allUserMessages.length === 0) {
const em = document.createElement('div');
em.style.cssText = 'text-align:center;padding:10px;font-size:11px;opacity:0.35;';
em.textContent = 'No messages yet';
tooltip.appendChild(em);
return;
}

allUserMessages.forEach((msg, i) => {
const isPinned = pinnedIds.has(msg.id);

const row = document.createElement('div');
row.className = 'cg-tooltip-item' + (isPinned ? ' cg-item-pinned' : '');
row.setAttribute('role', 'option');

const num = document.createElement('span');
num.className = 'cg-tooltip-item-num';
num.textContent = i + 1;

const textEl = document.createElement('span');
textEl.className = 'cg-tooltip-item-text';
textEl.textContent = truncate(msg.text, TRUNCATE_LEN);

const pinBtn = document.createElement('button');
pinBtn.className = 'cg-tooltip-pin-btn';
pinBtn.innerHTML = isPinned ? '⭐' : '☆';
pinBtn.title = isPinned ? 'Unpin' : 'Pin';
pinBtn.setAttribute('aria-label', isPinned ? 'Unpin message' : 'Pin message');

pinBtn.addEventListener('mousedown', (e) => {
e.preventDefault();
e.stopPropagation();
togglePin(msg);
});

row.append(num, textEl, pinBtn);

row.addEventListener('mousedown', (e) => {
if (e.target === pinBtn || pinBtn.contains(e.target)) return;
e.preventDefault();
scrollToMsg(msg.id, msg.idx);
});

tooltip.appendChild(row);

if (i < allUserMessages.length - 1) {
const div = document.createElement('div');
div.className = 'cg-tooltip-divider';
tooltip.appendChild(div);
}
});
}

function showTooltip() {
if (tooltipDirty) {
renderTooltip();
tooltipDirty = false;
}
document.getElementById(TOOLTIP_ID)?.classList.add('visible');
}

function collapseTooltip() {
document.getElementById(TOOLTIP_ID)?.classList.remove('visible');
}

function togglePin(msg) {
const el = getLiveElement(msg.id, msg.idx);
if (pinnedIds.has(msg.id)) {
pinnedIds.delete(msg.id);
el?.classList.remove('cg-main-highlighted');
} else {
pinnedIds.add(msg.id);
el?.classList.add('cg-main-highlighted');
}
renderBars();
renderTooltip();
}

function scrollToMsg(id, idx) {
const el = getLiveElement(id, idx);
if (!el) return;

el.classList.add('cg-flash-message');
setTimeout(() => el?.classList.remove('cg-flash-message'), 1900);

try {
el.scrollIntoView({ behavior: 'smooth', block: 'start' });
} catch (_) {
const container = getScrollContainer();
const top = getRelativeTop(el, container);
container.scrollTo({ top: Math.max(0, top - 80), behavior: 'smooth' });
}
}

function isOwnNode(target) {
if (target.id === STRIP_ID || target.id === TRACK_ID || target.id === TOOLTIP_ID) return true;
let el = target;
for (let i = 0; i < 4; i++) {
if (!el || el === document.body) break;
if (el.id === STRIP_ID || el.id === TOOLTIP_ID) return true;
el = el.parentElement;
}
return false;
}

function startObserving() {
const target = document.querySelector('main') || document.body;

observer = new MutationObserver((mutations) => {
const hasExternal = mutations.some(m => !isOwnNode(m.target));
if (!hasExternal) return;

clearTimeout(debounceTimer);
debounceTimer = setTimeout(() => {
if (typeof requestIdleCallback === 'function') {
requestIdleCallback(scan, { timeout: 2000 });
} else {
scan();
}
}, DEBOUNCE_MS);
});

observer.observe(target, { childList: true, subtree: true });

window.addEventListener('resize', () => {
clearTimeout(debounceTimer);
debounceTimer = setTimeout(renderBars, 400);
});
}

function setupURLWatch() {
function onNavChange() {
pinnedIds.clear();
lastMsgCount = -1;
cachedScrollEl = null;
tooltipDirty = true;
collapseTooltip();
setTimeout(scan, INIT_DELAY_MS);
}

const _push = history.pushState.bind(history);
const _replace = history.replaceState.bind(history);
history.pushState = function (...a) { _push(...a); setTimeout(onNavChange, 0); };
history.replaceState = function (...a) { _replace(...a); setTimeout(onNavChange, 0); };
window.addEventListener('popstate', onNavChange);
}

if (document.readyState === 'loading') {
document.addEventListener('DOMContentLoaded', () => { init(); setupURLWatch(); });
} else {
init();
setupURLWatch();
}

window.cgNavRefresh = scan;

})();