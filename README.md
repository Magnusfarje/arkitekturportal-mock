# Arkitekturstyrning i Backstage

Det här repot är överlämningen av en PoC: arkitekturstyrningen, arkitekturguiden
och IT-miljön som sidor i Backstage, med innehållet som YAML-filer i ett eget
repo som portalen läser. Allt innehåll är förslag och exempel. Datan beskriver
en namnlös myndighet, inte en verklig miljö.

Repot är en förlaga att läsa och bygga vidare på, inte något att drifta som det
är. Det finns ingen release, ingen CI och ingen historik; det som lämnas över är
modellen, exemplen, en referensimplementation och motiven bakom valen.

## Två mottagare

| Del | Var | För vem |
| --- | --- | --- |
| Informationsstrukturen och innehållet | `innehall/` | Arkitekturstyrningen, som äger innehållet och arbetssättet |
| Pluginen | `plugin/` | Backstage-förvaltningen, som bygger och driftar portalen |
| Exempel på inkoppling | `exempel/` | Båda |
| Dokument | `docs/` | Båda |

## Läsordning

1. [docs/mock.md](docs/mock.md): vad som byggdes, designvalen och
   varför, vad som inte är gjort, och frågorna som återstår att besluta.
2. [innehall/artefaktdefinition.md](innehall/artefaktdefinition.md):
   artefakttyperna, uppgifterna, relationerna och reglerna. Det är modellen.
3. [innehall/README.md](innehall/README.md) och
   [innehall/styrning/README.md](innehall/styrning/README.md): hur en artefakt
   skrivs, nyckel för nyckel, och hur IT-miljön beskrivs.
4. [docs/registret.md](docs/registret.md) och
   [docs/arkitekturguiden.md](docs/arkitekturguiden.md): vad sidorna i
   portalen visar.
5. [docs/installation.md](docs/installation.md) och
   [plugin/README.md](plugin/README.md): hur pluginen kopplas in och hur koden
   är byggd.

## Vad som finns

- `innehall/`: 86 artefakter under `styrning/` (5 arkitekturprinciper, 43
  tekniska principer, 20 referensarkitekturer, 18 vägledningar), IT-miljön som
  227 katalogentiteter i `it-miljo/katalog.yaml`, miljöbeskrivningen i
  `it-miljo/beskrivning.yaml`, artefaktdefinitionen och ordlistan.
- `plugin/`: tre Backstage-paket. `architecture-common` har artefaktmodellen,
  miljömodellen och kontrollen av innehållet. `architecture-backend` läser
  innehållet och katalogen och svarar på API:et. `architecture` är sidorna.
  Byggda mot Backstage 1.55 och det nya frontendsystemet.
- `exempel/katalog/system.yaml`: fem exempelsystem som placerar sig i miljön
  genom annotationen `architecture.portal/segment`.
- `exempel/app-config.yaml`: de delar av en produktionskonfiguration som gäller
  pluginen.

## Prova

Kräver Node.js 22 eller 24. Yarn följer med.

```sh
cd plugin
node .yarn/releases/yarn-4.13.0.cjs install
node .yarn/releases/yarn-4.13.0.cjs tsc
CI=true node .yarn/releases/yarn-4.13.0.cjs test
```

Kontrollen av innehållet mot artefaktdefinitionen:

```sh
cd plugin
ARCHITECTURE_CONTENT_DIR="$(pwd)/../innehall" CI=true node .yarn/releases/yarn-4.13.0.cjs workspace @myndigheten/backstage-plugin-architecture-backend test check.test
```
