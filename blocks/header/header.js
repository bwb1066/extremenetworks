import { getConfig, getMetadata } from '../../scripts/ak.js';
import { loadFragment } from '../fragment/fragment.js';

const { locale } = getConfig();

const HEADER_PATH = '/fragments/nav/header';

/* Each mega menu carries a promo down its right side, authored one document per
   nav item and named after it: "Products & Solutions" → products-and-solutions.
   An item with nothing authored simply opens without one. */
const PROMO_PATH = '/fragments/promos/header';

/* Above this many links a pane lists them in columns instead of a pill row. */
const PANE_PILL_MAX = 6;

const ICON_SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>';
const ICON_USER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="10" r="3.2"/><path d="M6.2 19a6.2 6.2 0 0 1 11.6 0"/></svg>';
const ICON_SPARKLE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M11 2l1.7 5.1L18 8.7l-5.3 1.7L11 15l-1.7-4.6L4 8.7l5.3-1.6z"/><path d="M18.5 13.2l.85 2.45 2.45.85-2.45.85-.85 2.45-.85-2.45L15.2 16.5l2.45-.85z"/></svg>';
const ICON_MENU = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
const ICON_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19"/></svg>';

/* The sparkle action opens Onyx, the Brand Concierge. The widget is a remote
   module — nothing is fetched until the user hovers (prefetch) or clicks. */
function wireConcierge(btn) {
  const glue = () => import('./concierge.js');
  let warmed = false;
  const warm = () => {
    if (warmed) return;
    warmed = true;
    glue().then((m) => m.prefetch()).catch(() => { /* prefetch is best-effort */ });
  };
  btn.addEventListener('pointerenter', warm);
  btn.addEventListener('focus', warm);
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    try {
      const { default: openConcierge } = await glue();
      await openConcierge();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('brand concierge failed to open', e);
    } finally {
      btn.disabled = false;
    }
  });
}

/* The concierge trigger is not authored — it belongs to the code, so it is
   injected into the utility strip next to the authored items. */
function buildConciergeAction() {
  const li = document.createElement('li');
  li.className = 'util-concierge';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'util-link nav-action-concierge';
  btn.innerHTML = `${ICON_SPARKLE}<span>Ask Onyx</span>`;
  wireConcierge(btn);
  li.append(btn);
  return li;
}

function setToggleState(btn, open) {
  btn.setAttribute('aria-expanded', String(open));
  btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  btn.innerHTML = open ? ICON_CLOSE : ICON_MENU;
}

/* Hamburger — only shown below the desktop breakpoint, where the nav collapses
   into a panel under the bar. */
function buildNavToggle(root) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-toggle';
  setToggleState(btn, false);
  btn.addEventListener('click', () => {
    const open = !root.classList.contains('is-nav-open');
    root.classList.toggle('is-nav-open', open);
    setToggleState(btn, open);
    if (!open) root.querySelectorAll('li.is-open').forEach((li) => li.classList.remove('is-open'));
  });
  return btn;
}

function closeNav(root) {
  if (!root.classList.contains('is-nav-open')) return;
  root.classList.remove('is-nav-open');
  const btn = root.querySelector('.nav-toggle');
  if (btn) setToggleState(btn, false);
}

