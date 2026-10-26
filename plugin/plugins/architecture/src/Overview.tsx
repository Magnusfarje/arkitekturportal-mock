import { Box, Link, Paper, Typography } from '@material-ui/core';
import { Link as RouterLink } from 'react-router-dom';
import { Content, Header, Page } from '@backstage/core-components';
import {
  bindingLabels,
  fieldLabels,
  idPrefixes,
  kindLabels,
  kinds,
  relationLabels,
  relationTypes,
} from '@myndigheten/backstage-plugin-architecture-common';
import { Rows, Section } from './parts';
import { OverviewDiagram } from './OverviewDiagram';

// The page is static: it describes the model, not the content of the registry.
const binding: Record<(typeof kinds)[number], string> = {
  'architecture-principle': bindingLabels.binding,
  'technical-principle': `${
    bindingLabels.binding
  } eller ${bindingLabels.recommended.toLowerCase()}`,
  'reference-architecture': bindingLabels.recommended,
  guide: bindingLabels.guidance,
};
const question: Record<(typeof kinds)[number], string> = {
  'architecture-principle': 'Vilka ramar gäller för hela arkitekturen?',
  'technical-principle': 'Vad ska gälla, och vad har vi valt?',
  'reference-architecture': 'Hur ser en bra lösning ut här?',
  guide: 'Hur löser jag min uppgift?',
};
const meaning: Record<(typeof relationTypes)[number], string> = {
  concretizes: 'En teknisk princip preciserar en arkitekturprincip.',
  'motivated-by':
    'Artefakten grundas i ett mål, en risk eller annan styrning. En vägledning anger så de regler den bygger på.',
  replaces: 'En artefakt ersätter en annan. Den ersatta visas som ersatt.',
  'leads-to':
    'En vägledning pekar ut den artefakt som gäller i ett visst läge. Läget anges som anmärkning.',
  uses: 'En referensarkitektur eller vägledning använder en byggsten i katalogen. Byggstenens roll anges som anmärkning.',
};

