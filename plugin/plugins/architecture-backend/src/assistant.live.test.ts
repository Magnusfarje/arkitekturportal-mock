import { catalogEnvironment, contentDir } from './__testUtils__/content';
import { ContentStore } from './store';
import { directoryReader } from './content';
import { createAssistant, ollamaChat } from './assistant';

// Asks the real language model the questions the guide was tried against, and prints what it found.
// Run it when the instruction or the model changes:
//   ASSISTANT_LIVE=1 yarn workspace @myndigheten/backstage-plugin-architecture-backend test assistant.live
const live = process.env.ASSISTANT_LIVE ? describe : describe.skip;
let blocks: Awaited<ReturnType<typeof catalogEnvironment>>['blocks'];
beforeAll(async () => {
  ({ blocks } = await catalogEnvironment());
});
const questions: { name: string; question: string; expected: string[] }[] = [
  {
    name: 'resenärsinformation',
    question:
      'Jag är lösningsarkitekt för ett nytt system inom resenärsinformation, systemet används operativt och de primära användarna är interna. Information ska också publiceras ut mot internet för vissa leverantörer. Applikationen behöver ha ett grafiskt gränssnitt som de interna användarna använder. Underlag från andra system som vi behöver är tågplaner och planerad annonsering. Hur ska jag bygga det och vad behöver jag förhålla mig till?',
    expected: ['RA-WEB-01', 'RA-EXP-02', 'RA-INT-01', 'RA-INT-02'],
  },
  {
    name: 'fältapp',
    question:
      'Jag bygger en mobilapp för entreprenörernas tekniker ute i anläggningen. De ska se arbetsorder, fotografera och återrapportera, också där det saknas täckning. Teknikerna är inte anställda hos oss och använder sina arbetsgivares telefoner. Hur bygger jag det, och hur loggar de in?',
    expected: ['RA-MOB-01', 'RA-ID-03'],
  },
  {
    name: 'byte av system',
    question:
      'Vi ersätter ett tjugo år gammalt system med en ny lösning. Under ett år måste båda vara i drift, och andra system läser i dag direkt i det gamla systemets databas. Hur lägger jag upp övergången, och hur flyttar jag datat?',
    expected: ['RA-LIV-01', 'RA-INT-01'],
  },
  {
    name: 'molntjänst',
    question:
      'Verksamheten vill köpa ett planeringsverktyg som leverantören bara erbjuder som tjänst i sitt eget moln. Det behöver hämta uppgifter från två av våra interna system varje natt. Går det, och vad krävs i så fall?',
    expected: ['TP-MIL-01'],
  },
  {
    name: 'sensordata',
    question:
      'Vi sätter tiotusentals sensorer på anläggningen som rapporterar tillstånd var tionde sekund. Datat ska användas både för larm i driftcentralen och för analys av slitage över flera år. Var tar jag emot det, var lagrar jag det, och hur når analytikerna det?',
    expected: ['RA-OT-01', 'RA-DATA-01'],
  },
  {
    name: 'lasttopp',
    question:
      'Vår tjänst för störningsinformation har normalt några hundra användare, men vid en stor störning kommer hundratusentals inom minuter, och vi ska skicka sms och pushnotiser. Hur dimensionerar jag, och hur skickar jag meddelandena?',
    expected: ['VL-DRI-05', 'RA-UTS-01'],
  },
  {
    name: 'språkmodell',
    question:
      'Vi vill använda en språkmodell som sammanfattar inkomna ärenden och föreslår svar åt handläggare. Ärendena innehåller personuppgifter. Var kan modellen köras, och vad får jag skicka till den?',
    expected: ['RA-AI-01', 'TP-AI-01'],
  },
  {
    name: 'rapporter',
    question:
      'Controllers och analytiker vill ställa egna frågor mot data från fem verksamhetssystem, och få färdiga rapporter varje måndag. Var hamnar datat, vem äger det där, och hur hålls det aktuellt?',
    expected: ['RA-DATA-01'],
  },
  {
    name: 'realtidskarta',
    question:
      'Trafikledarnas stödsystem ska visa tågens läge på en karta med uppdatering varje sekund, för ett femtiotal samtidiga operatörer. Läget kommer från styrsystemen. Hur får jag fram datat så snabbt, och vad händer med vyn om en datahall faller?',
    expected: ['RA-OT-01', 'RA-WEB-01'],
  },
];

live('the assistant with the configured language model', () => {
  it('finds the governance for the questions the guide was tried against', async () => {
    const store = new ContentStore(directoryReader(contentDir));
    await store.refresh();
    const artifacts = store.list();
    const assistant = createAssistant(
      ollamaChat(
        process.env.ASSISTANT_BASE_URL ?? 'http://localhost:11434',
        process.env.ASSISTANT_MODEL ?? 'gemma4:latest',
      ),
    );
    const report: string[] = [];
    let found = 0;
    let wanted = 0;
    for (const { name, question, expected } of questions) {
      const started = Date.now();
      const answer = await assistant(question, artifacts, blocks);
      // A pattern counts as found when the model chose it, or chose the guide that leads to it.
      // A rule counts as found when a chosen post builds on it.
      const reached = [
        ...answer.items.map(i => i.id),
        ...answer.others.map(i => i.id),
        ...answer.alternatives.map(a => a.id),
        ...answer.basis,
      ];
      const hits = expected.filter(id => reached.includes(id));
      found += hits.length;
      wanted += expected.length;
      report.push(
        `${name}: ${hits.length}/${expected.length} på ${Math.round(
          (Date.now() - started) / 1000,
        )} s\n  valda: ${answer.items
          .map(i => i.id)
          .join(', ')}\n  kan också gälla: ${
          answer.others.map(i => i.id).join(', ') || '–'
        }\n  saknas: ${
          expected.filter(id => !reached.includes(id)).join(', ') || '–'
        }\n  ${answer.summary.replace(/\s+/g, ' ')}`,
      );
      if (!answer.inScope)
        report.push(`  ${name} bedömdes ligga utanför området`);
    }
    const outside = await assistant(
      'Hur lagar jag en god köttfärssås?',
      artifacts,
      blocks,
    );
    report.push(`utanför området avvisas: ${!outside.inScope}`);
    // eslint-disable-next-line no-console
    console.log(`${report.join('\n\n')}\n\nTotalt ${found}/${wanted}`);
    expect(outside.items).toEqual([]);
  }, 900_000);
});
