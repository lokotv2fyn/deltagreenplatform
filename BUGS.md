# Kendte bugs

## Løst
- Handler route ikke beskyttet mod spillere der gætter URL'en — løst via router guard
- Dashboard viste gruppen dobbelt (en gang som handler, en gang som spiller) — løst med `.eq('user_id')` filter i groups store
- Kort stablede sig alle i (0,0) på visuelt canvas — løst i `resolvedPos()`

## Åbne

**6 — Brugernavn**
Spillere vises med email-præfiks (det før @) som display name i stedet for eget valgt navn. Spillere skal have mulighed for at sætte et display name selv.

**7 — Komm-kort label**
Feltet hedder "Tidspunkt (in-fiction)" — "in-fiction" skal fjernes, feltet skal bare hedde "Tidspunkt".

**Reveal interrupt**
Fuld-skærms interrupt til spillere ved handler-reveal virker ikke — kort dukker op på canvas men interrupt-overlay trigges ikke. Se `REVEAL_PROBLEM.md` for fuld diagnose og næste skridt.

**Handler view: Kort på bordet/bunke** 
Alle kort er på bordet, medmindre de ikke er revealed, så der er noget logik her, der fejler.