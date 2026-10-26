# Backstage-plugin för arkitekturstyrning

Tre paket som visar arkitekturstyrningen, arkitekturguiden och IT-miljön i
Backstage. Innehållet ligger i `../innehall`, som arkitekturstyrningen
förvaltar; pluginen läser det och ändrar inget. Paketen är en
referensimplementation: byggda för att läsas och provas, inte publicerade.

| Paket                                                 | Roll                                                                              |
| ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `@myndigheten/backstage-plugin-architecture`         | Sidorna Arkitekturstyrning, Arkitekturguide, IT-miljön och Så hänger det ihop     |
| `@myndigheten/backstage-plugin-architecture-backend` | Registret: läser innehållsrepot på schema och katalogen på begäran                |
| `@myndigheten/backstage-plugin-architecture-common`  | Artefaktmodellen, miljömodellen, reglerna innehållet kontrolleras mot, och behörigheten `architecture.read` |

Byggda mot Backstage 1.55 och det nya frontendsystemet.

## Installera i Backstage

1. Lägg till paketen:

   ```sh
   yarn --cwd packages/backend add @myndigheten/backstage-plugin-architecture-backend
   yarn --cwd packages/app add @myndigheten/backstage-plugin-architecture
   ```

2. Registrera backend-pluginet i `packages/backend/src/index.ts`:

   ```ts
   backend.add(import('@myndigheten/backstage-plugin-architecture-backend'));
   ```

   Frontend-pluginet hittas av `app.packages: all`. Sidorna hamnar i sidomenyn
   genom `nav.rest()`; vill ni ordna dem heter de `page:architecture/overview`,
   `page:architecture/guide`, `page:architecture/environment` och
   `page:architecture`.

3. Peka ut innehållsrepot. Git-tjänsten behöver en post under `integrations`,
   eftersom repot läses som ett träd:

   ```yaml
   architecture:
     content:
       url: https://github.com/<org>/arkitekturstyrning/tree/main
       browseUrl: https://github.com/<org>/arkitekturstyrning/blob/main/{path}
       schedule:
         frequency: { minutes: 5 }
         timeout: { minutes: 2 }
   ```

4. Läs in IT-miljön i katalogen som en katalogplats. Alla miljöns entiteter
   står i namespace `it-miljo`:

   ```yaml
   catalog:
     locations:
       - type: url
         target: https://github.com/<org>/arkitekturstyrning/blob/main/it-miljo/katalog.yaml
         rules:
           - allow: [Component, System, Domain, Resource, Group]
   ```

5. Behörighet. Varje anrop prövas mot `architecture.read`. Er permission-policy
   avgör vem som får läsa; vanligen alla inloggade. Inget skrivs genom portalen.

6. Assistenten är av tills `architecture.assistant` anger en språkmodell med
   Ollama-kompatibelt API (`baseUrl`, `model`).

Ett system i er katalog syns på kartan i IT-miljön när dess `catalog-info.yaml`
anger `architecture.portal/segment`; se innehållsrepots README.

## Så läser pluginet innehållet

Backend-pluginet läser hela repot vid start och sedan på schema, kontrollerar
det mot artefaktdefinitionen och håller det i minnet. Reglerna finns på ett
ställe, `checkContent` i `architecture-common`: samma kontroll körs i
innehållsrepots CI. Bryter innehållet mot definitionen loggas problemen rad
för rad, och det senast lästa innehållet serveras tills repot är rättat.

Innehållsrepot har en fast form: `styrning/<artefakttyp>/<ID>.yaml`,
`it-miljo/katalog.yaml` och `it-miljo/beskrivning.yaml`.

API-bas: `/api/architecture/v1`. Kontraktet finns på
`/api/architecture/v1/openapi.json`. Anropen är `GET /artifacts`,
`GET /artifacts/{id}`, `GET /environment`, `GET /access` och
`POST /assistant`.

## Utveckla

Kräver Node.js 22 eller 24. Innehållet läses från `../innehall`. Yarn följer
med.

```sh
node .yarn/releases/yarn-4.13.0.cjs install
node .yarn/releases/yarn-4.13.0.cjs tsc
CI=true node .yarn/releases/yarn-4.13.0.cjs test
```

Starta pluginen för sig, med gästinloggning och en databas i minnet:

```sh
cd plugins/architecture-backend && node ../../.yarn/releases/yarn-4.13.0.cjs start
cd plugins/architecture && node ../../.yarn/releases/yarn-4.13.0.cjs start
```

Testerna läser en kopia av innehållet under
`plugins/architecture-backend/src/__fixtures__/content/`. Kontrollera ett
annat innehåll, till exempel `../innehall` självt, så här (sökvägen ska vara
absolut):

```sh
ARCHITECTURE_CONTENT_DIR="$(pwd)/../innehall" CI=true node .yarn/releases/yarn-4.13.0.cjs workspace @myndigheten/backstage-plugin-architecture-backend test check.test
```

Hur paketen kopplas in i en Backstage står i [docs/installation.md](../docs/installation.md).

## Inte gjort

- "Föreslå ändring" från portalen, som skapar en pull request i innehållsrepot.
- Versioner, giltighet och fastställande som uppgifter i filerna, när
  arbetssättet är bestämt.
- Sökindexering av artefakterna i Backstages sök.
- Koppling mellan styrning och enskilda system i katalogen.