function closeAll(root) {
  root.querySelectorAll('li.is-open').forEach((li) => {
    li.classList.remove('is-open');
    const trigger = li.querySelector(':scope > .nav-trigger, :scope > p > .nav-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
  });
}

/** The label an item was authored with, ignoring anything in its sub-list. */
function labelOf(li) {
  // once decorated the label lives in the trigger, before that in the authored <p>
  const el = li.querySelector(':scope > .nav-trigger, :scope > p');
  if (el) return el.textContent.replace(/\s+/g, ' ').trim();
  return [...li.childNodes]
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* The thing that opens a menu. Authored labels with a link keep it — the href
   stays as the landing page for middle-click and crawlers, the click just
   opens the panel instead. Labels authored as plain text become buttons so
   they are reachable by keyboard. */
function makeTrigger(li) {
  const link = li.querySelector(':scope > a, :scope > p > a');
  if (link) {
    link.classList.add('nav-trigger');
    link.setAttribute('role', 'button');
    return link;
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'nav-trigger';
  btn.textContent = labelOf(li);
  li.querySelectorAll(':scope > p').forEach((p) => p.remove());
  [...li.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).forEach((n) => n.remove());
  li.prepend(btn);
  return btn;
}

/** "Products & Solutions" → "products-and-solutions" */
const slugify = (label) => label
  .toLowerCase()
  .replace(/&/g, ' and ')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');

/* The promo is authored as a title, a line of copy, a call to action and an
   image — tag each so the panel can lay them out. */
function decoratePromo(promo) {
  let titled = false;
  for (const p of promo.querySelectorAll('p')) {
    if (p.querySelector('picture, img')) {
      p.classList.add('promo-media');
    } else if (p.querySelector('a')) {
      p.classList.add('promo-cta');
    } else if (!titled && p.querySelector('strong')) {
      p.classList.add('promo-title');
      titled = true;
    } else {
      p.classList.add('promo-copy');
    }
  }
}

/* Pull in the item's promo the first time the menu is reached for. Nothing is
   fetched on page load, and an item with no promo authored just stays a
   two-column panel. */
async function loadPromo(li, inner) {
  if (li.dataset.promoState) return;
  li.dataset.promoState = 'loading';
  try {
    const promo = await loadFragment(`${locale.prefix}${PROMO_PATH}/${li.dataset.promoSlug}`);
    promo.classList.add('mega-promo');
    decoratePromo(promo);
    inner.append(promo);
    inner.classList.add('has-promo');
    li.dataset.promoState = 'loaded';
  } catch {
    li.dataset.promoState = 'none';
  }
}

/* One group's side of the mega menu: everything the author put in the group
   besides its label, so an inlined nav fragment lands in the pane alongside
   the links. */
function buildPane(group, links, id) {
  const pane = document.createElement('div');
  pane.className = 'mega-pane';
  pane.id = id;
  links.classList.add('pane-links');
  const count = links.querySelectorAll(':scope > li').length;
  pane.classList.add(count > PANE_PILL_MAX ? 'pane-columns' : 'pane-pills');
  const extras = [...group.children].filter((c) => c !== links && c.tagName !== 'P');
  pane.append(...extras, links);
  return pane;
}

/* The rail entry that reveals a pane. Hover and focus switch panes too, so the
   menu behaves like the tabs it looks like. */
function buildRailButton(label, pane, rail, panes) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'rail-btn';
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', pane.id);
  btn.textContent = label;
  const activate = () => {
    rail.querySelectorAll('.rail-btn').forEach((b) => {
      b.classList.remove('is-active');
      b.setAttribute('aria-expanded', 'false');
    });
    panes.querySelectorAll('.mega-pane').forEach((p) => p.classList.remove('is-active'));
    btn.classList.add('is-active');
    btn.setAttribute('aria-expanded', 'true');
    pane.classList.add('is-active');
  };
  btn.addEventListener('click', activate);
  btn.addEventListener('pointerenter', activate);
  btn.addEventListener('focus', activate);
  return btn;
}

/**
 * Rebuild a mega menu's authored groups into a rail of group names plus one
 * pane each, so the pane shows whatever the group holds — its links, and any
 * nav fragment the author dropped in for the promo side.
 */
function buildMega(li, groups) {
  const inner = document.createElement('div');
  inner.className = 'mega-inner';
  const rail = document.createElement('ul');
  rail.className = 'mega-rail';
  const panes = document.createElement('div');
  panes.className = 'mega-panes';

  let first = null;
  for (const [idx, group] of groups.entries()) {
    const links = group.querySelector(':scope > ul');
    const label = labelOf(group);
    const railItem = document.createElement('li');

    if (links) {
      const pane = buildPane(group, links, `${li.dataset.navId}-p${idx}`);
      const btn = buildRailButton(label, pane, rail, panes);
      railItem.append(btn);
      panes.append(pane);
      if (!first) first = { btn, pane };
    } else {
      // a group with no sub-list is a plain link in the rail — it navigates
      const link = group.querySelector(':scope > a, :scope > p > a');
      if (link) {
        link.classList.add('rail-link');
        railItem.append(link);
      } else {
        railItem.classList.add('rail-text');
        railItem.textContent = label;
      }
    }
    rail.append(railItem);
  }

  // the menu always opens on its first group rather than an empty right side
  if (first) {
    first.btn.classList.add('is-active');
    first.btn.setAttribute('aria-expanded', 'true');
    first.pane.classList.add('is-active');
  }

  inner.append(rail, panes);
  return inner;
}

function wireDropdowns(topList, root, { mega = false } = {}) {
  // items with no sub-list are leaf links — they just navigate
  const items = [...topList.querySelectorAll(':scope > li')]
    .map((li, idx) => ({ li, idx, panel: li.querySelector(':scope > ul') }))
    .filter(({ panel }) => panel);

  for (const { li, idx, panel } of items) {
    li.dataset.navId = `nav-${mega ? 'p' : 'u'}${idx}`;
    li.classList.add('has-panel');

    const groups = [...panel.querySelectorAll(':scope > li')];
    const grouped = groups.filter((g) => g.querySelector(':scope > ul'));
    li.classList.add(mega ? 'is-mega' : 'is-drop');

    const trigger = makeTrigger(li);
    trigger.setAttribute('aria-expanded', 'false');

    if (mega) {
      li.dataset.promoSlug = slugify(labelOf(li));
      const inner = buildMega(li, groups);
      // one group has nothing to switch between, so the rail is dropped; with
      // none at all the rail is the menu, holding the links itself
      if (grouped.length === 1) inner.classList.add('no-rail');
      panel.replaceWith(inner);
      // warm the promo on approach so it is there by the time the panel opens
      trigger.addEventListener('pointerenter', () => loadPromo(li, inner));
      trigger.addEventListener('focus', () => loadPromo(li, inner));
      trigger.addEventListener('click', () => loadPromo(li, inner));
    } else {
      panel.classList.add('drop-list');
      // a single authored group would nest the links one level deeper than the
      // dropdown needs — lift them so the drop is one flat list
      const only = grouped.length === 1 ? grouped[0] : null;
      const lifted = only?.querySelector(':scope > ul');
      if (lifted) {
        const heading = only.querySelector(':scope > p');
        if (heading && heading.textContent.trim() === labelOf(li)) heading.remove();
        panel.replaceChildren(...lifted.children);
      }
    }

    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      const open = li.classList.contains('is-open');
      closeAll(root);
      li.classList.toggle('is-open', !open);
      trigger.setAttribute('aria-expanded', String(!open));
    });
  }
}

