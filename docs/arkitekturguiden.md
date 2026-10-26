# Arkitekturguiden

Öppna **Arkitekturguide** i vänstermenyn. Guiden är en läsvy över samma
register som Arkitekturstyrning, för den som ska bygga något och behöver ett
svar. Innehållet förvaltas i Arkitekturstyrning; se [registret](architecture-registry.md).

Innehållet är förslag och utgår från myndighetens IT-miljö, som driftas helt i
egna datahallar. Vägledningarna, mönstren och reglerna är YAML-filer i
innehållsrepot **arkitekturstyrning**, och miljön är dess
`it-miljo/katalog.yaml` och `it-miljo/beskrivning.yaml`.

## Vad som finns

| Del                       | Antal | Var                                                                                                     |
| ------------------------- | ----- | ------------------------------------------------------------------------------------------------------- |
| Vägledningar (VL)         | 18    | Guidens startsida, grupperade per ämnesområde                                                           |
| Referensarkitekturer (RA) | 20    | Nås från vägledningarnas vägval och från startsidan                                                     |
| Regler (TP)               | 42    | Guidens startsida, grupperade per ämnesområde, och under varje vägledning och mönster som bygger på dem |
| Platser                   | 12    | Guidens miljösida, och som `Resource` i katalogen                                                       |
| Zoner                     | 15    | Guidens miljösida, och som `Resource` i katalogen                                                       |
| Segment                   | 55    | Guidens miljösida, och som `Resource` i katalogen                                                       |
| Tjänster och system       | 82    | Guidens miljösida, och som `Component` i katalogen                                                      |
| Externa anslutningar      | 15    | Guidens miljösida, och som `Resource` i katalogen                                                       |

En vägledning visar kort svar, vad du behöver veta innan du väljer, vägvalen och
stegen. Under den samlas de regler och krav som gäller, hämtade både från
vägledningen och från de mönster den leder till. Ett mönster visar flödet mellan
zoner som diagram, byggstenarna med vem de beställs hos och vad lösningen själv
ansvarar för. Alla artefakter i registret går att läsa i guiden, även principer
och krav.

Arton vägledningar finns. Tolv leder till ett
mönster. Sex, VL-DRI-01 till VL-DRI-05 och VL-LIV-02, svarar på frågor om drift
och livscykel och pekar ut de byggstenar som är den rekommenderade vägen. Hur en
regel följs väl står i regeln själv, under ”Så följer du regeln”.

Reglerna är tekniska principer, också de som anger vad organisationen har valt,
till exempel att lösningar driftas i egna datahallar. De som kommer ur posterna
om mjukvaruutveckling visar också vad som gäller om utfallet inte nås. En regel
som en annan har ersatt listas inte, men går att läsa och visar då vad som
ersatte den.

Mönster och vägledningar utgår från miljön.
Principer, regler och posterna om mjukvaruutveckling är förslag till styrning
som inte beror på den. Prefixet säger vilken typ en artefakt har, inte varifrån
den kommer; det visar importkällan i Arkitekturstyrning.

## IT-miljön

Sidan **IT-miljön** i vänstermenyn visar miljön som en karta: domäner som
områden och zoner som rutor, med den gemensamma infrastrukturen under de
övriga. Varje ruta säger hur mycket som står i zonen. Pekar du på en zon ritas
pilar för vad som får ansluta dit och vart zonen får ansluta. En vald zon
öppnas under kartan med sina segment och tjänster och system i fyra slag
(byggstenar, infrastrukturtjänster, gemensamma tjänster och verksamhetssystem).

En vald tjänst visas med syfte, gränssnitt och beställningsväg, det den bygger
på, och de mönster och vägledningar som använder den. Beskriver
miljöbeskrivningens avsnitt om driftplattformar tjänsten står texten där. Med
**Följ ett flöde** ritas stegen i ett mönsters flöde som numrerade pilar mellan
zonerna. Mönstrens byggstenar och flöden i guiden länkar tillbaka till kartan.

Under kartan står driftplattformarna, platser, miljöer och begrepp. Hur miljön
svarar mot föreskrifter ingår inte. Därför öppnas bara nätbilagan i sin helhet
härifrån.

Varje vy har en adress: `/it-miljo?id=<ID>` för en zon, ett segment, en tjänst,
en extern anslutning eller ett avsnitt om driftplattformar, och
`/it-miljo?flode=<ID>` för ett mönsters flöde.

Samma miljö finns i katalogen: verksamhetsområden som `Domain`, team som
`Group`, tjänster som `Component` och platser, zoner, segment och externa
anslutningar som `Resource`. Adresser, VLAN och brandväggsregler ingår inte i
miljöbeskrivningen.

Fem av verksamhetssystemen är exempel på en organisations egna system: tågplan,
planerad annonsering, tågläge, trafikinformation och det öppna trafik-API:et.
Deras entiteter, API:er och databaser står i `exempel/katalog/system.yaml`, i
namespace `default`. Miljöbeskrivningen ger dem verksamhetsområde, ägare, zon
och segment.

## Assistenten

Överst på guidens startsida finns assistenten Odin. Den är hopfälld tills du
öppnar den. Där kan du beskriva vad du ska göra och få den styrning som gäller. Assistenten finns bara när en språkmodell är konfigurerad:

```yaml
architecture:
  assistant:
    baseUrl: http://localhost:11434
    model: gemma4:latest
```

