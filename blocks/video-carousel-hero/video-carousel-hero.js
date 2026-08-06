/*
 * video-carousel-hero
 * Customer-story cards. A header (heading + "view all" link) sits above a row
 * of typed "video-card" tables. Each card carries a poster/video asset URL
 * (bare link), a headline, a teaser, a "Learn More" case-study link, and a
 * "Watch Video" action. The authored inline play glyph is dropped in favour of
 * a CSS play button.
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

  // Poster + play button, linking to the video asset.
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
  media.append(el('span', 'video-play'));
  card.append(media);

  const content = el('div', 'video-content');
  if (heading) {
    heading.querySelectorAll('a').forEach((a) => {
      const span = el('span');
      span.append(...a.childNodes);
      a.replaceWith(span);
    });
    content.append(heading);
  }
  if (teaser) {
    const t = el('p', 'video-teaser');
    t.textContent = teaser;
    content.append(t);
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
  content.append(actions);
  card.append(content);
  return card;
}

export default function init(block) {
  const rows = [...block.querySelectorAll(':scope > div')];

  // Header row (no table): heading + optional "view all" link.
  const headRow = rows.find((r) => !r.querySelector('table'));
  const head = el('div', 'video-head');
  if (headRow) {
    const cell = headRow.querySelector(':scope > div') || headRow;
    while (cell.firstElementChild) head.append(cell.firstElementChild);
    head.querySelector('p')?.classList.add('video-viewall');
  }

  const track = el('div', 'video-track');
  [...block.querySelectorAll(':scope table')].forEach((table) => {
    const type = (table.querySelector(':scope > tbody > tr')?.textContent || '').trim().toLowerCase();
    if (type !== 'video-card') return;
    track.append(buildCard(tableBody(table)));
  });

  block.textContent = '';
  if (head.children.length) block.append(head);
  if (track.children.length) block.append(track);
}
