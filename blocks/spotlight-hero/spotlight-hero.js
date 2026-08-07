/*
 * spotlight-hero
 * A paginated "Spotlight" carousel: each page shows one large card on the left
 * and two stacked cards on the right (three per page). A segmented progress bar
 * and prev/next switcher page through the set. Cards are dark with white text,
 * a category eyebrow, a headline, an optional image, and a CTA.
 */

function el(tag, cls) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
}

function unlink(scope) {
  scope.querySelectorAll('a').forEach((a) => {
    const span = el('span');
    span.append(...a.childNodes);
    a.replaceWith(span);
  });
}

function tableBody(table) {
  const body = el('div');
  [...table.querySelectorAll(':scope > tbody > tr')].slice(1).forEach((tr) => {
    const td = tr.querySelector(':scope > td');
    while (td && td.firstElementChild) body.append(td.firstElementChild);
  });
  return body;
}

function buildCard(body) {
  const card = el('a', 'spotlight-card');
  const href = body.querySelector('a')?.getAttribute('href');
  if (href) card.href = href;

  const pic = body.querySelector('picture');
  if (pic) {
    const media = el('div', 'spotlight-media');
    media.append(pic);
    card.append(media);
  }

  const content = el('div', 'spotlight-content');

  let eyebrow;
  let teaser;
  let ctaText;
  [...body.querySelectorAll(':scope > p')].forEach((p) => {
    const text = p.textContent.trim();
    if (!text) return;
    if (p.querySelector('a')) ctaText = text;
    else if (!eyebrow && text.length <= 16) eyebrow = text;
    else if (!teaser) teaser = text;
  });

  const heading = body.querySelector('h1, h2, h3, h4');
  if (heading) {
    unlink(heading);
    heading.querySelectorAll('br').forEach((b) => b.remove());
  }

  if (eyebrow) {
    const e = el('span', 'spotlight-eyebrow');
    e.textContent = eyebrow;
    content.append(e);
  }
  if (heading) content.append(heading);
  if (teaser) {
    const t = el('p', 'spotlight-teaser');
    t.textContent = teaser;
    content.append(t);
  }
  const cta = el('span', 'spotlight-cta');
  cta.textContent = ctaText || 'Learn More';
  content.append(cta);

  card.append(content);
  return card;
}

const ARROW = (d) => `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;

export default function init(block) {
  const rows = [...block.querySelectorAll(':scope > div')];
  const headText = (rows[0]?.querySelector('table') ? '' : rows[0]?.textContent.trim()) || 'Spotlight';

  const cards = [...block.querySelectorAll(':scope table')]
    .filter((t) => (t.querySelector(':scope > tbody > tr')?.textContent || '').trim().toLowerCase() === 'spotlight-card')
    .map((t) => buildCard(tableBody(t)));

  block.textContent = '';
  if (!cards.length) return;

  const head = el('div', 'spotlight-head');
  const h2 = el('h2');
  h2.textContent = headText;
  head.append(h2);

  const viewport = el('div', 'spotlight-viewport');
  const track = el('div', 'spotlight-track');
  const pages = [];
  for (let i = 0; i < cards.length; i += 3) {
    const page = el('div', 'spotlight-page');
    cards.slice(i, i + 3).forEach((c, idx) => {
      if (idx === 0) c.classList.add('is-large');
      page.append(c);
    });
    pages.push(page);
    track.append(page);
  }
  viewport.append(track);

  const controls = el('div', 'spotlight-controls');
  const progress = el('div', 'spotlight-progress');
  pages.forEach(() => progress.append(el('span', 'spotlight-seg')));

  const nav = el('div', 'spotlight-nav');
  const prev = el('button', 'spotlight-arrow spotlight-prev');
  const next = el('button', 'spotlight-arrow spotlight-next');
  prev.type = 'button';
  next.type = 'button';
  prev.setAttribute('aria-label', 'Previous');
  next.setAttribute('aria-label', 'Next');
  prev.innerHTML = ARROW('m15 18-6-6 6-6');
  next.innerHTML = ARROW('m9 18 6-6-6-6');
  nav.append(prev, next);
  controls.append(progress, nav);

  block.append(head, viewport, controls);

  let page = 0;
  const update = () => {
    track.style.transform = `translateX(-${page * 100}%)`;
    [...progress.children].forEach((s, i) => s.classList.toggle('is-active', i === page));
    prev.disabled = page === 0;
    next.disabled = page === pages.length - 1;
  };
  prev.addEventListener('click', () => {
    if (page > 0) {
      page -= 1;
      update();
    }
  });
  next.addEventListener('click', () => {
    if (page < pages.length - 1) {
      page += 1;
      update();
    }
  });
  progress.querySelectorAll('.spotlight-seg').forEach((seg, i) => {
    seg.addEventListener('click', () => {
      page = i;
      update();
    });
  });
  if (pages.length <= 1) controls.style.display = 'none';
  update();

  // Mobile: one card per view via native scroll-snap (desktop paging/transform
  // is neutralised in CSS). A per-card dot row tracks the track's scroll.
  if (cards.length > 1) {
    const mdots = el('div', 'spotlight-mdots');
    cards.forEach(() => mdots.append(el('span', 'spotlight-mdot')));
    block.append(mdots);
    const setActive = (i) => [...mdots.children].forEach((d, di) => d.classList.toggle('is-active', di === i));
    setActive(0);
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(cards.indexOf(e.target)); });
      }, { root: track, threshold: 0.6 });
      cards.forEach((c) => io.observe(c));
    }
    [...mdots.children].forEach((d, i) => d.addEventListener('click', () => {
      cards[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }));
  }
}
