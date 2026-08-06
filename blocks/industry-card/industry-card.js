/*
 * industry-card
 * One tile in the "Solutions by industry" grid: a background image with the
 * industry name overlaid and a full-tile link. Authored as a single cell
 * holding an image and an h2 whose link is the destination.
 */

function el(tag, cls) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
}

export function buildIndustryTile(block, cell) {
  const pic = cell.querySelector('picture');
  const h2 = cell.querySelector('h2');
  const href = cell.querySelector('a')?.getAttribute('href');

  const media = el('div', 'industry-media');
  if (pic) media.append(pic);

  if (h2) {
    h2.querySelectorAll('a').forEach((a) => {
      const span = el('span');
      span.append(...a.childNodes);
      a.replaceWith(span);
    });
  }

  block.textContent = '';
  block.classList.add('industry-tile');
  if (pic) block.append(media);
  if (h2) block.append(h2);
  if (href) {
    const link = el('a', 'industry-link');
    link.href = href;
    link.setAttribute('aria-label', h2?.textContent.trim() || 'View solution');
    block.append(link);
  }
}

export default function init(block) {
  const cell = block.querySelector(':scope > div > div') || block;
  buildIndustryTile(block, cell);
}
