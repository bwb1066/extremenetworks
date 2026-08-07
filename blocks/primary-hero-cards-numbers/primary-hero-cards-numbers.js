/*
 * primary-hero-cards-numbers
 * The extremenetworks.com homepage opener: a purple hero, a cluster of product
 * feature cards, and a band of trust stats. The content is authored as nested
 * "typed" tables — each table's first row names the card type (hero,
 * extreme-platform-one-card, card) and the following rows hold its body. The
 * stat row is a plain 3-cell row with no tables.
 */

function el(tag, cls) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
}

/* pull the type label and a flat list of body elements out of a typed table */
function tableParts(table) {
  const rows = [...table.querySelectorAll(':scope > tbody > tr')];
  const type = (rows[0]?.textContent || '').trim().toLowerCase();
  const body = el('div', 'phcn-raw');
  rows.slice(1).forEach((tr) => {
    const td = tr.querySelector(':scope > td');
    while (td && td.firstElementChild) body.append(td.firstElementChild);
  });
  return { type, body };
}

/* strip nested anchors down to spans so the whole card can be one link */
function unlink(scope) {
  scope.querySelectorAll('a').forEach((a) => {
    const span = el('span');
    span.append(...a.childNodes);
    a.replaceWith(span);
  });
}

function dropEmptyParagraphs(scope) {
  scope.querySelectorAll('p').forEach((p) => {
    if (!p.textContent.trim() && !p.querySelector('picture, img')) p.remove();
  });
}

/* A vertically-rotating word cycled through the authored tagline list, matching
   the live site's "Transforming Networking with Extreme <word>." treatment. */
function buildRotator(words) {
  const rot = el('span', 'phcn-rotator');
  const track = el('span', 'phcn-rotator-track');
  [...words, words[0]].forEach((w) => {
    const s = el('span', 'phcn-word');
    s.textContent = w;
    track.append(s);
  });
  rot.append(track);

  let i = 0;
  setInterval(() => {
    i += 1;
    track.style.transform = `translateY(-${i * 1.25}em)`;
    if (i === words.length) {
      // landed on the appended clone of the first word — snap back seamlessly
      setTimeout(() => {
        track.style.transition = 'none';
        track.style.transform = 'translateY(0)';
        i = 0;
        track.getBoundingClientRect(); // force reflow before restoring the transition
        track.style.transition = '';
      }, 520);
    }
  }, 2200);
  return rot;
}

/* Wrap the heading's last word ("Extreme") plus the rotating word in an accent
   span, e.g. "Transforming Networking with [Extreme Automation.]". */
function decorateHeadingRotator(h1, rawWords) {
  const words = rawWords
    .map((w) => w.trim())
    .filter(Boolean)
    .map((w) => {
      const cap = w.charAt(0).toUpperCase() + w.slice(1);
      return /[.!?]$/.test(cap) ? cap : `${cap}.`;
    });
  if (!words.length) return;

  const text = h1.textContent.trim();
  const m = text.match(/^(.*\s)(\S+)$/);
  h1.textContent = '';
  h1.append(document.createTextNode(m ? m[1] : `${text} `));
  const accent = el('span', 'phcn-accent');
  accent.append(document.createTextNode(`${m ? m[2] : ''} `));
  accent.append(buildRotator(words));
  h1.append(accent);
}

function buildHero(hero, body) {
  const pic = body.querySelector('picture');
  if (pic) {
    const bg = el('div', 'phcn-hero-bg');
    bg.append(pic);
    hero.append(bg);
  }

  const inner = el('div', 'phcn-hero-inner');
  const cta = el('div', 'phcn-cta');
  let words = [];

  [...body.querySelectorAll(':scope > p')].forEach((p) => {
    const link = p.querySelector('a');
    if (link) {
      link.className = '';
      cta.append(link);
      p.remove();
    } else if (p.querySelector('br') || p.querySelectorAll('strong').length > 1) {
      // the tagline word list — becomes the rotating word, not a static list
      words = [...p.querySelectorAll('strong')].map((s) => s.textContent);
      p.remove();
    } else {
      p.classList.add('phcn-lede');
    }
  });

  const h1 = body.querySelector('h1');
  if (h1 && words.length) decorateHeadingRotator(h1, words);

  inner.append(...body.children);
  const links = [...cta.children];
  links[0]?.classList.add('phcn-btn', 'phcn-btn-primary');
  links.slice(1).forEach((a) => a.classList.add('phcn-btn', 'phcn-btn-outline'));
  if (cta.children.length) inner.append(cta);
  hero.append(inner);
}

