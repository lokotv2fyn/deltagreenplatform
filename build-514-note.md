# Build 514 — noter til dig

Tak for den grundige feedback på karakterarket! Her er hvad der er blevet
lavet ud fra det, du skrev. **Det er ikke lagt live endnu** — dette er en
forhåndsvisning, så du kan se om det rammer det, du havde i tankerne, før
det rulles ud.

---

## Grundstats: automatisk total

Der står nu en lille tæller under de seks grundstats:

```
Total: 73 / 72
```

Den tæller automatisk sammen, mens du udfylder STR/CON/DEX/INT/POW/CHA, og
bliver rød hvis du går over budgettet. De 72 point er justerbare af
Handleren pr. gruppe, hvis nogen skal have en undtagelse.

Hver grundstat viser nu også sin ×5-værdi lige under feltet (fx `×5: 65%`).

## Skills: Base / ★ Professionel / Bonus / Optjent / Total

Skills er nu delt op i felter, med en lille forklarende linje øverst i
sektionen (`base/bonus/earned = total`):

- **Base** — standardværdien fra bogen. Ændres ikke, vises grå til venstre.
- **★** — klik stjernen hvis skillen er en af din professions skills. Når
  den er tændt, erstattes Base-tallet med et felt, hvor du selv skriver din
  professions baseline-værdi ind (den du slår op i din profession).
- **Bonus** — klik-cyklus: 0 → +20 → +40 → tilbage til 0.
- **Optjent** — de point du løbende optjener (se nedenfor).
- **Total** — regnes automatisk. Hvis skillen er ★ og har Bonus-point,
  ignoreres Base helt (Total = Professionel baseline + Bonus + Optjent).
  Ellers lægges Bonus oveni Base som normalt.

Dine eksisterende skills er ikke gået tabt — de gamle tal er automatisk
lagt ind som Bonus, så din nuværende total er uændret. Du kan gå ind og
fordele dem rigtigt over i Base/★/Bonus/Optjent, når du har tid, men der er
ingen der tvinger dig til det.

## Bonds arver automatisk din CHA

Når du trykker "+ Tilføj bond", sætter feltet sig nu automatisk til din
nuværende CHA i stedet for et fast tal på 4. Stadig frit redigerbart
bagefter.

## Breaking Point: genberegningsknap (↻)

Feltet er nu et rigtigt tal du kan redigere, med en lille ↻-knap ved siden
af. Klik den for at beregne en frisk Breaking Point (nuværende SAN − POW) —
den regner ikke automatisk om af sig selv, så tallet ikke ændrer sig under
dig, mens SAN falder i løbet af en session. Klik ↻ igen, når du rammer din
nuværende Breaking Point og skal bruge en ny.

## Max SAN følger Unnatural automatisk

SAN-feltet viser nu både din startværdi og dit nuværende loft:

```
SAN 55/99
```

Loftet (99 − Unnatural) falder automatisk, i takt med at din Unnatural-skill
stiger, og din nuværende SAN kan aldrig komme over loftet — den justeres
automatisk ned, hvis det sker.

## Fejlslag-checkbox → 1d4 optjent

Hver skill har nu en lille afkrydsningsboks (kun synlig, når en session er
aktiv) — sæt kryds, hvis du bruger skillen og fejler slaget. Når du er
klar (efter sessionen, eller senere), dukker der en lille linje op under
skillen med to muligheder:

- 🎲 **Rul 1d4** — appen slår automatisk terningen for dig.
- Eller skriv selv tallet ind, hvis du hellere vil slå fysisk ved bordet.

Begge dele lægger point til Optjent og fjerner krydset.

## Advarsel ved ugemte ændringer

Hvis du har ændringer, der ikke er gemt, og prøver at forlade
karakterark-fanen (eller lukke/genindlæse browseren), får du nu en
advarsel først. Tidligere forsvandt ugemte ændringer bare stille og
roligt, hvis man skiftede fane — det sker ikke længere uden en advarsel.

## Læsbarhed

Skills-listen har fået en kolonneoverskrift (★ / Base / Bonus / Optjent /
Tot), og rækkerne lyser lidt op, når musen holdes over dem. Tekst og tal,
der før var meget svage at læse (labels, hjælpetal), er også gjort tydeligere
generelt på arket.

---

Sig til, hvis noget af det her ikke rammer det, du havde tænkt — så
justerer vi det, inden det går live.
