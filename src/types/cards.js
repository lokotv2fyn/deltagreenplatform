/**
 * @typedef {{ heading: string, stamp: string, body: string }} BriefingData
 * @typedef {{ caseNumber: string, body: string, imageUrl?: string }} HandoutData
 * @typedef {{ name: string, role: string, affiliations: string[], notes: string, imageUrl?: string }} NpcData
 * @typedef {{ exhibitNumber: string, foundAt: string, description: string, analysis?: string, imageUrl?: string }} BevisData
 * @typedef {{ title: string, sanCost?: string, body: string }} UnnaturalData
 * @typedef {{ lines: string[], showCursor?: boolean }} TerminalData
 * @typedef {{ sender: string, message: string, time?: string }} CommsData
 * @typedef {'briefing'|'handout'|'npc'|'bevis'|'unnatural'|'terminal'|'comms'} CardType
 */
