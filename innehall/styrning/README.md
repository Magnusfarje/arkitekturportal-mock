# Styrningen som YAML

En fil per artefakt, en katalog per artefakttyp. Filerna är originalet: det
som står här är det portalen visar. Så skriver du en ny; se
[README.md](../README.md) för arbetssättet.

| Katalog                 | Typ                | Prefix |
| ----------------------- | ------------------ | ------ |
| `arkitekturprinciper/`  | Arkitekturprincip  | AP     |
| `tekniska-principer/`   | Teknisk princip    | TP     |
| `referensarkitekturer/` | Referensarkitektur | RA     |
| `vagledningar/`         | Vägledning         | VL     |

Filen heter som artefaktens ID, till exempel `tekniska-principer/TP-BER-01.yaml`.

## Så är filerna skrivna

Varje typ har egna namn på de fält som betyder olika saker för olika typer, och
de delar av en text som har egen rubrik i portalen är egna nycklar. Nycklarna
står i samma ordning i alla filer.

- Text med flera stycken skrivs som blockskalär (`|-`). Listor i texten
  skrivs med `- ` och `1. `.
- Ett fält som är tomt utelämnas. En artefakt utan `owner` har ett
  kompletteringsbehov i registret.
- Bindningsgrad anges bara för tekniska principer. För de andra typerna följer
  den av typen: arkitekturprinciper är bindande, referensarkitekturer
  rekommenderade och vägledningar vägledande.
- Relationer är nycklar per relationstyp. Ett ID räcker för `concretizes`,
  `motivatedBy` och `replaces`. `leadsTo` och `uses` bär också en anmärkning.

### Gemensamma nycklar

| Nyckel               | Artefaktdefinitionen | Innehåll                                                                                 |
| -------------------- | -------------------- | ---------------------------------------------------------------------------------------- |
| `id`                 | ID                   | Börjar med typens prefix.                                                                |
| `kind`               | Artefakttyp          | `architecture-principle`, `technical-principle`, `reference-architecture` eller `guide`. |
| `title`              | Titel                |                                                                                          |
| `binding`            | Bindningsgrad        | Bara tekniska principer: `binding` eller `recommended`.                                  |
| `topic`              | Ämnesområde          |                                                                                          |
| `owner`              | Innehållsägare       | Katalogreferens till en grupp eller användare.                                           |
| `source`             | Källreferens         | Valfri: en standard eller ett dokument utanför repot som artefakten bygger på.           |
| `externalReferences` | Externa referenser   | En lista.                                                                                |
| `sections`           |                      | Avsnitt som bara en artefakt har, med `title` och `text`.                                |

### Arkitekturprincip och teknisk princip

| Nyckel          | I portalen                | Innehåll                                                      |
| --------------- | ------------------------- | ------------------------------------------------------------- |
| `statement`     | Princip                   | Regeln.                                                       |
| `rationale`     | Varför                    |                                                               |
| `scope`         | Gäller för                |                                                               |
| `consequences`  | Det innebär               |                                                               |
| `preconditions` | Möjliga förutsättningar   | Posterna om mjukvaruutveckling.                               |
| `solutions`     | Möjliga lösningar         | Posterna om mjukvaruutveckling.                               |
| `howTo`         | Så följer du regeln       | Arbetssättet, med vad som behöver vara känt innan och stegen. |
| `ifNotMet`      | Om ni inte når dit        | Vad som gäller när regeln inte följs.                         |
| `notCovered`    | Täcks inte av regler ännu | Vad de konkretiserande reglerna inte täcker.                  |
| `concretizes`   | Konkretiserar             | Tekniska principer: de arkitekturprinciper regeln preciserar. |
| `motivatedBy`   | Motiveras av              |                                                               |
| `replaces`      | Ersätter                  |                                                               |
| `requirements`  | Krav                      | Bindande tekniska principer. Se nedan.                        |

Tekniska principer finns i två former. Posterna om mjukvaruutveckling
(TP-DRI-13 till 18, TP-ENK, TP-FLO, TP-GRU och TP-SAM) beskriver ett utfall
att nå och använder `preconditions`, `solutions` och `ifNotMet`. Övriga regler
säger vad som gäller och använder `consequences` och `howTo`. En regel kan ha
båda när den både anger ett utfall och ett arbetssätt. Välj den form som
passar regeln, och ta en fil av samma form som förlaga.

Ett krav har `id`, `title`, `statement`, `scope` (när kravet gäller),
`criteria` (så uppfyller du kravet), `notEnough` (räcker inte), `limits`
(avgränsning) och valfritt `method`: `manual`, `automatic` eller `combined`.

### Referensarkitektur

| Nyckel             | I portalen          | Innehåll                                                                                       |
| ------------------ | ------------------- | ---------------------------------------------------------------------------------------------- |
| `solution`         | Lösning             |                                                                                                |
| `rationale`        | Varför              |                                                                                                |
| `fits`             | När mönstret passar |                                                                                                |
| `responsibilities` | Du ansvarar för     |                                                                                                |
| `variants`         | Varianter           |                                                                                                |
| `flows`            | Flöde               | `from` och `to` med `name` och `zone`, och `label` för vad som skickas.                        |
| `uses`             | Byggstenar          | `target` är byggstenens katalogreferens i namespace `it-miljo`, `role` vad den gör i mönstret. |
| `motivatedBy`      | Bygger på           | De regler mönstret bygger på.                                                                  |

Zonerna i `flows` är zonernas ID i katalogen. Flödet ska följa zonmodellen.

### Vägledning

| Nyckel        | I portalen      | Innehåll                                                        |
| ------------- | --------------- | --------------------------------------------------------------- |
| `answer`      | Kort svar       |                                                                 |
| `before`      | Innan du börjar | Frågorna att svara på först.                                    |
| `scope`       | Gäller för      |                                                                 |
| `steps`       | Gör så här      |                                                                 |
| `leadsTo`     | Vägval          | `target` är den artefakt som gäller, `when` läget den gäller i. |
| `motivatedBy` | Bygger på       | De regler vägledningen bygger på.                               |
| `uses`        | Byggstenar      | Som för referensarkitekturer.                                   |
