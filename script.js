const root = document.documentElement;
const isRu = root.lang === 'ru';
const themeButton = document.querySelector('#theme-toggle');
function setTheme(theme) {
  root.dataset.theme = theme;
  themeButton.setAttribute('aria-label', isRu ? (theme === 'dark' ? 'Светлая тема' : 'Тёмная тема') : (theme === 'dark' ? 'Light theme' : 'Dark theme'));
  try { localStorage.setItem('portfolio-theme', theme); } catch {}
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#171c18' : '#f4f5f0';
}
setTheme(root.dataset.theme || 'light');
themeButton.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

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
