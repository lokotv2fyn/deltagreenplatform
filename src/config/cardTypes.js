export const CARD_TYPES = {
  briefing: {
    label: 'Briefing',
    fields: [
      { key: 'heading', label: 'Overskrift', type: 'text', required: true },
      { key: 'stamp', label: 'Stempel', type: 'text', placeholder: 'fx TOP SECRET' },
      { key: 'body', label: 'Brødtekst', type: 'textarea', hint: 'Brug ||tekst|| for sværtet indhold' },
    ],
  },
  handout: {
    label: 'Handout',
    fields: [
      { key: 'caseNumber', label: 'Sagsnummer', type: 'text' },
      { key: 'body', label: 'Indhold', type: 'textarea' },
      { key: 'imageUrl', label: 'Billed-URL', type: 'text', required: false },
    ],
  },
  npc: {
    label: 'NPC',
    fields: [
      { key: 'name', label: 'Navn', type: 'text', required: true },
      { key: 'role', label: 'Rolle', type: 'text' },
      { key: 'affiliations', label: 'Tilknytninger', type: 'text', hint: 'Kommasepareret',
        transform: v => v ? v.split(',').map(s => s.trim()).filter(Boolean) : [] },
      { key: 'notes', label: 'Noter', type: 'textarea' },
      { key: 'imageUrl', label: 'Billed-URL', type: 'text', required: false },
    ],
  },
  bevis: {
    label: 'Bevis',
    fields: [
      { key: 'exhibitNumber', label: 'Ekshibit-nr.', type: 'text' },
      { key: 'foundAt', label: 'Fundet på', type: 'text' },
      { key: 'description', label: 'Beskrivelse', type: 'textarea' },
      { key: 'analysis', label: 'Analyse', type: 'textarea', hint: 'Brug ||tekst|| for sværtet indhold', required: false },
      { key: 'imageUrl', label: 'Billed-URL', type: 'text', required: false },
    ],
  },
  unnatural: {
    label: 'Unnatural',
    fields: [
      { key: 'title', label: 'Titel', type: 'text', required: true },
      { key: 'sanCost', label: 'SAN-pris', type: 'text', placeholder: 'fx 1/1d6 SAN', required: false },
      { key: 'body', label: 'Beskrivelse', type: 'textarea', hint: 'Brug ||tekst|| for sværtet indhold' },
    ],
  },
  terminal: {
    label: 'Terminal',
    fields: [
      { key: 'lines', label: 'Linjer', type: 'textarea', hint: 'Én linje pr. linje',
        transform: v => v ? v.split('\n') : [] },
      { key: 'showCursor', label: 'Vis cursor', type: 'checkbox', required: false },
    ],
  },
  comms: {
    label: 'Komm.',
    fields: [
      { key: 'sender', label: 'Afsender', type: 'text', required: true },
      { key: 'message', label: 'Besked', type: 'textarea' },
      { key: 'time', label: 'Tidspunkt', type: 'text', placeholder: 'fx 02:47', required: false },
    ],
  },
}

export const CARD_TYPE_KEYS = Object.keys(CARD_TYPES)

// Player-venlige korttyper: samme datastruktur som handler-typerne,
// men med spillerfokuserede labels og forenklede felter.
// Bruger stadig samme cards.type-værdier i databasen — origin='player' er
// det eneste der adskiller dem i RLS.
export const PLAYER_CARD_TYPES = {
  bevis: {
    label: 'Ledetråd',
    fields: [
      { key: 'foundAt', label: 'Fundet / oplevet', type: 'text' },
      { key: 'description', label: 'Beskrivelse', type: 'textarea' },
      { key: 'analysis', label: 'Agentens vurdering', type: 'textarea', required: false,
        hint: 'Brug ||tekst|| for sværtet indhold' },
      { key: 'imageUrl', label: 'Billed-URL', type: 'text', required: false },
    ],
  },
  npc: {
    label: 'Person',
    fields: [
      { key: 'name', label: 'Navn', type: 'text', required: true },
      { key: 'role', label: 'Relation / rolle', type: 'text' },
      { key: 'notes', label: 'Agentens noter', type: 'textarea' },
      { key: 'imageUrl', label: 'Billed-URL', type: 'text', required: false },
    ],
  },
  comms: {
    label: 'Besked',
    fields: [
      { key: 'sender', label: 'Afsender', type: 'text', required: true },
      { key: 'message', label: 'Indhold', type: 'textarea' },
      { key: 'time', label: 'Tidspunkt', type: 'text', placeholder: 'fx 02:47', required: false },
    ],
  },
  handout: {
    label: 'Fund',
    fields: [
      { key: 'caseNumber', label: 'Reference', type: 'text', required: false },
      { key: 'body', label: 'Beskrivelse', type: 'textarea' },
      { key: 'imageUrl', label: 'Billed-URL', type: 'text', required: false },
    ],
  },
  unnatural: {
    label: 'Det Unaturlige',
    fields: [
      { key: 'title', label: 'Betegnelse', type: 'text', required: true },
      { key: 'sanCost', label: 'SAN-pris', type: 'text', placeholder: 'fx 1/1d6 SAN', required: false },
      { key: 'body', label: 'Hvad skete der?', type: 'textarea',
        hint: 'Brug ||tekst|| for sværtet indhold' },
    ],
  },
}