export function OverviewPage() {
  return (
    <Page themeId="documentation">
      <Header
        title="Så hänger det ihop"
        subtitle="Arkitekturstyrningen och dess delar – från fråga till bindande krav"
      />
      <Content>
        <Box component={Paper} p={2} mb={3}>
          <Typography>
            Modellen, innehållet och IT-miljön på den här sidan är förslag, inte
            beslutad styrning.
          </Typography>
        </Box>

        <Section title="Varför en gemensam ingång?">
          <Typography paragraph>
            Arkitekturstyrning och dokumentation om IT-landskapet är spridda
            över flera källor. Det är inte alltid tydligt var gällande styrning
            finns, vilken version som gäller eller vem som ansvarar för
            innehållet. Sambandet mellan styrning, beslut och IT-landskap bygger
            på manuell sammanställning och enskildas kunskap.
          </Typography>
          <Typography paragraph>
            Portalen ska vara den ingång där du kan se vilken styrning som
            gäller, inom vilket område, vem som ansvarar för den, vilka beslut
            som är relevanta, hur artefakterna hänger ihop och var information
            om berörda delar av IT-landskapet finns. Innehållet behöver inte
            förvaltas centralt, men struktur, identifiering och relationer är
            gemensamma.
          </Typography>
          <Typography paragraph>
            På sikt ska styrningen och den faktiska arkitekturen kunna läsas
            tillsammans: utifrån ett system se vilken styrning som gäller, och
            med assistenter söka, tolka och relatera innehållet.
          </Typography>
        </Section>

        <Section title="Tre källor, två sätt att få svar">
          <Typography paragraph>
            Vägledningen bygger på tre källor med olika roller, och två delar
            som levererar svaret.
          </Typography>
          <Box overflow="auto" mb={2}>
            <OverviewDiagram />
          </Box>
          <Rows
            head={['Del', 'Roll', 'Svarar på']}
            rows={[
              [
                'Arkitekturstyrning',
                'Källa',
                'Vad gäller? Vägledningar, mönster, regler och principer, med bindningsgrad och relationer.',
              ],
              [
                'IT-miljöbeskrivning',
                'Källa',
                'Hur ser miljön ut? Platser, zoner, zonmodellen, segment, byggstenar och plattformar.',
              ],
              [
                'Systemkatalog',
                'Källa',
                'Vad finns? System, komponenter, API:er, team och beroenden, och var varje system står.',
              ],
              [
                'Guiden',
                'Svar',
                'Från fråga till mönster, byggstenar, regler och krav.',
              ],
              [
                'Assistenten',
                'Svar',
                'Väljer och sammanfattar poster ur registret.',
              ],
            ]}
          />
          <Box mt={2}>
            <Typography paragraph>
              Förmågan uppstår i kopplingarna mellan källorna. Ett mönster
              använder en byggsten i katalogen. Ett system placeras i ett
              segment med annotationen architecture.portal/segment. Ett flöde
              prövas mot zonmodellen. Utan någon av de tre blir svaret en regel
              utan plats, en plats utan regel, eller en regel som inte går att
              knyta till ett system.
            </Typography>
            <Typography paragraph>
              Skilj på roll och lagring. Miljöbeskrivningen importeras till
              katalogen som Domain, Group, Component och Resource, och portalen
              läser zoner, segment och tjänster därifrån vid varje anrop. Bara
              den löpande texten, driftmiljöerna, begreppen och
              plattformsavsnitten står i miljöbeskrivningens egen fil.
              Miljöbeskrivningen är källan och modellen. Katalogen är där det
              står, och där systemen kopplas in. Guiden och assistenten tillför
              ingen egen information. Utan dem är de tre bara register, och utan
              de tre har guiden inget att svara med.
            </Typography>
          </Box>
        </Section>

        <Section title="Så hänger det ihop">
          {' '}
          <Typography paragraph>
            En vägledning börjar i frågan och leder till ett mönster, eller
            pekar ut en byggsten där det ännu inte finns något mönster. Mönstret
            visar flödet mellan zoner, vilka byggstenar som används och vad
            lösningen själv ansvarar för. Mönstret bygger på regler och krav,
            som är det bindande.
          </Typography>
          <Rows
            head={['Del', 'Svarar på', 'Exempel']}
            rows={[
              [
                'Vägledning',
                'Hur löser jag min uppgift?',
                'VL-EXP-01 – Hur publicerar jag ett API mot internet?',
              ],
              [
                'Referensarkitektur (mönster)',
                'Hur ser en bra lösning ut här?',
                'RA-EXP-02 – API mot internet',
              ],
              [
                'Byggsten',
                'Vad finns att använda, och vem förvaltar det?',
                'Extern API-gateway',
              ],
              [
                'Zonmodell',
                'Hur ser miljön ut, och vad får tala med vad?',
                'Exponeringszon, tjänstezon, OT-DMZ',
              ],
              [
                'Regel och krav',
                'Vad ska gälla, vad har vi valt, och hur bedöms det?',
                'TP-EXP-01, TP-BEH-01',
              ],
            ]}
          />
          <Box mt={2}>
            <Typography>
              Vägledningar och mönster är rekommendationer. Bindande är reglerna
              och kraven.
            </Typography>
          </Box>
        </Section>

        <Section title="Fyra typer av artefakter">
          <Rows
            head={[
              'Typ',
              'Prefix',
              'Bindningsgrad',
              'Frågan den svarar på',
              'Huvudfält',
            ]}
            rows={kinds.map(kind => [
              kindLabels[kind],
              idPrefixes[kind],
              binding[kind],
              question[kind],
              fieldLabels[kind].statement,
            ])}
          />
          <Box mt={2}>
            <Typography paragraph>
              Ett ID börjar med typens prefix, följt av en ämneskod och ett
              nummer, till exempel TP-BER-01. Alla artefakter har samma grund:
              formulering, motiv, tillämpningsområde, konsekvenser,
              innehållsägare och källreferens. Referensarkitekturer har flöden
              mellan zoner.
            </Typography>
            <Typography paragraph>
              En vägledning får inte införa egna krav. Det som är bindande står
              i regeln eller principen som vägledningen hänvisar till.
            </Typography>
          </Box>
        </Section>

        <Section title="Relationer">
          <Rows
            head={['Relation', 'Betydelse']}
            rows={relationTypes.map(type => [
              relationLabels[type],
              meaning[type],
            ])}
          />
          <Box mt={2}>
            <Typography paragraph>
              En relation kan ha en anmärkning: vägvalets villkor eller
              byggstenens roll i mönstret. En vägledning ska ha minst en
              relation, så att det går att se vad svaret bygger på.
            </Typography>
          </Box>
        </Section>

        <Section title="Krav och bedömning">
          <Typography paragraph>
            Krav är delar av en artefakt, inte en egen typ. En teknisk princip
            kan ha krav med eget ID, till exempel TP-BER-01-K02, med
            formulering, tillämpningsområde och bedömningskriterier. En bindande
            regel utan krav är sitt eget krav: formuleringen är det som bedöms.
            En arkitekturprincip bedöms genom kraven i de tekniska principer som
            konkretiserar den.
          </Typography>
          <Typography paragraph>
            Ett krav kan ange kontrollmetod: manuell, automatisk eller
            kombinerad. Hur kontrollerna utformas står utanför registret.
            Resultatet är uppfyllt, ej uppfyllt, ej bedömbart eller ej bedömt.
            Saknat underlag ger aldrig uppfyllt. Rekommendationer följs upp, men
            hålls isär från bindande krav.
          </Typography>
        </Section>

        <Section title="IT-miljön">
          <Typography paragraph>
            Styrningen utgår från myndighetens IT-miljö. Miljön består av
            platser, driftmiljöer, zoner grupperade i domäner, segment i varje
            zon, och tjänster och system i fyra slag: byggstenar,
            infrastrukturtjänster, gemensamma tjänster och verksamhetssystem.
            Till det kommer externa anslutningar.
          </Typography>
          <Typography paragraph>
            Zonmodellen säger vad som får tala med vad. Ett mönsters flöde ska
            följa den, och ett flöde som bryter mot den visas som fel. Samma
            miljö finns i katalogen: verksamhetsområden som Domain, team som
            Group, tjänster som Component och platser, zoner, segment och
            externa anslutningar som Resource. Ett system placeras i miljön med
            annotationen architecture.portal/segment.
          </Typography>
          <Typography>
            <Link component={RouterLink} to="/it-miljo">
              IT-miljön
            </Link>{' '}
            visar miljön som en karta och ritar mönstrens flöden mellan zonerna.
          </Typography>
        </Section>

        <Section title="Guiden – från fråga till mönster">
          <Typography paragraph>
            Guiden är skriven för dig som ska bygga något och behöver ett svar.
            Den börjar i frågan, inte i regeln. En vägledning har alltid samma
            delar:
          </Typography>
          <Rows
            head={['Del', 'Innehåll']}
            rows={[
              ['Kort svar', 'Det normala svaret, i två till fyra meningar.'],
              [
                'Innan du börjar',
                'Det du behöver veta om din lösning för att välja rätt.',
              ],
              [
                'Vägval',
                'De lägen som ger olika svar, och vilket mönster var och en leder till.',
              ],
              [
                'Byggstenar',
                'De byggstenar svaret använder, när inget mönster visar dem.',
              ],
              ['Gör så här', 'Stegen för att genomföra det.'],
              [
                'Bygger på',
                'De regler och krav som gäller, hämtade från vägledningen och dess mönster.',
              ],
            ]}
          />
          <Box mt={2}>
            <Typography paragraph>
              Ett exempel: frågan "Hur publicerar jag ett API mot internet?"
              besvaras av VL-EXP-01, som leder till mönstret RA-EXP-02. Mönstret
              använder byggstenen Extern API-gateway och bygger på regeln
              TP-EXP-01. Det bindande är regeln, inte vägledningen.
            </Typography>
            <Typography>
              <Link component={RouterLink} to="/arkitekturguide">
                Arkitekturguiden
              </Link>{' '}
              samlar vägledningar, mönster och regler per ämnesområde.
            </Typography>
          </Box>
        </Section>

        <Section title="Assistenten Odin">
          <Typography paragraph>
            Överst i guiden finns assistenten Odin. Du beskriver vad du ska göra
            och får den styrning som gäller. Ett svar blir till i fyra steg:
          </Typography>
          <ol>
            <Typography component="li">
              Modellen får frågan och en förteckning över vägledningar och
              mönster, och väljer högst åtta.
            </Typography>
            <Typography component="li">
              Modellen får de valda posternas egen text och stryker dem som inte
              gäller. Det som stryks visas ändå, under "Kan också gälla".
            </Typography>
            <Typography component="li">
              Registret ger resten: mönstren som en vägledning leder till,
              byggstenarna som posterna använder och de bindande regler de
              bygger på.
            </Typography>
            <Typography component="li">
              Modellen skriver en kort sammanfattning ur de valda posternas
              text.
            </Typography>
          </ol>
          <Typography paragraph>
            Modellen väljer och sammanfattar. Det som gäller är posterna, som
            visas med sin egen text ur registret. Modellen körs lokalt genom
            Ollama och assistenten finns bara när en språkmodell är
            konfigurerad.
          </Typography>
        </Section>

        <Section title="Exempelsystemen">
          <Typography paragraph>
            Fem verksamhetssystem i katalogen är exempel på en organisations
            egna system: tågplan, planerad annonsering, tågläge,
            trafikinformation och det öppna trafik-API:et. Miljöbeskrivningen
            ger dem verksamhetsområde, ägare, zon och segment.
          </Typography>
          <Typography paragraph>
            Kedjan tågplan, annonsering och tågläge, trafikinformation och öppet
            API visar var mönstren gäller: tjänst anropar tjänst inom
            tjänstezonen, och API mot internet genom exponeringsplattformen. När
            kraven bedöms mot ett system utan underlag blir resultatet ej
            bedömbart, inte uppfyllt. Det är modellen som avsett.
          </Typography>
        </Section>

        <Section title="Roller och avsteg">
          <Typography paragraph>
            Innehållsägaren ansvarar för att innehållet är aktuellt, för
            ändringsförslag och för kvaliteten. Den som ansvarar för en lösning
            ansvarar för att tillämpa styrningen och för att initiera avsteg vid
            behov. Innehållet ändras i innehållsrepot, som arkitekturstyrningen
            förvaltar; portalen visar det. Alla inloggade kan läsa.
          </Typography>
          <Typography paragraph>
            Ett avsteg från bindande styrning är ett separat beslut, med
            referens till kravet, omfattning, motivering, konsekvenser och risk,
            kompenserande åtgärder, beslutsfattare, giltighetstid och tidpunkt
            för uppföljning. En dokumenterad brist med namngiven ägare och datum
            för åtgärd hanteras som ett tidsbegränsat avsteg. Ett godkänt avsteg
            ändrar inte kravets bedömningsresultat: ett krav kan vara ej
            uppfyllt samtidigt som ett giltigt avsteg finns. Någon
            avstegsprocess finns inte i registret ännu. Var avsteg beslutas är
            inte bestämt.
          </Typography>
        </Section>

        <Section title="Allt är förslag – och det som inte är gjort">
          <Typography paragraph>
            Allt i registret är förslag tills ett arbetssätt för fastställande
            är bestämt. Bindningsgraden anger vad som är avsett att gälla när
            innehållet har fastställts, och får inte läsas som beslutad
            styrning. Registret håller ett innehåll per artefakt.
          </Typography>
          <Typography paragraph>Det som inte är gjort:</Typography>
          <ul>
            <Typography component="li">
              Versioner av artefakter, historik och jämförelse mellan versioner.
            </Typography>
            <Typography component="li">
              Granskning, fastställande, giltighetstid, översyn och upphävande.
            </Typography>
            <Typography component="li">
              Avstegsprocess och beslutsmandat.
            </Typography>
            <Typography component="li">
              Koppling mellan styrning och enskilda system i katalogen.
            </Typography>
          </ul>
        </Section>

        <Section title="Läs vidare">
          <Typography>
            <Link component={RouterLink} to="/arkitekturguide">
              Arkitekturguiden
            </Link>{' '}
            – svar på vanliga frågor, med mönster, byggstenar, beslut och krav.
          </Typography>
          <Typography>
            <Link component={RouterLink} to="/it-miljo">
              IT-miljön
            </Link>{' '}
            – zoner, plattformar, tjänster och system som en karta.
          </Typography>
          <Typography>
            <Link component={RouterLink} to="/architecture">
              Arkitekturstyrning – registret
            </Link>{' '}
            – där innehållet förvaltas, med principer och krav.
          </Typography>
        </Section>
      </Content>
    </Page>
  );
}
