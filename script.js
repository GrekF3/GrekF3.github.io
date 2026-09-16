const root = document.documentElement;
const isRu = root.lang === 'ru';
const themeButton = document.querySelector('#theme-toggle');
function setTheme(theme) {
  root.dataset.theme = theme;
  themeButton.setAttribute('aria-label', isRu ? (theme === 'dark' ? 'Светлая тема' : 'Тёмная тема') : (theme === 'dark' ? 'Light theme' : 'Dark theme'));
  try { localStorage.setItem('portfolio-theme-v2', theme); } catch {}
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#10131a' : '#f5f6f8';
}
setTheme(root.dataset.theme || 'dark');
themeButton.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const animatedElements = new Set();
function enter(element, delay = 0) {
  if (reduceMotion.matches || !element.animate) return;
  const animation = element.animate([
    {opacity:0,transform:'translateY(18px)'},
    {opacity:1,transform:'translateY(0)'}
  ], {duration:520,delay,easing:'cubic-bezier(.22,.7,.22,1)',fill:'backwards'});
  animatedElements.add(animation);
  animation.finished.catch(() => {}).finally(() => animatedElements.delete(animation));
}
reduceMotion.addEventListener('change', event => { if (event.matches) animatedElements.forEach(animation => animation.cancel()); });
document.querySelectorAll('.hero-copy > *').forEach((element,index) => enter(element,Math.min(index * 45,180)));
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    enter(entry.target); observer.unobserve(entry.target);
  }), {threshold:.08});
  document.querySelectorAll('[data-reveal]').forEach(element => observer.observe(element));
}

const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
function closeMenu() {
  header.dataset.menuOpen = 'false'; menuButton.setAttribute('aria-expanded','false');
  menuButton.textContent = isRu ? 'Меню' : 'Menu';
}
menuButton.addEventListener('click', () => {
  if (menuButton.getAttribute('aria-expanded') === 'true') return closeMenu();
  header.dataset.menuOpen = 'true'; menuButton.setAttribute('aria-expanded','true');
  menuButton.textContent = isRu ? 'Закрыть' : 'Close';
});
document.querySelectorAll('#main-nav a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus({preventScroll:true});
  }
});
document.addEventListener('click', event => { if (!header.contains(event.target)) closeMenu(); });
matchMedia('(min-width:768px)').addEventListener('change', event => { if (event.matches) closeMenu(); });

let showcaseSelection = 0;
document.querySelectorAll('[data-showcase]').forEach(button => button.addEventListener('click', async () => {
  const selection = ++showcaseSelection;
  const project = document.getElementById(button.dataset.showcase);
  const source = project.querySelector('.project-visual img');
  const image = document.querySelector('#showcase-img');
  const nextImage = new Image();
  nextImage.sizes = image.sizes; nextImage.srcset = source.srcset; nextImage.src = source.src;
  try { await nextImage.decode(); } catch { return; }
  if (selection !== showcaseSelection) return;
  const name = project.querySelector('h3').textContent;
  image.srcset = source.srcset; image.src = source.src; image.alt = source.alt;
  const imageLink = image.closest('a');
  imageLink.href = source.src; imageLink.dataset.name = name;
  imageLink.setAttribute('aria-label', isRu ? `Увеличить скриншот: ${name}` : `Enlarge screenshot: ${name}`);
  document.querySelector('#showcase-title').textContent = name;
  document.querySelector('#showcase-category').textContent = project.querySelector('.project-category').textContent;
  document.querySelector('#showcase-company').textContent = project.querySelector('.company').childNodes[0].textContent.trim();
  document.querySelector('#showcase-link').href = `#${project.id}`;
  document.querySelectorAll('[data-showcase]').forEach(other => other.setAttribute('aria-pressed',String(other === button)));
  enter(document.querySelector('.showcase-stage'));
}));

const briefForm = document.querySelector('#brief-form');
const taskField = document.querySelector('#brief-message');
const formStatus = document.querySelector('#form-status');
function prepareBrief() {
  const task = taskField.value.trim();
  taskField.setCustomValidity(task.length < 12 ? (isRu ? 'Опишите задачу чуть подробнее: минимум 12 символов.' : 'Please add a little detail: at least 12 characters.') : '');
  if (!briefForm.reportValidity()) { taskField.setAttribute('aria-invalid','true'); return null; }
  taskField.removeAttribute('aria-invalid');
  const service = briefForm.elements.service.value;
  const name = document.querySelector('#brief-name').value.trim();
  const message = isRu ? `Никита, привет! Хочу обсудить: ${service.toLowerCase()}.\n\n${task}${name ? `\n\nИмя / компания: ${name}` : ''}` : `Hi Nikita! I would like to discuss: ${service.toLowerCase()}.\n\n${task}${name ? `\n\nName / company: ${name}` : ''}`;
  return {message,url:`https://t.me/GrekF3?text=${encodeURIComponent(message)}`};
}
taskField.addEventListener('input', () => { taskField.setCustomValidity(''); taskField.removeAttribute('aria-invalid'); formStatus.textContent = ''; });
function readyLink(brief, prefix) {
  const link = document.createElement('a'); link.href = brief.url; link.target = '_blank'; link.rel = 'noopener';
  link.textContent = isRu ? 'Открыть диалог ↗' : 'Open chat ↗';
  formStatus.replaceChildren(document.createTextNode(prefix+' '),link);
}
briefForm.addEventListener('submit', event => {
  event.preventDefault();
  const brief = prepareBrief(); if (!brief) return;
  window.open(brief.url,'_blank','noopener,noreferrer');
  readyLink(brief,isRu ? 'Черновик готов.' : 'Your draft is ready.');
});
document.querySelector('#copy-brief').addEventListener('click', async () => {
  const brief = prepareBrief(); if (!brief) return;
  try {
    await navigator.clipboard.writeText(brief.message);
    formStatus.textContent = isRu ? 'Текст скопирован. Можно вставить его в Telegram.' : 'Message copied. You can paste it in Telegram.';
  } catch {
    readyLink(brief,isRu ? 'Браузер не разрешил копирование.' : 'Your browser did not allow copying.');
  }
});

