# Ordlista för arkitekturstyrning

Status: Förslag  
Datum: 2026-10-01

Ordlistan gäller texten i artefakterna: principer, regler, mönster och vägledningar. Den finns för att samma sak ska heta samma sak i hela styrningen.

Utgångspunkten är att skriva det ord utvecklare och arkitekter själva använder. Ett engelskt uttryck som är etablerat behålls. En svensk översättning som ingen säger gör texten svårare, inte lättare.

## 1. Skriv så här

| Skriv | I stället för | Kommentar |
|---|---|---|
| repo | kodförråd, repository | |
| pipeline | byggflöde, leveransflöde | |
| container-image | avbild | |
| stack trace | stackspår | |
| parametriserade frågor | parameterbindning | |
| på serversidan | i ett betrott tjänstelager | En kontrollpunkt som anroparen inte kan påverka. |
| data utifrån | obetrodda data | Data från en källa som lösningen inte själv kontrollerar, också andra interna system. |
| underlag | evidens | Det som visar att ett krav är uppfyllt. |
| som standard | i förval | |
| säkerhetskopia | backup | Gränssnitt och fält i en källa behåller sitt namn, till exempel SSI-BKP. |
| en token, tokenen | ett token, tokenet | |
| enhet | tillgång | I ERJU-profilen, för källans ”asset”. |
| du | ni | Texten talar till den som ska göra något. |

## 2. Engelska uttryck som behålls

Pull request, merge, commit, branch, feature flag, token, claims, runtime, release, CI, API, mTLS och MFA.

Förkortningar ur en källa, till exempel ERJU-profilens ECS, SCS och SSI, behålls och förklaras där de först används. Begreppen i ERJU-profilen förklaras i AP-ERJU-01.

## 3. Ord som betyder samma sak

| Ord | Betyder samma som | Var det förekommer |
|---|---|---|
| lösning | system | Guiden och principerna skriver lösning. Posterna om mjukvaruutveckling skriver system. |
| bindande | obligatoriskt | Registret skriver bindande. Posterna om mjukvaruutveckling skriver obligatoriskt. |
| rekommenderad | huvudregel | På samma sätt. |
| vägledande | god praxis | På samma sätt. |
| ska, bör | bindande, rekommenderad | I kravtext. |

## 4. Avsteg, avvikelse och brist

| Ord | Betydelse |
|---|---|
| avsteg | Ett beslut om att ett bindande krav inte behöver följas, för ett visst objekt och en viss tid. |
| dokumenterad brist | Ett bindande krav är inte uppfyllt, och det är nedskrivet med namngiven ägare och datum för åtgärd. Hanteras som ett tidsbegränsat avsteg. |
| avvikelse från en huvudregel | Ett annat val än det rekommenderade. Redovisas med motivering, till exempel som ett beslut i lösningens repo, men kräver inget avstegsbeslut. |

## 5. Iakttagelser som inte är åtgärdade

- Byggstenen Hemlighetstjänst i referensmiljön kan läsas som en underrättelsetjänst. ”Hemlighetsvalv” ligger närmare det engelska ”vault”.
- Posterna om mjukvaruutveckling är återgivna ordagrant och följer därför inte ordlistan. Iakttagelserna om språket där står i paketets avsnitt 1.
- Orden tillitsgräns, kontrollpunkt och åtkomstfunktion används i principerna utan att vara vardagsord. De är kvar eftersom de har en bestämd innebörd i kraven.
