import { getConfig, getMetadata } from '../../scripts/ak.js';
import { loadFragment } from '../fragment/fragment.js';

const FOOTER_PATH = '/fragments/nav/footer';

/* Brand icons, keyed by a substring of the authored link text. */
const SOCIAL_ICONS = {
  facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12z"/></svg>',
  twitter: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.53 3h3.2l-6.99 7.99L22 21h-6.44l-5.04-6.6L4.75 21H1.54l7.48-8.55L2 3h6.6l4.56 6.03zm-1.12 16.06h1.77L7.67 4.84H5.77z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5A2.5 2.5 0 1 0 5 8.5a2.5 2.5 0 0 0-.02-5zM3 9.75h4v11.25H3zM10 9.75h3.83v1.54h.05c.53-1 1.84-2.06 3.79-2.06 4.05 0 4.8 2.67 4.8 6.14V21h-4v-4.98c0-1.19-.02-2.72-1.65-2.72-1.66 0-1.91 1.3-1.91 2.64V21h-4z"/></svg>',
  // evenodd so the play triangle punches a hole rather than filling over the body
  youtube: '<svg viewBox="0 0 24 24" fill="currentColor" fill-rule="evenodd"><path d="M21.6 7.2a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.84.43A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.84-.43a2.5 2.5 0 0 0 1.76-1.77A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8zM10.2 15.1V8.9L15.5 12z"/></svg>',
  instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none"/></svg>',
};

const ICON_CHEVRON = '<svg class="footer-col-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';

const iconFor = (text) => {
  const label = text.toLowerCase();
  // "Twitter / X" and a bare "X" both mean the same network
  if (/(^|\W)x($|\W)/.test(label)) return SOCIAL_ICONS.twitter;
  const key = Object.keys(SOCIAL_ICONS).find((k) => label.includes(k));
  return key ? SOCIAL_ICONS[key] : null;
};

/* Turn an SVG/PNG logo <img> into a mask so it can be themed to a solid color
   via CSS background-color (an <img>'s own fill can't be recolored). */
function maskedLogo(img, cls) {
  const span = document.createElement('span');
  span.className = cls;
  span.style.setProperty('--logo-src', `url("${img.currentSrc || img.src}")`);
  if (img.naturalWidth && img.naturalHeight) {
    span.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
  }
  return span;
}

/* Below the breakpoint the link columns collapse behind their heading. The
   toggle is always wired; CSS decides whether it does anything. */
function makeCollapsible(col, heading) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'footer-col-toggle';
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = `<span>${heading.textContent.trim()}</span>${ICON_CHEVRON}`;
  btn.addEventListener('click', () => {
    const open = !col.classList.contains('is-open');
    col.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
  });
  heading.replaceChildren(btn);
}

/* The authored text links become brand icons; the name stays as the link's
   accessible label. */
function iconizeLinks(links) {
  // a video URL here would have been autoblocked into an embed — never wanted
  links.querySelectorAll('.video, iframe').forEach((embed) => embed.closest('li')?.remove());
  for (const a of links.querySelectorAll('a')) {
    const label = a.textContent.trim();
    const icon = iconFor(label);
    if (icon) {
      a.innerHTML = `${icon}<span class="footer-social-label">${label}</span>`;
      a.setAttribute('aria-label', label);
      a.classList.add('footer-social-link');
    }
  }
}

/* A whole authored column of social profiles. */
function decorateSocial(col, links) {
  col.classList.add('footer-social');
  links.classList.add('footer-social-links');
  iconizeLinks(links);
}

/* The bottom bar is authored as one flat list of legal links and social
   profiles mixed together — anything with a known brand icon is pulled out into
   an icon row, the rest stay as text links. */
function splitBottomList(list, container) {
  list.classList.add('footer-legal');
  const social = document.createElement('ul');
  social.className = 'footer-social-links';
  [...list.children]
    .filter((li) => {
      const a = li.querySelector('a');
      return a && iconFor(a.textContent.trim());
    })
    .forEach((li) => social.append(li));
  if (!social.children.length) return;
  iconizeLinks(social);
  container.append(social);
}