const viewer = document.querySelector('#image-viewer');
const viewerImage = document.querySelector('#viewer-image');
const viewerBody = document.querySelector('.viewer-body');
const zoomButton = document.querySelector('#zoom-toggle');
let imageTrigger;
function setZoom(zoomed) {
  viewerBody.classList.toggle('zoomed', zoomed);
  zoomButton.setAttribute('aria-pressed', String(zoomed));
  zoomButton.textContent = isRu ? (zoomed ? 'Вместить' : 'Масштаб 1:1') : (zoomed ? 'Fit to screen' : 'Zoom 1:1');
}
document.querySelectorAll('[data-image]').forEach(link => link.addEventListener('click', event => {
  if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !viewer.showModal) return;
  event.preventDefault(); imageTrigger = link;
  document.querySelector('#viewer-title').textContent = link.dataset.name;
  viewerImage.src = link.href; viewerImage.alt = link.dataset.name;
  document.querySelector('#original-link').href = link.href;
  setZoom(false); viewer.showModal(); document.body.classList.add('viewer-open');
}));
zoomButton.addEventListener('click', () => setZoom(!viewerBody.classList.contains('zoomed')));
document.querySelector('#viewer-close').addEventListener('click', () => viewer.close());
viewer.addEventListener('click', event => { if (event.target === viewer) { const r = viewer.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) viewer.close(); } });
viewer.addEventListener('close', () => { document.body.classList.remove('viewer-open'); imageTrigger?.focus({preventScroll:true}); });

document.querySelectorAll('[data-chart]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-chart]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  document.querySelectorAll('.chart-panel').forEach(panel => { panel.hidden = panel.id !== `chart-${button.dataset.chart}`; });
}));
const dynamicGraph = document.querySelector('#activity-graph');
const liveGraph = new Image();
liveGraph.addEventListener('load', () => { dynamicGraph.src = liveGraph.src; });
liveGraph.src = dynamicGraph.dataset.liveSrc;
dynamicGraph.addEventListener('error', () => {
  if (!dynamicGraph.dataset.fallback) { dynamicGraph.dataset.fallback = 'true'; dynamicGraph.src = '/assets/github-activity.svg'; }
});
const number = new Intl.NumberFormat(isRu ? 'ru-RU' : 'en-US');
const dateFormat = new Intl.DateTimeFormat(isRu ? 'ru-RU' : 'en-GB', {day:'2-digit',month:'2-digit',year:'numeric',timeZone:'UTC'});
fetch('/assets/github-stats.json').then(r => { if (!r.ok) throw new Error('Stats unavailable'); return r.json(); }).then(data => {
  const c = data.contributions;
  document.querySelector('#contribution-total').textContent = number.format(c.total);
  document.querySelector('#active-days').textContent = number.format(c.activeDays);
  document.querySelector('#stats-period').textContent = `${dateFormat.format(new Date(c.periodFrom))} - ${dateFormat.format(new Date(c.periodTo))}`;
  const grouped = {};
  c.days.forEach(day => { const month = day.date.slice(0,7); grouped[month] = (grouped[month] || 0) + day.count; });
  const entries = Object.entries(grouped);
  const max = Math.max(...Object.values(grouped),1);
  const monthNames = isRu ? ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'] : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const bars = document.createElement('div'); bars.className = 'month-bars';
  bars.style.gridTemplateColumns = `repeat(${entries.length},minmax(0,1fr))`;
  bars.setAttribute('role','list'); bars.setAttribute('aria-label', isRu ? 'Действия GitHub по месяцам' : 'GitHub contributions by month');
  entries.forEach(([month,count]) => {
    const item = document.createElement('div'); item.className = 'month'; item.tabIndex = 0; item.setAttribute('role','listitem');
    item.title = `${month}: ${count}`; item.setAttribute('aria-label', `${month}: ${count} ${isRu ? 'действий' : 'contributions'}`);
    item.style.setProperty('--height', `${count/max*72}%`);
    const amount = document.createElement('span'); amount.className = 'amount'; amount.textContent = count;
    const bar = document.createElement('span'); bar.className = 'bar';
    const label = document.createElement('span'); label.className = 'label'; label.textContent = monthNames[Number(month.slice(5))-1];
    item.append(amount,bar,label); bars.append(item);
  });
  document.querySelector('#monthly-chart').replaceChildren(bars);
}).catch(() => {
  document.querySelector('[data-chart="calendar"]').click();
  document.querySelector('[data-chart="months"]').hidden = true;
});
