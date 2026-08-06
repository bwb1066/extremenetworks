/*
 * video-carousel-hero
 * A coverflow of customer-story cards on the navy section: the active card is
 * centered and bright with a video/poster and a content panel; neighbours peek,
 * dimmed, on either side. A row of circular poster avatars switches the active
 * story. Each card carries a poster/video asset, a headline, a teaser, a
 * "Learn More" case-study link and a "Watch Video" action.
 */

function el(tag, cls) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
}

function tableBody(table) {
  const body = el('div');
  [...table.querySelectorAll(':scope > tbody > tr')].slice(1).forEach((tr) => {
    const td = tr.querySelector(':scope > td');
    while (td && td.firstElementChild) body.append(td.firstElementChild);
  });
  return body;
}

function isAssetUrl(href) {
  return /sitecorecontenthub|\/api\/public\/content\/|\.mp4|\.mov|\.webm/i.test(href || '');
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const RING_R = 47;

/* the clock-dial ring that sweeps around the active avatar */
function progressRing() {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'video-avatar-ring');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', '50');
  circle.setAttribute('cy', '50');
  circle.setAttribute('r', String(RING_R));
  svg.append(circle);
  return svg;
}

function buildCard(body) {
  const links = [...body.querySelectorAll('a')];
  const videoLink = links.find((a) => isAssetUrl(a.getAttribute('href')))
    || links.find((a) => a.textContent.trim() === a.getAttribute('href'));
  const learnLink = links.find((a) => a !== videoLink);
  const videoUrl = videoLink?.getAttribute('href');
  const learnUrl = learnLink?.getAttribute('href');

  const heading = body.querySelector('h1, h2, h3, h4');
  const teaser = [...body.querySelectorAll(':scope > p')]
    .find((p) => !p.querySelector('a') && p.textContent.trim())?.textContent.trim();

  const card = el('div', 'video-card');
  card.dataset.poster = videoUrl || '';

  const media = el(videoUrl ? 'a' : 'div', 'video-media');
  if (videoUrl) {
    media.href = videoUrl;
    media.target = '_blank';
    media.rel = 'noopener';
    media.setAttribute('aria-label', `Watch: ${heading?.textContent.trim() || 'video'}`);
    const img = el('img');
    img.src = videoUrl;
    img.alt = '';
    img.loading = 'lazy';
    media.append(img);
  }
  card.append(media);

  const panel = el('div', 'video-panel');
  if (heading) {
    heading.querySelectorAll('a').forEach((a) => {
      const span = el('span');
      span.append(...a.childNodes);
      a.replaceWith(span);
    });
    panel.append(heading);
  }
  if (teaser) {
    const t = el('p', 'video-teaser');
    t.textContent = teaser;
    panel.append(t);
  }

  const actions = el('div', 'video-actions');
  if (learnUrl) {
    const learn = el('a', 'video-learn');
    learn.href = learnUrl;
    learn.textContent = 'Learn More';
    actions.append(learn);
  }
  if (videoUrl) {
    const watch = el('a', 'video-watch');
    watch.href = videoUrl;
    watch.target = '_blank';
    watch.rel = 'noopener';
    watch.textContent = 'Watch Video';
    actions.append(watch);
  }
  panel.append(actions);
  card.append(panel);
  return card;
}

export default function init(block) {
  const rows = [...block.querySelectorAll(':scope > div')];

  const headRow = rows.find((r) => !r.querySelector('table'));
  const head = el('div', 'video-head');
  if (headRow) {
    const cell = headRow.querySelector(':scope > div') || headRow;
    while (cell.firstElementChild) head.append(cell.firstElementChild);
    head.querySelector('p')?.classList.add('video-viewall');
  }

  const cards = [...block.querySelectorAll(':scope table')]
    .filter((t) => (t.querySelector(':scope > tbody > tr')?.textContent || '').trim().toLowerCase() === 'video-card')
    .map((t) => buildCard(tableBody(t)));

  block.textContent = '';
  if (head.children.length) block.append(head);
  if (!cards.length) return;

  const viewport = el('div', 'video-viewport');
  const track = el('div', 'video-track');
  cards.forEach((c) => track.append(c));
  viewport.append(track);

  const dots = el('div', 'video-avatars');
  const avatars = cards.map((c, i) => {
    const btn = el('button', 'video-avatar');
    btn.type = 'button';
    btn.setAttribute('aria-label', `Story ${i + 1}`);
    if (c.dataset.poster) {
      const img = el('img');
      img.src = c.dataset.poster;
      img.alt = '';
      img.loading = 'lazy';
      btn.append(img);
    }
    btn.append(progressRing());
    dots.append(btn);
    return btn;
  });

  block.append(viewport, dots);

  const CIRC = 2 * Math.PI * RING_R;
  const DURATION = 5000;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let active = 0;
  let ringAnim = null;

  function centerActive() {
    const c = cards[active];
    const offset = viewport.clientWidth / 2 - (c.offsetLeft + c.offsetWidth / 2);
    track.style.transform = `translateX(${offset}px)`;
  }

  // Highlight/center the active story, then sweep its ring over DURATION; when
  // the ring finishes, advance to the next story so the dial and the
  // auto-advance stay in lockstep.
  function render() {
    cards.forEach((c, i) => c.classList.toggle('is-active', i === active));
    avatars.forEach((a, i) => a.classList.toggle('is-active', i === active));
    centerActive();

    if (ringAnim) ringAnim.cancel();
    if (reduceMotion || cards.length <= 1) return;
    const circle = avatars[active].querySelector('circle');
    if (!circle || !circle.animate) return;
    ringAnim = circle.animate(
      [{ strokeDashoffset: CIRC }, { strokeDashoffset: 0 }],
      { duration: DURATION, easing: 'linear' },
    );
    ringAnim.onfinish = () => {
      active = (active + 1) % cards.length;
      render();
    };
  }

  avatars.forEach((btn, i) => btn.addEventListener('click', () => {
    active = i;
    render();
  }));
  window.addEventListener('resize', centerActive);
  if (cards.length <= 1) dots.style.display = 'none';
  render();
  // re-center once posters have loaded and can affect layout
  window.requestAnimationFrame(centerActive);
}
