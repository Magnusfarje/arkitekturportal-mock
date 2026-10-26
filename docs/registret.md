# Arkitekturstyrning – registret

Välj **Arkitekturstyrning** i sidomenyn eller öppna
http://localhost:3000/architecture. Där söker du i styrningen och följer
relationer. **Arkitekturguiden** är en läsvy över samma register; se
[arkitekturguiden](architecture-guide.md).

Allt i registret är förslag. Registret håller ett innehåll per artefakt. Det
finns inga versioner, ingen historik och inga beslut i portalen: innehållet
ligger i innehållsrepot, och det som har ändrats ser man i dess git-historik.

## Vad som finns

| Typ                | Prefix | Antal |
| ------------------ | ------ | ----- |
| Arkitekturprincip  | AP     | 5     |
| Teknisk princip    | TP     | 43    |
| Referensarkitektur | RA     | 20    |
| Vägledning         | VL     | 18    |

Typerna, uppgifterna och relationerna beskrivs i innehållsrepots
`artefaktdefinition.md`, och ordvalen i dess `ordlista.md`.

## Varifrån innehållet kommer

Innehållet ligger i repot **arkitekturstyrning**: en YAML-fil per artefakt
under `styrning/<artefakttyp>/<ID>.yaml`, IT-miljön som katalogentiteter i
`it-miljo/katalog.yaml` och det om miljön som katalogen inte säger i
`it-miljo/beskrivning.yaml`. Filerna är originalet; hur de skrivs står i det
repots README.

Backend-pluginet läser hela repot som ett träd genom Backstages `UrlReader`
vid start och sedan på schema (var femte minut om inget annat anges),
kontrollerar det mot artefaktdefinitionen med `checkContent` i
`architecture-common` och håller det i minnet. En läsning som bryter mot
definitionen loggas rad för rad, och det senast lästa innehållet serveras
tills repot är rättat. Varje artefakt bär `provenance`: filen i repot, repots
tillstånd när den lästes och, när `architecture.content.browseUrl` är satt,
filens adress.

Lokalt läses en utcheckning på disk (`architecture.content.dir`). I
produktion anges repots URL (`architecture.content.url`).

## Ändra innehållet

Ändra filen i innehållsrepot och skicka en pull request. Samma kontroll som
portalen läser med körs i repots CI; en merge gör ändringen synlig i portalen
vid nästa läsning. Hur innehåll fastställs, versioneras och upphävs bestäms
när arbetssättet är klart (artefaktdefinitionen, avsnitt 6).

## Behörighet

Varje anrop prövas mot behörigheten `architecture.read` i Backstages
permission-ramverk. Organisationens policy avgör vem som får läsa; lokalt
tillåter policyn allt. Inget skrivs genom portalen.

## API

API-bas: `/api/architecture/v1`. Kontraktet finns på
`/api/architecture/v1/openapi.json`.

| Anrop                 | Gör                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| `GET /artifacts`      | Listar artefakter. Filter: `q`, `kind`, `binding`, `owner`, `needsCompletion`.                         |
| `GET /artifacts/{id}` | Hämtar en artefakt med kompletteringsbehov och varifrån den lästes.                                    |
| `GET /environment`    | IT-miljön som katalogen beskriver den, med det i katalogen som inte går ihop (`problems`, `unplaced`). |
| `GET /access`         | Vem den inloggade är, och om assistenten finns (`canAsk`).                                             |
| `POST /assistant`     | En fråga till assistenten; se [arkitekturguiden](architecture-guide.md).                               |

## Inte gjort

- Versioner av artefakter, giltighetstid, fastställande och upphävande som
  uppgifter i filerna.
- Avstegsprocess och beslutsmandat.
- "Föreslå ändring" från portalen, som skapar en pull request i innehållsrepot.
- Koppling mellan styrning och enskilda system i katalogen.
- Bedömning av krav i portalen. Kontrollerna utformas utanför registret tills
  det finns en bedömningsfunktion.
- Sökindexering av artefakterna i Backstages sök.
