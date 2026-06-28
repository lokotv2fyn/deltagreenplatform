// Base values — verify against physical books when they arrive
export const SKILLS = [
  { key: 'accounting',        label: 'Accounting',                  base: 10 },
  { key: 'alertness',         label: 'Alertness',                   base: 20 },
  { key: 'anthropology',      label: 'Anthropology',                base: 0  },
  { key: 'archaeology',       label: 'Archaeology',                 base: 0  },
  { key: 'art',               label: 'Art',                         base: 0,  specify: true },
  { key: 'artillery',         label: 'Artillery',                   base: 0  },
  { key: 'athletics',         label: 'Athletics',                   base: 30 },
  { key: 'bureaucracy',       label: 'Bureaucracy',                 base: 10 },
  { key: 'computerScience',   label: 'Computer Science',            base: 0  },
  { key: 'criminology',       label: 'Criminology',                 base: 10 },
  { key: 'demolitions',       label: 'Demolitions',                 base: 0  },
  { key: 'disguise',          label: 'Disguise',                    base: 10 },
  { key: 'dodge',             label: 'Dodge',                       base: 30 },
  { key: 'drive',             label: 'Drive',                       base: 20 },
  { key: 'firearms',          label: 'Firearms',                    base: 20 },
  { key: 'firstAid',          label: 'First Aid',                   base: 10 },
  { key: 'forensics',         label: 'Forensics',                   base: 0  },
  { key: 'foreignLanguage',   label: 'Foreign Language',            base: 0,  specify: true },
  { key: 'heavyMachinery',    label: 'Heavy Machinery',             base: 10 },
  { key: 'heavyWeapons',      label: 'Heavy Weapons',               base: 0  },
  { key: 'history',           label: 'History',                     base: 10 },
  { key: 'humint',            label: 'HUMINT',                      base: 10 },
  { key: 'law',               label: 'Law',                         base: 0  },
  { key: 'medicine',          label: 'Medicine',                    base: 0  },
  { key: 'meleeWeapons',      label: 'Melee Weapons',               base: 30 },
  { key: 'militaryScience',   label: 'Military Science',            base: 0,  specify: true },
  { key: 'navigate',          label: 'Navigate',                    base: 10 },
  { key: 'occult',            label: 'Occult',                      base: 10 },
  { key: 'persuade',          label: 'Persuade',                    base: 20 },
  { key: 'pharmacy',          label: 'Pharmacy',                    base: 0  },
  { key: 'pilot',             label: 'Pilot',                       base: 0,  specify: true },
  { key: 'psychotherapy',     label: 'Psychotherapy',               base: 10 },
  { key: 'ride',              label: 'Ride',                        base: 10 },
  { key: 'search',            label: 'Search',                      base: 20 },
  { key: 'sigint',            label: 'SIGINT',                      base: 0  },
  { key: 'stealth',           label: 'Stealth',                     base: 10 },
  { key: 'surgery',           label: 'Surgery',                     base: 0  },
  { key: 'survival',          label: 'Survival',                    base: 10 },
  { key: 'swim',              label: 'Swim',                        base: 20 },
  { key: 'unarmedCombat',     label: 'Unarmed Combat',              base: 40 },
  { key: 'unnatural',         label: 'Unnatural',                   base: 0  },
]

export function defaultSkills() {
  const s = {}
  for (const skill of SKILLS) {
    s[skill.key] = skill.base
    if (skill.specify) s[`${skill.key}Specify`] = ''
  }
  return s
}
