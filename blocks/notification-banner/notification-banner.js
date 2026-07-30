/**
 * Notification banner — the promo strip above the nav.
 * Authored as one row of two cells: the message, then the call to action.
 * @param {Element} el The block element
 */
export default async function init(el) {
  const [row] = el.children;
  if (!row) return;
  const [message, action] = row.children;
  row.classList.add('banner-row');
  message?.classList.add('banner-message');
  action?.classList.add('banner-action');
}