/* Count each stat up from zero when the band scrolls into view. */
function animateStats(stats) {
  const nums = [...stats.querySelectorAll('.phcn-stat-num strong')];
  const targets = nums.map((n) => {
    const val = parseInt(n.textContent.replace(/,/g, '').trim(), 10);
    return Number.isFinite(val) ? val : null;
  });
  if (!targets.some((t) => t != null)) return;

  const format = (v) => v.toLocaleString('en-US');
  nums.forEach((n, i) => { if (targets[i] != null) n.textContent = '0'; });

  const run = () => {
    const dur = 1600;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const eased = 1 - (1 - p) ** 3;
      nums.forEach((n, i) => {
        if (targets[i] != null) n.textContent = format(Math.round(targets[i] * eased));
      });
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  if (!('IntersectionObserver' in window)) {
    nums.forEach((n, i) => { if (targets[i] != null) n.textContent = format(targets[i]); });
    return;
  }
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      run();
    });
  }, { threshold: 0.4 });
  io.observe(stats);
}

function buildCard(cards, body) {
  const card = el('a', 'phcn-card');

  const firstLink = body.querySelector('a');
  if (firstLink) card.href = firstLink.getAttribute('href');

  // pull the image out first so the emptied <p> can be dropped
  const pic = body.querySelector('picture');
  const media = el('div', 'phcn-card-media');
  if (pic) media.append(pic);

  unlink(body);
  dropEmptyParagraphs(body);

  const content = el('div', 'phcn-card-content');
  content.append(...body.children);

  // relevel the authored h3 to h2 so the page has no h1->h3 skip (a11y
  // heading-order); styling is by class so this is purely semantic
  let heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading && heading.tagName !== 'H2') {
    const h2 = el('h2');
    [...heading.attributes].forEach((a) => h2.setAttribute(a.name, a.value));
    h2.append(...heading.childNodes);
    heading.replaceWith(h2);
    heading = h2;
  }

  // inline chevron on the title, matching the live cards
  if (heading) {
    const chevron = el('span', 'phcn-card-chevron');
    chevron.setAttribute('aria-hidden', 'true');
    heading.append(' ');
    heading.append(chevron);
  }

  // title + copy on top, image flush to the bottom
  card.append(content);
  if (pic) card.append(media);
  cards.append(card);
}

/* dot indicator for the mobile swipe carousel; tracks the scroller and is
   hidden on desktop via CSS */
function buildSwipeDots(scroller, wrap, cls) {
  const items = [...scroller.children];
  if (items.length <= 1) return;
  const dots = el('div', `${cls}-dots`);
  items.forEach(() => dots.append(el('span', `${cls}-dot`)));
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

function buildStats(stats, row) {
  [...row.children].forEach((cell) => {
    const ps = [...cell.querySelectorAll(':scope > p')];
    if (!ps.length) return;
    const stat = el('div', 'phcn-stat');
    ps[0].classList.add('phcn-stat-num');
    ps[1]?.classList.add('phcn-stat-label');
    ps[2]?.classList.add('phcn-stat-sub');
    stat.append(...ps);
    stats.append(stat);
  });
}

export default function init(block) {
  const hero = el('div', 'phcn-hero');
  const cards = el('div', 'phcn-cards');
  const stats = el('div', 'phcn-stats');

  [...block.querySelectorAll(':scope > div table')].forEach((table) => {
    const { type, body } = tableParts(table);
    if (type === 'hero') buildHero(hero, body);
    else buildCard(cards, body);
  });

  [...block.querySelectorAll(':scope > div')]
    .filter((row) => !row.querySelector('table'))
    .forEach((row) => buildStats(stats, row));

  block.textContent = '';
  if (hero.querySelector('.phcn-hero-inner')) block.append(hero);
  if (cards.children.length) {
    const cardsWrap = el('div', 'phcn-cards-wrap');
    cardsWrap.append(cards);
    block.append(cardsWrap);
    buildSwipeDots(cards, cardsWrap, 'phcn-cards');
  }
  if (stats.children.length) {
    const statsWrap = el('div', 'phcn-stats-wrap');
    statsWrap.append(stats);
    block.append(statsWrap);
    animateStats(stats);
  }
}
