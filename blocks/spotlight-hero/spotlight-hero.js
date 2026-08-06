/*
 * spotlight-hero
 * A horizontal carousel of news / spotlight cards. Each card is a typed
 * "spotlight-card" table: an optional image, a short category eyebrow
 * (NEWS / DEMO / TOUR / CALCULATOR), a headline, an optional teaser, and a CTA.
 * Row 0 of the block is a decorative image we don't render.
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

  // Classify the paragraphs: CTA (has link) → button text; short → eyebrow; long → teaser.
  let eyebrow;
  let teaser;
  let ctaText;
  [...body.querySelectorAll(':scope > p')].forEach((p) => {
    const text = p.textContent.trim();
    if (!text) return; // emptied image holder
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

export default function init(block) {
  const track = el('div', 'spotlight-track');
  [...block.querySelectorAll(':scope table')].forEach((table) => {
    const rows = [...table.querySelectorAll(':scope > tbody > tr')];
    const type = (rows[0]?.textContent || '').trim().toLowerCase();
    if (type !== 'spotlight-card') return;
    track.append(buildCard(tableBody(table)));
  });

  block.textContent = '';
  if (track.children.length) block.append(track);
}
