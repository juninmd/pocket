/**
 * Extracts plain text from untrusted HTML using an inert document:
 * DOMParser does not load images/stylesheets or run scripts, unlike
 * assigning innerHTML to an element of the live document.
 */
export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  doc.querySelectorAll('script, style, noscript').forEach((el) => el.remove());
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}
