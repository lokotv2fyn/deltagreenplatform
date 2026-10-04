import { SKILLS, mergeSkillsData, skillTotal } from '../config/skillsList'

// Exports a character sheet as PDF via the browser's print dialog ("Save as
// PDF"). Rendered into a hidden iframe so popup blockers never interfere and
// no PDF library is needed. Derived values (HP max, SAN max, skill totals)
// are computed the same way CharacterSheet.vue does.

const STATS = ['str', 'con', 'dex', 'int', 'pow', 'cha']

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function show(value) {
  return value === null || value === undefined || value === '' ? '—' : esc(value)
}

function buildHtml(data, playerName, title) {
  const stats = Object.fromEntries(STATS.map(k => [k, data?.stats?.[k] ?? 10]))
  const skills = mergeSkillsData(data?.skills)
  const hpMax = Math.ceil((stats.str + stats.con) / 2)
  const sanStart = stats.pow * 5
  const sanMax = 99 - skillTotal(SKILLS.find(s => s.key === 'unnatural'), skills.unnatural)
  const bonds = (data?.bonds ?? []).filter(b => b.name)
  const weapons = (data?.weapons ?? []).filter(w => w.name)

  const half = Math.ceil(SKILLS.length / 2)
  const skillRows = col => col.map(skill => {
    const entry = skills[skill.key]
    const spec = skill.specify && skills[`${skill.key}Specify`] ? ` (${esc(skills[`${skill.key}Specify`])})` : ''
    return `<tr class="${entry.isProfessional ? 'prof' : ''}">
      <td>${entry.isProfessional ? '★ ' : ''}${esc(skill.label)}${spec}</td>
      <td class="num">${skillTotal(skill, entry)}%</td>
    </tr>`
  }).join('')

  const exportedAt = new Date().toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })

  return `<!doctype html>
<html lang="da"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 9.5pt; color: #111; margin: 0; }
  header { border-bottom: 2px solid #111; padding-bottom: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
  header h1 { font-size: 18pt; margin: 0; letter-spacing: 0.05em; text-transform: uppercase; }
  header .meta { font-size: 8pt; text-align: right; color: #444; }
  h2 { font-size: 9pt; letter-spacing: 0.2em; text-transform: uppercase; border-bottom: 1px solid #111; margin: 14px 0 6px; padding-bottom: 2px; }
  .grid { display: grid; gap: 4px 16px; }
  .info { grid-template-columns: repeat(2, 1fr); }
  .field span { display: block; font-size: 7pt; text-transform: uppercase; letter-spacing: 0.1em; color: #555; }
  .field b { font-weight: normal; border-bottom: 1px solid #999; display: block; min-height: 1.3em; }
  table { width: 100%; border-collapse: collapse; }
  td, th { padding: 2px 4px; border-bottom: 1px solid #ddd; text-align: left; vertical-align: top; }
  th { font-size: 7pt; text-transform: uppercase; letter-spacing: 0.1em; color: #555; font-weight: normal; }
  .num { text-align: right; white-space: nowrap; }
  .stats td, .stats th { text-align: center; border: 1px solid #999; }
  .derived { grid-template-columns: repeat(4, 1fr); margin-top: 8px; }
  .skills { grid-template-columns: 1fr 1fr; }
  .skills tr.prof td { font-weight: bold; }
  .notes { white-space: pre-wrap; border: 1px solid #999; padding: 6px; min-height: 3em; }
  .legend { font-size: 7pt; color: #555; margin-top: 4px; }
  section { break-inside: avoid; }
</style></head><body>
<header>
  <h1>${show(data?.name || playerName)}</h1>
  <div class="meta">Spiller: ${esc(playerName)}<br>Eksporteret ${esc(exportedAt)}</div>
</header>

<section>
  <div class="grid info">
    <div class="field"><span>Profession</span><b>${show(data?.profession)}</b></div>
    <div class="field"><span>Arbejdsgiver</span><b>${show(data?.employer)}</b></div>
    <div class="field"><span>Nationalitet</span><b>${show(data?.nationality)}</b></div>
    <div class="field"><span>Alder</span><b>${show(data?.age)}</b></div>
  </div>
</section>

<section>
  <h2>Stats</h2>
  <table class="stats">
    <tr>${STATS.map(k => `<th>${k.toUpperCase()}</th>`).join('')}</tr>
    <tr>${STATS.map(k => `<td>${stats[k]} <small>(${stats[k] * 5}%)</small></td>`).join('')}</tr>
  </table>
  <div class="grid derived">
    <div class="field"><span>HP (max ${hpMax})</span><b>${show(data?.hpCurrent ?? hpMax)}</b></div>
    <div class="field"><span>WP (max ${stats.pow})</span><b>${show(data?.wpCurrent ?? stats.pow)}</b></div>
    <div class="field"><span>SAN (start ${sanStart} / max ${sanMax})</span><b>${show(data?.sanCurrent ?? sanStart)}</b></div>
    <div class="field"><span>Breaking Point</span><b>${show(data?.bpCurrent)}</b></div>
  </div>
</section>

<section>
  <h2>Skills</h2>
  <div class="grid skills">
    <table>${skillRows(SKILLS.slice(0, half))}</table>
    <table>${skillRows(SKILLS.slice(half))}</table>
  </div>
  <div class="legend">★ = Profession skill</div>
</section>

<section>
  <h2>Bonds</h2>
  ${bonds.length
    ? `<table><tr><th>Navn / relation</th><th class="num">Score</th></tr>${bonds.map(b => `<tr><td>${esc(b.name)}</td><td class="num">${show(b.score)}</td></tr>`).join('')}</table>`
    : '<p>—</p>'}
</section>

${weapons.length ? `<section>
  <h2>Weapons</h2>
  <table>
    <tr><th>Våben</th><th class="num">Skill</th><th>Range</th><th>Damage</th><th>AP</th><th class="num">Lethality</th><th>Kill radius</th><th>Ammo</th></tr>
    ${weapons.map(w => `<tr><td>${esc(w.name)}</td><td class="num">${show(w.skill)}%</td><td>${show(w.range)}</td><td>${show(w.damage)}</td><td>${show(w.armorPiercing)}</td><td class="num">${w.lethality ? esc(w.lethality) + '%' : '—'}</td><td>${show(w.killRadius)}</td><td>${show(w.ammo)}</td></tr>`).join('')}
  </table>
</section>` : ''}

<section>
  <h2>Udstyr / noter</h2>
  <div class="notes">${esc(data?.notes)}</div>
</section>
</body></html>`
}

export function exportAgentPdf(sheetData, playerName) {
  const title = `${sheetData?.name || playerName} – karakterark`
  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;'
  document.body.appendChild(iframe)

  // Browsers take the suggested PDF filename from the top-level title.
  const originalTitle = document.title
  iframe.onload = () => {
    document.title = title
    iframe.contentWindow.focus()
    iframe.contentWindow.print()
    // print() blocks until the dialog closes in most browsers; the timeout
    // covers the ones where it doesn't.
    setTimeout(() => {
      document.title = originalTitle
      iframe.remove()
    }, 1000)
  }
  iframe.srcdoc = buildHtml(sheetData, playerName, title)
}
