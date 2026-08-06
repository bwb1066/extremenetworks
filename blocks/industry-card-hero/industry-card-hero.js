/*
 * industry-card-hero
 * Leads the "Solutions by industry" section: a full-width header row (the
 * "Show All Solutions" call to action) plus the first industry tile. The block
 * itself is display:contents so the header and the tile drop into the shared
 * grid alongside the sibling .industry-card blocks.
 */

import { buildIndustryTile } from '../industry-card/industry-card.js';

function el(tag, cls) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
}

export default function init(block) {
  const rows = [...block.querySelectorAll(':scope > div')];

  // Header row — the "Show All Solutions" CTA (and any authored link).
  const head = el('div', 'ic-head');
  const headCell = rows.find((r) => !r.querySelector('table'));
  let cta = null;
  let label = 'Show All Solutions';
  if (headCell) {
    label = headCell.textContent.trim() || label;
    const href = headCell.querySelector('a')?.getAttribute('href');
    cta = el(href ? 'a' : 'span', 'ic-showall');
    cta.textContent = label;
    if (href) cta.href = href;
    head.append(cta);
  }

  // Tile row — the typed industry-card table.
  const table = block.querySelector('table');
  const tile = el('div', 'industry-tile ic-tile');
  if (table) {
    const bodyRow = [...table.querySelectorAll(':scope > tbody > tr')].slice(1)[0];
    const bodyCell = bodyRow?.querySelector(':scope > td');
    if (bodyCell) buildIndustryTile(tile, bodyCell);
  }

  block.textContent = '';
  block.append(head, tile);

  // Only the first four tiles (this hero + three cards) show until the CTA
  // reveals the rest. Wire the toggle only when there's more to reveal.
  const blockContent = block.closest('.block-content');
  if (cta && blockContent) {
    const total = blockContent.querySelectorAll('.industry-card').length + 1;
    if (total > 4) {
      cta.addEventListener('click', (e) => {
        e.preventDefault();
        const expanded = blockContent.classList.toggle('industry-expanded');
        cta.classList.toggle('is-open', expanded);
        cta.textContent = expanded ? 'Show Less' : label;
      });
    }
  }
}
