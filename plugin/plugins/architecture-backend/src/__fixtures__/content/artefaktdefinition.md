# Artefaktdefinition för arkitekturstyrning

Status: Förslag  
Datum: 2026-10-09

## 1. Syfte och omfattning

Specifikationen definierar fyra artefakttyper för arkitekturstyrning: arkitekturprinciper, tekniska principer, referensarkitekturer och vägledningar. Den anger krav på innehåll, metadata, relationer och avstegshantering.

Specifikationen gäller oavsett var innehållet förvaltas. Artefakterna ska kunna tillgängliggöras och relateras till IT-landskapet i arkitekturportalen.

I denna specifikation anger **ska** ett obligatoriskt krav och **bör** en rekommendation.

Versioner av artefakter, beslut och giltighet ingår inte i specifikationen ännu. Allt i registret är förslag, och registret håller ett innehåll per artefakt. Hur innehåll ska fastställas, versioneras och upphävas bestäms när arbetssättet är klart (avsnitt 6).

## 2. Artefakttyper

### 2.1 Arkitekturprincip

**Definition:** En övergripande och långsiktig regel som anger ramar eller vägval för organisationens arkitektur.

**Bindningsgrad:** Bindande inom angivet tillämpningsområde.

**Innehåll:** Principformulering, motiv och konsekvenser för utformning eller förändring av arkitekturen.

**Avsteg:** Avsteg hanteras enligt avsnitt 7.

**Relationer:** Principen kan motiveras av verksamhetsmål, risker, lagkrav eller annan överordnad styrning. Den konkretiseras av tekniska principer, och minst en sådan ska finnas.

### 2.2 Teknisk princip

**Definition:** En regel för teknisk utformning, tekniska vägval eller hur lösningar utvecklas och förvaltas, inom ett avgränsat område. Regeln kan vara organisationens egen eller ett urval av krav som preciserar hur en extern eller intern standard tillämpas. Ett val som organisationen har gjort i sin miljö, till exempel av lösning, protokoll eller plattform, är också en teknisk princip. Ett beslut som ett team fattar för sin egen lösning, till exempel en ADR i lösningens kodförråd, är inte en teknisk princip i denna mening och förvaltas inte i registret.

**Bindningsgrad:** Bindande eller rekommenderad. Bindningsgraden ska anges uttryckligen för varje princip. För ett urval ur en standard ska källans bindningsgrad redovisas skilt från den interna.

**Innehåll:** Principformulering, motiv, tekniskt tillämpningsområde och konsekvenser för implementation eller drift. För ett val av lösning, protokoll eller plattform anges också vad som valdes bort. För ett urval ur en standard anges källa med version och vad urvalet inte täcker. Där ett arbetssätt för att följa regeln är känt står det i konsekvenserna, under ”Så följer du regeln”.

**Krav:** En bindande teknisk princip kan ha identifierbara krav enligt avsnitt 5. Har den inga krav är formuleringen själv kravet.

**Avsteg:** Avsteg från en bindande teknisk princip hanteras enligt avsnitt 7. Ett annat val än en rekommendation ska redovisas med motivering men kräver inte formellt avstegsbeslut. Principen bör ange vilken lösning som gäller under ett avsteg.

**Relationer:** Principen kan konkretisera en eller flera arkitekturprinciper, och motiveras av principer eller andra tekniska principer. Referensarkitekturer och vägledningar bygger på den.

### 2.3 Referensarkitektur

**Definition:** Ett mönster som visar hur en lösning på ett återkommande behov ser ut i organisationens miljö.

**Bindningsgrad:** Rekommenderad. Den som väljer en annan lösning ska kunna visa att reglerna bakom mönstret ändå är uppfyllda.

**Innehåll:** Lösningen, när mönstret passar, flödet mellan zoner, vilka byggstenar som används och vad lösningen själv ansvarar för.

**Avsteg:** Kräver inte formellt avstegsbeslut.

**Relationer:** Mönstret motiveras av tekniska principer och arkitekturprinciper, och använder byggstenar i katalogen. Flödet ska följa zonmodellen.

### 2.4 Vägledning

**Definition:** Ett svar på en praktisk fråga: vilket mönster eller vilken byggsten som passar i ett visst läge. Hur en enskild regel följs väl står i regeln själv, inte i en vägledning.

