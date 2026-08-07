/*
 * resources-hero
 * "Resources and Insights" — a header (heading + "view all" link) over a grid of
 * typed "resource-card" tables. Each card is a content-type eyebrow
 * (Report / White Paper / eBook), a title, a teaser, and a Learn More link.
 * No imagery; the whole card is the link.
 */

function el(tag, cls) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
}

/* dot indicator for the mobile swipe carousel; hidden on desktop via CSS */
function buildSwipeDots(scroller, wrap) {
  const items = [...scroller.children];
  if (items.length <= 1) return;
  const dots = el('div', 'resources-dots');
  items.forEach(() => dots.append(el('span', 'resources-dot')));
  wrap.append(dots);
  const setActive = (i) => [...dots.children].forEach((d, di) => d.classList.toggle('is-active', di === i));
  setActive(0);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(items.indexOf(e.target)); });
    }, { root: scroller, threshold: 0.6 });
    items.forEach((it) => io.observe(it));
  }
  [...dots.children].forEach((d, i) => d.addEventListener('click', () => {
    items[i].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }));
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
  let eyebrow;
  let title;
  let teaser;
  let ctaText;
  let href;

  [...body.querySelectorAll(':scope > p')].forEach((p) => {
    const text = p.textContent.trim();
    if (!text) return;
    const link = p.querySelector('a');
    if (link) {
      href = link.getAttribute('href');
      ctaText = text;
      return;
    }
    const strong = p.querySelector('strong');
    if (strong && strong.textContent.trim() === text && !title) {
      title = text;
      return;
    }
    if (text.length <= 16 && !eyebrow) {
      eyebrow = text;
      return;
    }
    if (!teaser) teaser = text;
  });

  const card = el(href ? 'a' : 'div', 'resource-card');
  if (href) card.href = href;

  if (eyebrow) {
    const e = el('span', 'resource-eyebrow');
    e.textContent = eyebrow;
    card.append(e);
  }

  // title and teaser share one area; on hover the teaser crossfades in over the
  // title (see CSS), so the copy "replaces the header"
  const swap = el('div', 'resource-swap');
  if (title) {
    const h = el('h3', 'resource-title');
    h.textContent = title;
    swap.append(h);
  }
  if (teaser) {
    const t = el('p', 'resource-teaser');
    t.textContent = teaser;
    swap.append(t);
  }
  card.append(swap);

  const cta = el('span', 'resource-cta');
  cta.textContent = ctaText || 'Learn More';
  card.append(cta);
  return card;
}

export default function init(block) {
  const rows = [...block.querySelectorAll(':scope > div')];

  const headRow = rows.find((r) => !r.querySelector('table'));
  const head = el('div', 'resources-head');
  if (headRow) {
    const cell = headRow.querySelector(':scope > div') || headRow;
    while (cell.firstElementChild) head.append(cell.firstElementChild);
    const viewall = head.querySelector('p');
    if (viewall) {
      // drop AK's auto button-decoration so it renders as a plain link
      viewall.className = 'resources-viewall';
      viewall.querySelector('a')?.removeAttribute('class');
    }
  }

  const grid = el('div', 'resources-grid');
  [...block.querySelectorAll(':scope table')].forEach((table) => {
    const type = (table.querySelector(':scope > tbody > tr')?.textContent || '').trim().toLowerCase();
    if (type !== 'resource-card') return;
    grid.append(buildCard(tableBody(table)));
  });

  block.textContent = '';
  if (head.children.length) block.append(head);
  if (grid.children.length) {
    block.append(grid);
    buildSwipeDots(grid, block);
  }
}
