# Överlämning

Det här dokumentet är ingången för den som tar över. Det säger vad som byggdes,
vilka val som gjordes och varför, vad som inte är gjort, och vilka frågor som
återstår att besluta. Koden och innehållet är förlagor: läs dem, ta det som
håller, och bygg eget.

## Vad PoC:n visar

En portal i Backstage där utvecklare och arkitekter hittar styrningen utan att
leta i dokument. Tre sidor och en assistent:

- **Arkitekturstyrning**, registret: sök bland principer, regler, mönster och
  vägledningar, följ relationerna, se vad som saknas i en artefakt.
- **Arkitekturguide**, läsvyn: för den som ska bygga något och behöver ett
  svar. Vägledningarna leder till mönster, mönstren till regler, reglerna till
  krav.
- **IT-miljön**, kartan: platser, zoner, segment, tjänster och system, med
  mönstrens flöden ritade mellan zonerna. Organisationens egna system syns där
  de placerat sig.
- **Så hänger det ihop**, översikten: modellen förklarad i portalen.
- **Assistenten**: en lokal språkmodell som svarar med artefakternas egen text
  och pekar på dem. Valfri.

Innehållet är en namnlös myndighets IT-miljö och en föreslagen styrning för
den. Inget av det är beslutat, och miljön är en referensmiljö. De fem
exempelsystemen i `exempel/katalog/system.yaml` är en kedja från tågplan till
öppet trafik-API, som visar var mönstren gäller.

## Designvalen och varför

**Innehållet är YAML-filer i ett eget repo, inte en databas i portalen.** En
fil per artefakt, en katalog per artefakttyp. Arkitekturstyrningen äger repot;
portalen läser det och ändrar inget. Varför: en ändring blir en pull request,
granskningen sker där, historiken är git-historiken, och innehållet överlever
portalen. Ingen skrivfunktion behövde byggas. Se `innehall/README.md`.

**Ett innehåll per artefakt, inga versioner i portalen.** Registret visar det
som ligger i repot nu. Varför: versioner, giltighet och fastställande är
arbetssätt som inte var bestämda, och att bygga dem före beslutet hade låst
beslutet. Git-historiken räcker tills dess. Se `artefaktdefinition.md` §6.

**Artefaktdefinitionen är ett dokument och ett schema, och de säger samma
sak.** `innehall/artefaktdefinition.md` är texten. Zod-schemat i
`plugin/plugins/architecture-common/src/index.ts` är samma regler i kod. Varför:
den som skriver innehåll läser dokumentet, portalen läser schemat, och
kontrollen säger ifrån när filerna inte följer det.

**Kontrollen ligger i `architecture-common` och körs på två ställen.**
`checkContent` kontrollerar ID-prefix, katalog, hänvisningar, flöden mot
zonmodellen, byggstenar mot zoner, okända nycklar och ordval. Portalen kör den
vid varje läsning; innehållsrepot är tänkt att köra den i varje pull request.
Varför: samma kod på båda ställen betyder att det som går igenom i pull
requesten går igenom i portalen. Bryter innehållet mot definitionen serverar
portalen det senast lästa tills repot är rättat.

**Registret hålls i minnet, utan egen lagring.** Backend-pluginet läser hela
repot som ett träd vid start och sedan på schema (var femte minut), och håller
det i minnet. Varför: innehållet är litet, originalet är repot, och en databas
hade blivit en kopia att hålla i synk. Konsekvens: starten faller om första
läsningen faller, och varje instans läser själv.

**IT-miljön är katalogentiteter, inte en egen datamodell.** Platser, zoner,
segment och externa anslutningar är `Resource`, tjänster och system är
`Component`, verksamhetsområden `Domain`, team `Group`, allt i namespace
`it-miljo`. Varför: Backstage ger relationer, ägarskap, sök och entitetssidor
gratis, och organisationens egna system kan peka in i miljön med vanliga
katalogrelationer. Det som katalogen inte kan uttrycka, driftmiljöer och
plattformarnas text, ligger i `it-miljo/beskrivning.yaml`.