**Bindningsgrad:** Vägledande. En vägledning får inte införa egna krav. Bindande krav ska refereras till sin styrande artefakt.

**Innehåll:** Kort svar, det som behöver vara känt innan arbetet börjar och stegen för att genomföra det. När svaret beror på läget anges de vägval som ändrar det.

**Avsteg:** Kräver inte formellt avstegsbeslut. Ett annat arbetssätt får väljas, förutsatt att tillämplig bindande styrning följs.

**Relationer:** Vägledningen motiveras av de principer den bygger på, och leder till referensarkitekturer och annan styrning. Den ska ha minst en sådan relation. Den kan också peka ut de byggstenar i katalogen som svaret använder.

## 3. Gemensam struktur och metadata

Samtliga artefakter ska innehålla följande uppgifter.

| Fält | Definition |
|---|---|
| ID | Stabil och unik identifierare. Den börjar med typens prefix: AP för arkitekturprincip, TP för teknisk princip, RA för referensarkitektur och VL för vägledning. Därefter följer en ämneskod och ett nummer, till exempel TP-BER-01. |
| Titel | Kort och entydigt namn. |
| Artefakttyp | En av typerna i avsnitt 2. |
| Bindningsgrad | Bindande, rekommenderad eller vägledande enligt tillåtna värden i avsnitt 2. |
| Formulering | Den regel eller rekommendation som artefakten uttrycker. |
| Motiv | Syfte och skäl till regeln eller rekommendationen. |
| Tillämpningsområde | Berörda objekt, kategorier, teknikområden eller situationer samt eventuella avgränsningar. |
| Konsekvenser eller tillämpningsanvisning | Vad artefakten innebär för berörda parter. |
| Innehållsägare | Roll eller organisatorisk funktion som ansvarar för aktualitet och förvaltning. Tills en ägare är utsedd är fältet tomt och visas som kompletteringsbehov. |
| Källreferens | Referens till artefaktens förvaltade original. |

Följande uppgifter ska anges när de är tillämpliga:

| Fält | Användning |
|---|---|
| Relaterade artefakter | Typade relationer enligt avsnitt 4. |
| Externa referenser | Identifierade externa krav och källor samt förklaring av hur artefakten stödjer deras uppfyllnad. För en regel med krav också var kontrollerna finns. |
| Ersätter | Referens till en artefakt som ersätts. En ersatt artefakt visas som ersatt. |
| Ämnesområde | Det område artefakten hör till, till exempel exponering. Används för att gruppera och hitta. |
| Flöden | För referensarkitekturer: vilka komponenter som ansluter till vilka, och i vilken zon de finns. |

## 4. Relationer och tillämplighet

Relationer ska använda stabila identifierare.

| Relation | Betydelse |
|---|---|
| Konkretiserar | En teknisk princip preciserar en arkitekturprincip. |
| Motiveras av | Artefakten grundas i ett mål, en risk eller annan styrning. En vägledning anger så de regler den bygger på. |
| Ersätter | En artefakt ersätter en annan artefakt. |
| Leder till | En vägledning pekar ut den artefakt som gäller i ett visst läge. Läget anges som anmärkning. |
| Använder | En referensarkitektur eller vägledning använder en byggsten i katalogen. Byggstenens roll anges som anmärkning. |

Tillämpningsområdet ska vara tillräckligt precist för att avgöra om artefakten gäller för en viss lösning. Det ska framgå om den gäller befintliga lösningar, nyutveckling eller vissa typer av förändring.

Saknade uppgifter om en lösning ska redovisas som osäker tillämplighet och får inte automatiskt tolkas som att artefakten inte gäller.

En konkretisering får inte motsäga tillämplig överordnad styrning. Identifierade konflikter ska hänskjutas till ansvariga innehållsägare och beslutsinstanser.

## 5. Identifierbara krav och bedömning

En bindande teknisk princip bedöms genom sina krav. Har den identifierbara krav är de delar av artefakten och utgör inte en separat artefakttyp. Har den inga krav är formuleringen själv kravet.

En arkitekturprincip behöver inget eget krav. Den bedöms genom kraven i de tekniska principer som konkretiserar den, och minst en sådan artefakt ska finnas. Principen ska ange vad de konkretiserande artefakterna inte täcker.

Varje krav ska ha:

- Ett stabilt krav-ID som börjar med artefaktens ID.
- En entydig kravformulering.
- Ett tillämpningsområde, ärvt från artefakten eller uttryckligen avgränsat.
- Bedömningskriterier som anger vad som krävs för uppfyllnad.

Ett krav får ange kontrollmetod: manuell, automatisk eller kombinerad. Kontrollernas utformning, det underlag som krävs och reglerna för omprövning förvaltas i valideringspaketet tills portalen har en bedömningsfunktion. Regeln hänvisar dit under externa referenser.

En bedömning ska referera till krav, berört objekt, tidpunkt, underlag och ansvarig bedömare eller kontrollfunktion. Resultat ska skiljas från kontrollmetod och förekomst av undantag.

Tillåtna bedömningsresultat är **uppfyllt**, **ej uppfyllt**, **ej bedömbart** och **ej bedömt**. Bedömd tillämplighet ska redovisas separat. Saknat eller otillräckligt underlag får inte ge resultatet uppfyllt.

Rekommendationer får följas upp, men ska hållas åtskilda från uppfyllnad av bindande krav.

## 6. Förslag till arbetssätt, och vad som återstår att besluta

Allt innehåll är förslag tills ett arbetssätt för fastställande är bestämt. Bindningsgraden anger vad som är avsett att gälla när innehållet har fastställts, och får inte läsas som beslutad styrning.

Det arbetssätt som föreslås: en YAML-fil per artefakt i ett repo som arkitekturstyrningen äger, en ändring som pull request, granskning i pull requesten, kontrollen mot den här definitionen körd i varje pull request, och git-historiken som historik. Portalen läser repot och ändrar inget.

Följande är inte bestämt och ingår inte i specifikationen ännu. Det är frågor åt den som tar över innehållet:

1. Vem granskar en ändring, och vem får göra en merge?
2. Hur fastställs en artefakt, och hur syns det i filen? Till exempel en nyckel `status` med värdena förslag och fastställd.
3. Hur hålls versioner av en artefakt isär när den ändras efter fastställande? Git-historiken, ett versionsfält, eller en ny fil?
4. Hur länge gäller en artefakt, och när ses den över?
5. Hur upphävs en artefakt, och vad händer med det som hänvisar till den?
6. Vem beslutar om avsteg (avsnitt 7)?
7. Vem är innehållsägare för varje artefakt? Ingen artefakt anger ägare idag.

Innehållsägaren ansvarar för aktualitet, ändringsförslag och kvalitet. Ansvarig för berörd lösning ansvarar för tillämpning och för att initiera avsteg vid behov.

## 7. Avsteg

Ett avsteg från bindande styrning ska dokumenteras som ett separat beslut med:

- Referens till berört krav.
- Berörda objekt och avstegets omfattning.
- Motivering, konsekvenser och riskbedömning.
- Eventuella kompenserande åtgärder och villkor.
- Ansvarig, beslutsfattare och beslutsdatum.
- Giltighetstid och tidpunkt för uppföljning.

En dokumenterad brist, det vill säga att ett bindande krav inte är uppfyllt och att detta är nedskrivet med namngiven ägare och datum för åtgärd, hanteras som ett tidsbegränsat avsteg. Vem som beslutar bestäms när avstegsprocessen är fastställd (avsnitt 6).

Ett godkänt avsteg ändrar inte kravets bedömningsresultat. Portalen ska kunna visa att ett krav är ej uppfyllt samtidigt som ett giltigt avsteg finns.

Ett ändrat krav ska föranleda prövning av om tidigare avsteg fortfarande är tillämpliga. Ett internt avstegsbeslut ska inte behandlas som ett undantag från bakomliggande externa krav.

## 8. Publicering och spårbarhet

Arkitekturportalen ska visa artefakttyp, bindningsgrad, tillämpningsområde och innehållsägare, och att innehållet är förslag. Det ska gå att navigera till relaterade artefakter, berörda objekt och förvaltat original.

Metadata, krav och relationer ska kunna tillgängliggöras strukturerat för sökning och maskinell behandling. Innehållet får förvaltas distribuerat under förutsättning att specifikationen följs.

Automatiskt föreslagna klassificeringar, relationer eller kravtolkningar ska vara märkta som härledda och spårbara till källa och metod. De får inte presenteras som beslutad styrning utan fastställande av behörig funktion.