/* The authored heading of a column is a <p>, or bare text when the author typed
   the label straight into the list item. */
function getHeading(col) {
  const p = col.querySelector(':scope > p');
  if (p) return p;
  const text = [...col.childNodes]
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => n.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  const heading = document.createElement('p');
  heading.textContent = text;
  [...col.childNodes].filter((n) => n.nodeType === Node.TEXT_NODE).forEach((n) => n.remove());
  col.prepend(heading);
  return heading;
}

/**
 * Loads and decorates the footer from the authored fragment:
 *   first section → an optional brand logo plus a list of link columns
 *                   (Products & Solutions, Industry Solutions, Resources,
 *                    Log In, About, Legal, Follow Us)
 *   last section  → the copyright line
 * The Legal column is lifted out of the grid into the bottom bar, and Follow Us
 * becomes a row of brand icons.
 * @param {Element} el The footer element
 */
export default async function init(el) {
  const { locale } = getConfig();
  const path = getMetadata('footer') || FOOTER_PATH;
  const fragment = await loadFragment(`${locale.prefix}${path}`);
  fragment.classList.add('footer-content');

  const sections = [...fragment.querySelectorAll(':scope > .section')];
  const columns = sections[0];
  const last = sections[sections.length - 1];

  // the bottom bar is the last section when the author split them; otherwise it
  // is created here so the copyright and legal links always have a home
  let bottom = last && last !== columns ? last : null;
  if (!bottom) {
    bottom = document.createElement('div');
    bottom.className = 'section';
    const content = document.createElement('div');
    content.className = 'default-content';
    bottom.append(content);
    fragment.append(bottom);
  }
  bottom.classList.add('footer-bottom');
  const bottomContent = bottom.querySelector('.default-content') || bottom;

  if (columns) {
    columns.classList.add('footer-columns');

    const brandImg = columns.querySelector(':scope > .default-content > p img');
    if (brandImg) {
      const p = brandImg.closest('p');
      p.classList.add('footer-brand');
      const link = brandImg.closest('a');
      const logo = maskedLogo(brandImg, 'footer-brand-logo');
      if (link) {
        link.setAttribute('aria-label', brandImg.getAttribute('alt')?.trim() || 'Extreme Networks');
        link.replaceChildren(logo);
        p.replaceChildren(link);
      } else {
        p.replaceChildren(logo);
      }
    }

    const list = columns.querySelector('ul');
    if (list) {
      list.classList.add('footer-columns-list');
      // a bare item with no links under it isn't a column — the bottom bar
      // handles those
      const cols = [...list.querySelectorAll(':scope > li')].filter((col) => {
        if (col.querySelector(':scope > ul')) return true;
        col.remove();
        return false;
      });

      for (const col of cols) {
        const heading = getHeading(col);
        const links = col.querySelector(':scope > ul');
        const label = (heading?.textContent || '').trim();

        col.classList.add('footer-col');
        links.classList.add('footer-col-links');

        if (/follow|social/i.test(label)) {
          heading?.classList.add('footer-col-heading');
          decorateSocial(col, links);
        } else if (/^legal$/i.test(label)) {
          // the legal links read as an inline row in the bottom bar
          col.remove();
          links.classList.add('footer-legal');
          links.classList.remove('footer-col-links');
          bottomContent.append(links);
        } else {
          heading?.classList.add('footer-col-heading');
          if (heading) makeCollapsible(col, heading);
        }
      }
      // the copyright is often authored right after the list, in the same section
      const stray = [...columns.querySelectorAll(':scope > .default-content > p')]
        .filter((p) => !p.classList.contains('footer-brand') && p.textContent.trim());
      stray.forEach((p) => bottomContent.append(p));
    }
  }

  const copyright = bottomContent.querySelector(':scope > p');
  if (copyright) copyright.classList.add('footer-copyright');

  const bottomList = bottomContent.querySelector(':scope > ul:not(.footer-social-links)');
  if (bottomList) splitBottomList(bottomList, bottomContent);

  el.append(fragment);
}