**Ett system placerar sig självt i miljön.** Annotationen
`architecture.portal/segment` i systemets `catalog-info.yaml` säger var det
står, och `dependsOn` säger vad det bygger på. Varför: den som äger systemet
äger placeringen, och ingen central lista behöver hållas. Se
`exempel/katalog/system.yaml`.

**Zonmodellen är data, och mönstrens flöden kontrolleras mot den.** En zon
anger med `architecture.portal/accepts-from` vilka zoner den tar emot
anslutningar från. Ett mönsters flöde skrivs `Från [zon] -> Till [zon]: vad`,
och ett flöde som zonmodellen inte tillåter visas som fel. Varför: det gör
zonmodellen prövbar i stället för en bild i ett dokument.

**Krav är identifierbara och bedömningsbara.** En bindande teknisk princip har
krav med ID, formulering, tillämpningsområde, kriterier, vad som inte räcker
och kontrollmetod. Varför: det är kraven som bedöms mot ett system, inte
principen. Bedömningen själv är inte byggd. Se `artefaktdefinition.md` §5.

**Assistenten är ett tillägg, inte en förutsättning.** Den finns bara när en
språkmodell med Ollama-kompatibelt API är konfigurerad, svarar bara med
artefakternas text och pekar alltid på källan. Varför: svaren ska gå att
kontrollera, och portalen ska fungera utan modellen. Kvaliteten beror på
modellen och prompten; `assistant.live.test.ts` mäter den mot en lokal modell.

**Behörigheten är en enda: `architecture.read`.** Varje anrop prövas mot den i
Backstages permission-ramverk. Varför: organisationens policy avgör vem som
läser, och inget skrivs genom portalen.

## Vad som inte är gjort

- "Föreslå ändring" från portalen, som skapar en pull request i innehållsrepot.
- Versioner, giltighet, fastställande och upphävande som uppgifter i filerna.
- Avstegsprocess och beslutsmandat.
- Bedömning av krav mot system i portalen. Modellen finns (§5), funktionen inte.
- Koppling mellan styrning och enskilda system i katalogen.
- Sökindexering av artefakterna i Backstages sök.
- Länkar i pluginen är hårdkodade sökvägar, inte route refs. Fungerar så länge
  sidorna ligger där de ligger.
- Pluginen kräver Backstages nya frontendsystem, som fortfarande är 0.x.
  Uppgraderingar kan kräva kodändringar.

## Frågor att besluta

Åt arkitekturstyrningen, ur `innehall/artefaktdefinition.md` §6:

1. Vem granskar en ändring, och vem får göra en merge?
2. Hur fastställs en artefakt, och hur syns det i filen?
3. Hur hålls versioner isär efter fastställande?
4. Hur länge gäller en artefakt, och när ses den över?
5. Hur upphävs en artefakt?
6. Vem beslutar om avsteg?
7. Vem är innehållsägare för varje artefakt?

Åt Backstage-förvaltningen:

1. Var ligger innehållsrepot, och vilken integration läser det?
2. Vilken permission-policy ger `architecture.read`?
3. Ska assistenten finnas, och mot vilken modell?
4. Hur ordnas sidorna i sidomenyn, och under vilket namn?

## Var exemplen finns

| Vad | Var |
| --- | --- |
| En artefakt av varje typ | `innehall/styrning/<typ>/`, till exempel `AP-SÄK-02`, `TP-BER-01`, `RA-EXP-02`, `VL-AI-01` |
| Nycklarna per typ | `innehall/styrning/README.md` |
| IT-miljön som katalog | `innehall/it-miljo/katalog.yaml` |
| Det katalogen inte säger | `innehall/it-miljo/beskrivning.yaml` |
| Ett system som placerar sig i miljön | `exempel/katalog/system.yaml` |
| Konfigurationen | `exempel/app-config.yaml` |
| API-kontraktet | `plugin/plugins/architecture-backend/src/contract.ts`, serverat på `/api/architecture/v1/openapi.json` |
| Kontrollreglerna | `checkContent` i `plugin/plugins/architecture-common/src/index.ts` |
| Ordvalen | `innehall/ordlista.md` |
