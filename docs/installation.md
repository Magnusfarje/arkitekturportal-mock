# Koppla in pluginen i en Backstage

Pluginen är tre paket: `architecture-common`, `architecture-backend` och
`architecture`. De är byggda mot Backstage 1.55 och det nya frontendsystemet,
och är inte publicerade till något registry. Det här är stegen som behövs, med
det som provades i PoC:n som exempel.

## 1. Paketen

Publicera dem till organisationens registry, eller lägg in dem som workspaces
i er Backstage-monorepo. Lägg sedan till dem:

```sh
yarn --cwd packages/backend add @myndigheten/backstage-plugin-architecture-backend
yarn --cwd packages/app add @myndigheten/backstage-plugin-architecture
```

`architecture-common` följer med som beroende.

## 2. Backend

I `packages/backend/src/index.ts`:

```ts
backend.add(import('@myndigheten/backstage-plugin-architecture-backend'));
```

Backend-pluginet använder `httpRouter`, `httpAuth`, `auth`, `discovery`,
`logger`, `rootConfig`, `urlReader`, `scheduler`, `permissions` och
`permissionsRegistry` ur `coreServices`, och katalogen genom `CatalogClient`.
Det lagrar inget och behöver ingen databas.

## 3. Frontend

Med `app.packages: all` i `app-config.yaml` hittas pluginen av sig själv.
Annars läggs den i `features`:

```ts
import architecturePlugin from '@myndigheten/backstage-plugin-architecture';

export default createApp({
  features: [catalogPlugin, architecturePlugin, ...],
});
```

Sidorna hamnar i sidomenyn genom `nav.rest()`. Vill ni ordna dem heter de:

```tsx
{nav.take('page:architecture/overview')}   // Så hänger det ihop
{nav.take('page:architecture/guide')}      // Arkitekturguide
{nav.take('page:architecture/environment')} // IT-miljön
{nav.take('page:architecture')}            // Arkitekturstyrning
```

Sökvägarna är `/om-arkitekturstyrning`, `/arkitekturguide`, `/it-miljo` och
`/architecture`. Länkar mellan sidorna är hårdkodade till dem.

## 4. Innehållsrepot

Git-tjänsten behöver en post under `integrations`, eftersom repot läses som
ett träd. Sedan:

```yaml
architecture:
  content:
    url: https://github.com/myndigheten/arkitekturstyrning/tree/main
    browseUrl: https://github.com/myndigheten/arkitekturstyrning/blob/main/{path}
    schedule:
      frequency: { minutes: 5 }
      timeout: { minutes: 2 }
```

`browseUrl` är valfri; med den länkar varje artefakt till sin fil. Lokalt kan
`dir` peka på en utcheckning i stället för `url`. Ett av dem krävs.

## 5. IT-miljön i katalogen

Miljöns entiteter läses in som en vanlig katalogplats. Alla står i namespace
`it-miljo`:

```yaml
catalog:
  locations:
    - type: url
      target: https://github.com/myndigheten/arkitekturstyrning/blob/main/it-miljo/katalog.yaml
      rules:
        - allow: [Component, System, Domain, Resource, Group]
```

## 6. Behörighet

Varje anrop prövas mot `architecture.read`. Er permission-policy avgör vem som
får läsa, vanligen alla inloggade. En policy som släpper igenom den och lämnar
resten åt er befintliga policy:

```ts
import { isPermission } from '@backstage/plugin-permission-common';
import { architectureReadPermission } from '@myndigheten/backstage-plugin-architecture-common';

async handle(request, user) {
  if (isPermission(request.permission, architectureReadPermission)) {
    return { result: AuthorizeResult.ALLOW };
  }
  // er övriga policy
}
```

Inget skrivs genom portalen.

## 7. Era system i miljön

Ett system syns på kartan när dess `catalog-info.yaml` anger segment och vad
det bygger på, med hela referensen in i `it-miljo`:

```yaml
kind: Component
metadata:
  name: mitt-system
  annotations:
    architecture.portal/segment: tjanst-container
spec:
  owner: team-mitt-team
  dependsOn:
    - component:it-miljo/api-gateway-intern
```

Segmentets ID står på sidan **IT-miljön** när du öppnar en zon. Valfritt:
`architecture.portal/category` och `architecture.portal/interfaces`. Fem hela
exempel finns i `../exempel/katalog/system.yaml`.

## 8. Assistenten, valfritt

```yaml
architecture:
  assistant:
    baseUrl: http://ollama.intern.myndigheten.example:11434
    model: gemma4:latest
```

Utan blocket är assistenten av. Anropen har ingen begränsning i antal eller
samtidighet; sätt den i er gateway om modellen är delad.

## Konfigurationen i ett stycke

`../exempel/app-config.yaml` är de delar som gäller pluginen, med
miljövariablerna `ARCHITECTURE_CONTENT_URL` (blob-adressen till repots rot)
och `ARCHITECTURE_CONTENT_TREE_URL` (tree-adressen). Schemat för
`architecture`-blocket finns i `plugin/plugins/architecture-backend/config.d.ts`.