/* Utility strip: Log In and Language & Region are authored as groups and become
   dropdowns; Search is authored as a bare label. Each item is tagged so CSS can
   hang the right glyph off it. */
function decorateUtility(section, root) {
  section.classList.add('utility-nav');
  const topList = section.querySelector('ul');
  if (!topList) return;
  topList.classList.add('utility-nav-list');
  wireDropdowns(topList, root);

  for (const li of topList.querySelectorAll(':scope > li')) {
    const label = labelOf(li);
    // dropdowns own a trigger by now; a bare label is still just its paragraph
    const target = li.querySelector(':scope > .nav-trigger, :scope > a, :scope > p') || li;
    if (/log\s*in|sign\s*in|account/i.test(label)) {
      li.classList.add('util-login');
      target.insertAdjacentHTML('afterbegin', ICON_USER);
    } else if (/language|region|country/i.test(label)) {
      li.classList.add('util-locale');
      // the strip shows the region you are in, not the label of the chooser
      const region = (locale.prefix || '/us').replace('/', '').toUpperCase();
      const text = [...target.childNodes].find((n) => n.nodeType === Node.TEXT_NODE);
      if (text) text.textContent = region;
      else target.textContent = region;
    } else if (/search/i.test(label)) {
      li.classList.add('util-search');
      target.insertAdjacentHTML('afterbegin', ICON_SEARCH);
    }
    target.classList.add('util-link');
  }

  topList.append(buildConciergeAction());
}

/* Brand logo: the authored asset is already the purple lockup, so it is shown
   as-is rather than recolored. */
function decorateBrand(section) {
  const img = section.querySelector(':scope > .default-content > p img, :scope > p img');
  if (!img) return;
  const p = img.closest('p');
  p.classList.add('brand');
  if (img.closest('a')) return;
  // an unlinked logo is a dead end — send it home
  const link = document.createElement('a');
  link.href = `${locale.prefix}/`;
  link.setAttribute('aria-label', img.getAttribute('alt')?.trim() || 'Extreme Networks');
  link.append(img.closest('picture') || img);
  p.replaceChildren(link);
}

function decoratePrimary(section, root) {
  section.classList.add('primary-nav');
  const topList = section.querySelector('ul');
  if (!topList) return;
  topList.classList.add('primary-nav-list');
  wireDropdowns(topList, root, { mega: true });
  // the authored CTA is the last item — pull it out of the list flow
  const cta = topList.querySelector(':scope > li:last-child .btn');
  if (cta) cta.closest('li').classList.add('primary-nav-cta');
}

/* The banner and the utility strip fold away once the page scrolls, so only the
   nav bar itself stays stuck to the top. */
function wireScrollCollapse(fragment) {
  let ticking = false;
  const update = () => {
    fragment.classList.toggle('is-scrolled', window.scrollY > 24);
    ticking = false;
  };
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }, { passive: true });
  update();
}

/**
 * Loads and decorates the header from the authored nav fragment. Sections are
 * matched by what they hold rather than their order, so an extra section (the
 * notification banner) doesn't shift the nav:
 *   - the section holding the notification-banner block → banner
 *   - the section holding the logo → primary nav
 *   - the remaining list section → utility strip
 * @param {Element} el The header element
 */
export default async function init(el) {
  const path = getMetadata('header') || HEADER_PATH;
  const fragment = await loadFragment(`${locale.prefix}${path}`);
  fragment.classList.add('header-content');

  const sections = [...fragment.querySelectorAll(':scope > .section')];
  const banner = sections.find((s) => s.querySelector('.notification-banner'));
  const primary = sections.find((s) => s !== banner && s.querySelector('img'));
  const utility = sections.find((s) => s !== banner && s !== primary && s.querySelector('ul'));

  if (banner) banner.classList.add('nav-banner');
  if (utility) decorateUtility(utility, fragment);
  if (primary) {
    decorateBrand(primary);
    decoratePrimary(primary, fragment);
    const bar = primary.querySelector('.default-content');
    if (bar) bar.prepend(buildNavToggle(fragment));
  }

  el.append(fragment);
  wireScrollCollapse(fragment);

  // Close any open panel (and the mobile nav) on outside click or Escape.
  document.addEventListener('click', (e) => {
    if (e.target.closest('header')) return;
    closeAll(fragment);
    closeNav(fragment);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    closeAll(fragment);
    closeNav(fragment);
  });
}
