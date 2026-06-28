// Renders ||tekst|| som sværtet indhold der afsløres ved hover.
export function renderRedacted(text) {
  if (!text) return ''
  return text.replace(
    /\|\|(.+?)\|\|/g,
    '<span class="bg-neutral-900 text-neutral-900 hover:text-neutral-100 hover:bg-transparent rounded cursor-pointer transition-colors px-0.5">$1</span>'
  )
}
