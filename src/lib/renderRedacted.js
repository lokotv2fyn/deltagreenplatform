// Renders ||text|| as redacted content revealed on hover.
// HTML-escape happens before regex replacement so user content is never injected raw.
export function renderRedacted(text) {
  if (!text) return ''
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
  return escaped.replace(
    /\|\|(.+?)\|\|/g,
    '<span class="bg-neutral-900 text-neutral-900 hover:text-neutral-100 hover:bg-transparent rounded cursor-pointer transition-colors px-0.5">$1</span>'
  )
}
