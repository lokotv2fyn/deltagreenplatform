export const CARD_TYPES = {
  briefing: {
    label: 'Briefing', labelEn: 'Briefing',
    fields: [
      { key: 'heading', label: 'Overskrift', labelEn: 'Heading', type: 'text', required: true },
      { key: 'stamp', label: 'Stempel', labelEn: 'Stamp', type: 'text', placeholder: 'fx TOP SECRET' },
      { key: 'body', label: 'Brødtekst', labelEn: 'Body text', type: 'textarea', hint: 'Brug ||tekst|| for sværtet indhold' },
    ],
  },
  handout: {
    label: 'Handout', labelEn: 'Handout',
    fields: [
      { key: 'caseNumber', label: 'Sagsnummer', labelEn: 'Case number', type: 'text' },
      { key: 'body', label: 'Indhold', labelEn: 'Content', type: 'textarea' },
      { key: 'imageUrl', label: 'Billed-URL', labelEn: 'Image URL', type: 'text', required: false },
    ],
  },
  npc: {
    label: 'NPC', labelEn: 'NPC',
    fields: [
      { key: 'name', label: 'Navn', labelEn: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Rolle', labelEn: 'Role', type: 'text' },
      { key: 'affiliations', label: 'Tilknytninger', labelEn: 'Affiliations', type: 'text', hint: 'Kommasepareret',
        transform: v => v ? v.split(',').map(s => s.trim()).filter(Boolean) : [] },
      { key: 'notes', label: 'Noter', labelEn: 'Notes', type: 'textarea' },
      { key: 'imageUrl', label: 'Billed-URL', labelEn: 'Image URL', type: 'text', required: false },
    ],
  },
  bevis: {
    label: 'Bevis', labelEn: 'Evidence',
    fields: [
      { key: 'exhibitNumber', label: 'Ekshibit-nr.', labelEn: 'Exhibit no.', type: 'text' },
      { key: 'foundAt', label: 'Fundet på', labelEn: 'Found at', type: 'text' },
      { key: 'description', label: 'Beskrivelse', labelEn: 'Description', type: 'textarea' },
      { key: 'analysis', label: 'Analyse', labelEn: 'Analysis', type: 'textarea', hint: 'Brug ||tekst|| for sværtet indhold', required: false },
      { key: 'imageUrl', label: 'Billed-URL', labelEn: 'Image URL', type: 'text', required: false },
    ],
  },
  unnatural: {
    label: 'Unnatural', labelEn: 'Unnatural',
    fields: [
      { key: 'title', label: 'Titel', labelEn: 'Title', type: 'text', required: true },
      { key: 'sanCost', label: 'SAN-pris', labelEn: 'SAN cost', type: 'text', placeholder: 'fx 1/1d6 SAN', required: false },
      { key: 'body', label: 'Beskrivelse', labelEn: 'Description', type: 'textarea', hint: 'Brug ||tekst|| for sværtet indhold' },
    ],
  },
  terminal: {
    label: 'Terminal', labelEn: 'Terminal',
    fields: [
      { key: 'lines', label: 'Linjer', labelEn: 'Lines', type: 'textarea', hint: 'Én linje pr. linje',
        transform: v => v ? v.split('\n') : [] },
      { key: 'showCursor', label: 'Vis cursor', labelEn: 'Show cursor', type: 'checkbox', required: false },
    ],
  },
  comms: {
    label: 'Komm.', labelEn: 'Comms',
    fields: [
      { key: 'sender', label: 'Afsender', labelEn: 'Sender', type: 'text', required: true },
      { key: 'message', label: 'Besked', labelEn: 'Message', type: 'textarea' },
      { key: 'time', label: 'Tidspunkt', labelEn: 'Timestamp', type: 'text', placeholder: 'fx 02:47', required: false },
    ],
  },
}

export const CARD_TYPE_KEYS = Object.keys(CARD_TYPES)

// Player card types share the same cards.type values in the database.
// origin='player' is the only distinction in RLS.
export const PLAYER_CARD_TYPES = {
  bevis: {
    label: 'Ledetråd', labelEn: 'Clue',
    fields: [
      { key: 'foundAt', label: 'Fundet / oplevet', labelEn: 'Found / experienced', type: 'text' },
      { key: 'description', label: 'Beskrivelse', labelEn: 'Description', type: 'textarea' },
      { key: 'analysis', label: 'Agentens vurdering', labelEn: "Agent's assessment", type: 'textarea', required: false,
        hint: 'Brug ||tekst|| for sværtet indhold' },
      { key: 'imageUrl', label: 'Billed-URL', labelEn: 'Image URL', type: 'text', required: false },
    ],
  },
  npc: {
    label: 'Person', labelEn: 'Person',
    fields: [
      { key: 'name', label: 'Navn', labelEn: 'Name', type: 'text', required: true },
      { key: 'role', label: 'Relation / rolle', labelEn: 'Relation / role', type: 'text' },
      { key: 'notes', label: 'Agentens noter', labelEn: "Agent's notes", type: 'textarea' },
      { key: 'imageUrl', label: 'Billed-URL', labelEn: 'Image URL', type: 'text', required: false },
    ],
  },
  comms: {
    label: 'Besked', labelEn: 'Message',
    fields: [
      { key: 'sender', label: 'Afsender', labelEn: 'Sender', type: 'text', required: true },
      { key: 'message', label: 'Indhold', labelEn: 'Content', type: 'textarea' },
      { key: 'time', label: 'Tidspunkt', labelEn: 'Timestamp', type: 'text', placeholder: 'fx 02:47', required: false },
    ],
  },
  handout: {
    label: 'Fund', labelEn: 'Find',
    fields: [
      { key: 'caseNumber', label: 'Reference', labelEn: 'Reference', type: 'text', required: false },
      { key: 'body', label: 'Beskrivelse', labelEn: 'Description', type: 'textarea' },
      { key: 'imageUrl', label: 'Billed-URL', labelEn: 'Image URL', type: 'text', required: false },
    ],
  },
  unnatural: {
    label: 'Det Unaturlige', labelEn: 'The Unnatural',
    fields: [
      { key: 'title', label: 'Betegnelse', labelEn: 'Designation', type: 'text', required: true },
      { key: 'sanCost', label: 'SAN-pris', labelEn: 'SAN cost', type: 'text', placeholder: 'fx 1/1d6 SAN', required: false },
      { key: 'body', label: 'Hvad skete der?', labelEn: 'What happened?', type: 'textarea',
        hint: 'Brug ||tekst|| for sværtet indhold' },
    ],
  },
}