`baseUrl` pekar på [Ollama](https://ollama.com), som kör modellen på den egna
maskinen. Inget lämnar maskinen.

Så blir ett svar till:

1. Modellen får frågan och en förteckning över vägledningar och mönster,
   en rad per post, och väljer högst åtta. Den får tid att tänka i det steget,
   och det är det som tar tid.
2. Modellen får de valda posternas egen text och stryker dem som inte gäller.
   Det som stryks visas ändå, under ”Kan också gälla”, men ingår inte i
   sammanfattningen.
3. Registret ger resten: mönstren som en vald vägledning leder till,
   byggstenarna som posterna använder och de bindande regler de bygger på.
4. Modellen skriver en kort sammanfattning ur de valda posternas text.

Modellen väljer och sammanfattar. Det som gäller är posterna, som visas med sin
egen text ur registret. Ett ID som inte finns i registret tas bort ur svaret.
Varje fråga besvaras för sig; assistenten minns inte den föregående.

Assistenten känner bara registret. Det som står i miljöbeskrivningen men inte i
en artefakt, till exempel kapacitet och operativa system, kommer inte med.

`plugins/architecture-backend/src/assistant.live.test.ts` ställer nio frågor till
den riktiga modellen och skriver ut vad den hittade. Kör den när instruktionen
eller modellen ändras:

```sh
ASSISTANT_LIVE=1 yarn workspace @myndigheten/backstage-plugin-architecture-backend test assistant.live
```

## Hur det hänger ihop i modellen

- Artefakttypen **vägledning** och relationerna **leder till** och **använder**
  har tillkommit. En relation kan ha en anmärkning: vägvalets villkor eller
  byggstenens roll.
- Alla artefakter kan ha **ämnesområde**. Referensarkitekturer har **flöden**,
  ett per rad: `Från [zon] -> Till [zon]: vad som skickas`.
- En bindande regel utan krav är sitt eget krav. Hur kontrollerna utförs
  står inte i registret.
- Miljön hämtas från `GET /api/architecture/v1/environment`. Zoner, segment,
  platser, externa anslutningar, tjänster och system läses ur katalogen, högst
  en minut gamla. Miljöerna och den löpande texten kommer ur innehållsrepots
  `it-miljo/beskrivning.yaml`.
- Ett flöde som öppnar en anslutning som zonmodellen inte tillåter visas som
  fel på mönstrets sida. Generatorn vägrar dessutom att skapa innehåll med ett
  sådant flöde, med en byggsten i fel zon eller med en hänvisning till ett ID
  som inte finns.

## Hur får jag mitt system att synas i IT-miljön?

Lägg till en annotation i systemets `catalog-info.yaml` som säger vilket
segment det står i:

```yaml
kind: Component
metadata:
  name: mitt-system
  title: Mitt system
  description: Vad systemet gör.
  annotations:
    architecture.portal/segment: tjanst-container
spec:
  owner: team-mitt-team
  dependsOn:
    - component:it-miljo/api-gateway-intern
```

Segmentets ID står på sidan **IT-miljön** när du öppnar en zon. Systemet syns
på kartan så snart katalogen har läst filen; inget skript och ingen omstart
behövs.

| Det sidan visar       | Det hämtas från                                                                                                                                                      |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Zon och segment       | `architecture.portal/segment`. Zonen följer av segmentet.                                                                                                            |
| Namn och syfte        | `metadata.title` och `metadata.description`                                                                                                                          |
| Beställs hos          | `spec.owner`                                                                                                                                                         |
| Bygger på             | `spec.dependsOn` mot andra system och tjänster på kartan                                                                                                             |
| Gränssnitt (valfritt) | `architecture.portal/interfaces`                                                                                                                                     |
| Kategori (valfritt)   | `architecture.portal/category`: `building-block`, `infrastructure`, `shared-service` eller `business-system`. Utan annotation räknas systemet som verksamhetssystem. |

Ett system utan annotationen står under **System i katalogen utan placering**
längst ned på sidan. Pekar annotationen på ett segment som inte finns visas
systemet inte, och sidan säger varför överst.

Miljön själv ligger också i katalogen, i namespace `it-miljo`: tjänsterna som
`Component`, verksamhetsområdena som `Domain`, teamen som `Group`, och platser,
zoner, segment och externa anslutningar som `Resource`:

| `spec.type`        | Annotationer under `architecture.portal/` |
| ------------------ | ----------------------------------------- |
| `network-zone`     | `domain`, `accepts-from`                  |
| `network-segment`  | `zone`, `stages`, `sites`                 |
| `site`             | `site-type`                               |
| `external-service` | `zone`, `through`, `connection`           |

Entitetens namn är dess ID, det som står inom hakparentes i ett flöde. I
`through` är ett namn utan kolon ett segment, och en tjänst anges med hela
referensen (`component:it-miljo/filoverforing`). Alla får ha
`architecture.portal/order`, som bestämmer ordningen på sidan.

## Ändra innehållet

Ändra filen i innehållsrepot och skicka en pull request: en vägledning, ett
mönster eller en regel under `styrning/`, en tjänst eller zon i
`it-miljo/katalog.yaml`, en driftplattforms text i `it-miljo/beskrivning.yaml`.
Kontrollen i repots CI vägrar ett flöde som zonmodellen inte tillåter, en
byggsten i fel zon eller en hänvisning till något som inte finns; det är
samma kontroll som portalen läser med. Ordvalen står i innehållsrepots
`ordlista.md`.

## Inte gjort

- Byggstenarnas katalogsidor visar inte vilka mönster som använder dem. Det
  syns på sidan IT-miljön.
- Kraven i registret har inga strukturerade villkor, så guiden kan inte räkna
  fram vilka krav som gäller för en viss lösning i katalogen.
