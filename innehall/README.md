# Arkitekturstyrning

Den här katalogen är arkitekturstyrningen: principer, regler, mönster och
vägledningar, och beskrivningen av myndighetens IT-miljö. Arkitekturportalen i
Backstage läser den och visar innehållet; den ändrar inget. Innehållet
förvaltas av arkitekturstyrningen, och är tänkt att ligga i ett eget repo.

Allt innehåll är förslag och exempel, inte beslutad styrning. Arbetssättet som
föreslås: en ändring görs som en pull request, granskningen sker i den,
kontrollen nedan körs i den, och en merge gör ändringen synlig i portalen inom
några minuter. Historiken är git-historiken.

## Vad som finns

| Var                         | Innehåll                                                                                                                                                    |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `styrning/`                 | En YAML-fil per artefakt, en katalog per artefakttyp                                                                                                        |
| `it-miljo/katalog.yaml`     | IT-miljön som Backstage-entiteter: platser, zoner, segment, externa anslutningar, tjänster, system, verksamhetsområden och team, alla i namespace `it-miljo` |
| `it-miljo/beskrivning.yaml` | Det om miljön som katalogen inte säger: driftmiljöer, driftplattformar och begrepp                                                                          |
| `artefaktdefinition.md`     | Artefakttyperna, uppgifterna, relationerna och reglerna                                                                                                     |
| `ordlista.md`               | Ordvalen i texterna                                                                                                                                         |

## Skriva en artefakt

1. Välj typ och ID. ID:t börjar med typens prefix och följs av ämneskod och
   nummer: `AP-SÄK-02`, `TP-BER-01`, `RA-EXP-02`, `VL-AI-01`.
2. Skapa filen `styrning/<typens katalog>/<ID>.yaml`:

   | Typ                | Katalog                 | Prefix |
   | ------------------ | ----------------------- | ------ |
   | Arkitekturprincip  | `arkitekturprinciper/`  | AP     |
   | Teknisk princip    | `tekniska-principer/`   | TP     |
   | Referensarkitektur | `referensarkitekturer/` | RA     |
   | Vägledning         | `vagledningar/`         | VL     |

3. Fyll i nycklarna för typen. Vilka de är och vad de betyder står i
   [styrning/README.md](styrning/README.md); en fil bredvid din är det bästa
   exemplet.
4. Skicka en pull request. Kontrollen säger ifrån, rad för rad, när något
   bryter mot artefaktdefinitionen: ett ID utan typens prefix, en fil i fel
   katalog, en hänvisning till något som inte finns, ett flöde som zonmodellen
   inte tillåter, en byggsten i fel zon, en nyckel som inte finns eller ett ord
   som ordlistan avråder från.

Kontrollen är samma kod som portalen läser innehållet med; den finns i
`../plugin` (`checkContent` i paketet `architecture-common`). Avsikten är att
den körs i varje pull request. Så här körs den lokalt:

```sh
cd ../plugin && node .yarn/releases/yarn-4.13.0.cjs install
ARCHITECTURE_CONTENT_DIR="$(pwd)/../innehall" CI=true node .yarn/releases/yarn-4.13.0.cjs workspace @myndigheten/backstage-plugin-architecture-backend test check.test
```

## Ändra IT-miljön

Zoner, segment, platser, externa anslutningar, tjänster och system är entiteter
i `it-miljo/katalog.yaml`, i den form Backstage-katalogen läser. En tjänst
säger vilket segment den står i med `architecture.portal/segment` och vad den
bygger på med `dependsOn`. Zoner säger vilka zoner de tar emot anslutningar
från med `architecture.portal/accepts-from`; det är zonmodellen som mönstrens
flöden kontrolleras mot. Driftmiljöerna, driftplattformarnas text och begreppen
står i `it-miljo/beskrivning.yaml`.

## Så syns ett system i IT-miljön

Ett system i Backstage-katalogen placeras på kartan genom en annotation i sin
`catalog-info.yaml` som säger vilket segment det står i, och anger det som
systemet bygger på med hela referensen:

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

Segmentets ID står på sidan **IT-miljön** i portalen när du öppnar en zon.
Valfritt kan systemet ange `architecture.portal/category` och
`architecture.portal/interfaces`.

## Så läser portalen repot

Backend-pluginet läser hela repot på schema genom Backstages `UrlReader`. I
Backstages konfiguration anges repots URL, och miljöns entiteter läses in i
katalogen som en vanlig katalogplats:

```yaml
architecture:
  content:
    url: https://github.com/myndigheten/arkitekturstyrning/tree/main
catalog:
  locations:
    - type: url
      target: https://github.com/myndigheten/arkitekturstyrning/blob/main/it-miljo/katalog.yaml
      rules:
        - allow: [Component, System, Domain, Resource, Group]
```

Se [docs/installation.md](../docs/installation.md) för installationen.
