import {
  ArtifactView,
  BuildingBlock,
  emptyArtifact,
} from '@myndigheten/backstage-plugin-architecture-common';
import { Chat, createAssistant, ollamaChat } from './assistant';

const artifact = (a: Partial<ArtifactView>): ArtifactView => ({
  ...emptyArtifact(),
  scope: 'Lösningar',
  completionNeeds: [],
  ...a,
});
const artifacts = [
  artifact({
    id: 'VL-EXP-01',
    kind: 'guide',
    binding: 'guidance',
    title: 'Hur publicerar jag ett API mot internet?',
    statement: 'Genom exponeringsplattformen och den externa gatewayen.',
    relations: [
      { type: 'leads-to', target: 'RA-EXP-02', note: 'API:et finns i IT.' },
      {
        type: 'leads-to',
        target: 'RA-INT-03',
        note: 'Partnern vill ha filer.',
      },
      { type: 'motivated-by', target: 'TP-EXP-01' },
    ],
  }),
  artifact({
    id: 'RA-EXP-02',
    kind: 'reference-architecture',
    binding: 'recommended',
    title: 'API mot internet',
    statement: 'API:et publiceras genom gatewayen.',
    relations: [
      { type: 'uses', target: 'component:default/api-gateway-extern' },
      { type: 'uses', target: 'component:default/okand' },
      { type: 'motivated-by', target: 'TP-EXP-01' },
      { type: 'motivated-by', target: 'TP-ENK-20' },
    ],
  }),
  artifact({
    id: 'RA-INT-03',
    kind: 'reference-architecture',
    binding: 'recommended',
    title: 'Filer genom filöverföringstjänsten',
    statement: 'Filer lämnas i den yttre noden.',
  }),
  // A binding rule is what the chosen items build on. A rule is not something the model chooses.
  artifact({
    id: 'TP-EXP-01',
    kind: 'technical-principle',
    binding: 'binding',
    title: 'Allt publiceras genom exponeringsplattformen',
    statement: 'Publicering sker genom exponeringsplattformen.',
  }),
  // A recommended rule is not part of what binds.
  artifact({
    id: 'TP-ENK-20',
    kind: 'technical-principle',
    binding: 'recommended',
    title: 'Gränssnitt följer etablerade standarder',
    statement: 'Standarder återanvänds.',
  }),
];
const blocks = [
  {
    id: 'api-gateway-extern',
    ref: 'component:default/api-gateway-extern',
    name: 'Extern API-gateway',
  },
] as BuildingBlock[];
// A model that answers the choice with what the test gives it, and then writes a summary.
const model = (choice: object, summary = '') => {
  const calls: { messages: any[]; format?: any; think?: boolean }[] = [];
  const chat: Chat = async (messages, options) => {
    calls.push({ messages, ...options });
    return options?.format ? JSON.stringify(choice) : summary;
  };
  return { chat, calls };
};

it('lets the model choose among guides and patterns, and reads the rest from the registry', async () => {
  const { chat, calls } = model(
    {
      inom_omradet: true,
      poster: [
        { id: 'VL-EXP-01', varfor: 'Frågan gäller ett API utåt.' },
        { id: 'RA-EXP-02', varfor: 'API:et finns i verksamhets-IT.' },
      ],
    },
    'Publicera enligt [RA-EXP-02], som bygger på [TP-EXP-01].',
  );
  const answer = await createAssistant(chat)(
    'Hur publicerar jag ett API?',
    artifacts,
    blocks,
  );
  expect(answer).toEqual({
    inScope: true,
    summary: 'Publicera enligt RA-EXP-02, som bygger på TP-EXP-01.',
    items: [
      { id: 'VL-EXP-01', why: 'Frågan gäller ett API utåt.' },
      { id: 'RA-EXP-02', why: 'API:et finns i verksamhets-IT.' },
    ],
    others: [],
    // The pattern the guide leads to that the model did not choose, with the guide's condition.
    alternatives: [
      { id: 'RA-INT-03', from: 'VL-EXP-01', when: 'Partnern vill ha filer.' },
    ],
    blocks: ['component:default/api-gateway-extern'],
    basis: ['TP-EXP-01'],
  });
  // The model is offered what a reader starts from, not the rules, and may only answer with those IDs.
  const offered = calls[0].format.properties.poster.items.properties.id.enum;
  expect(offered).toEqual(['VL-EXP-01', 'RA-EXP-02', 'RA-INT-03']);
  expect(calls[0].messages[1].content).toContain(
    'VL-EXP-01: Hur publicerar jag ett API mot internet?',
  );
  // The choice is made with time to think. The review and the summary are not.
  expect(calls.map(c => c.think)).toEqual([true, undefined, undefined]);
  // The review and the summary are made from the chosen items' own text.
  expect(calls[1].messages[1].content).toContain(
    '[RA-EXP-02] API mot internet',
  );
  expect(calls[2].messages[1].content).toContain(
    'Byggstenar: Extern API-gateway',
  );
  expect(calls[2].messages[1].content).toContain(
    'Bindande regler och principer bakom posterna:\n[TP-EXP-01]',
  );
});

it('drops what the registry does not hold, from the choice and from the summary', async () => {
  const { chat } = model(
    {
      inom_omradet: true,
      poster: [
        { id: 'RA-FINNS-99', varfor: 'Påhittad.' },
        { id: 'TP-ENK-20', varfor: 'En regel går inte att välja.' },
        { id: 'RA-EXP-02', varfor: 'Rätt.' },
        { id: 'RA-EXP-02', varfor: 'Två gånger.' },
      ],
    },
    'Följ [RA-EXP-02] och [RA-FINNS-99].',
  );
  const answer = await createAssistant(chat)('Ett API', artifacts, blocks);
  expect(answer.items).toEqual([{ id: 'RA-EXP-02', why: 'Rätt.' }]);
  expect(answer.summary).toBe('Följ RA-EXP-02 och .');
});

it('answers nothing, and asks the model nothing more, when the question is outside the guide', async () => {
  const { chat, calls } = model({ inom_omradet: false, poster: [] });
  expect(
    await createAssistant(chat)(
      'Hur lagar jag köttfärssås?',
      artifacts,
      blocks,
    ),
  ).toEqual({
    inScope: false,
    summary: '',
    items: [],
    others: [],
    alternatives: [],
    blocks: [],
    basis: [],
  });
  expect(calls).toHaveLength(1);
});

it('says so when the language model cannot be reached', async () => {
  const down = ollamaChat(
    'http://localhost:11434',
    'gemma4:latest',
    (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch,
  );
  await expect(down([{ role: 'user', content: 'Hej' }])).rejects.toMatchObject({
    name: 'ServiceUnavailableError',
    message: expect.stringContaining(
      'Ollama är igång på http://localhost:11434',
    ),
  });
});

it('asks without the thinking setting when the model refuses it', async () => {
  const bodies: any[] = [];
  const chat = ollamaChat('http://ollama', 'gemma3:4b', (async (
    url: string,
    init: RequestInit,
  ) => {
    const body = JSON.parse(String(init.body));
    bodies.push({ url, ...body });
    return 'think' in body
      ? new Response('does not support thinking', { status: 400 })
      : new Response(JSON.stringify({ message: { content: 'Svar' } }));
  }) as unknown as typeof fetch);
  expect(
    await chat([{ role: 'user', content: 'Hej' }], {
      format: { type: 'object' },
    }),
  ).toBe('Svar');
  expect(bodies.map(b => b.think)).toEqual([false, undefined]);
  expect(bodies[1]).toMatchObject({
    url: 'http://ollama/api/chat',
    model: 'gemma3:4b',
    stream: false,
    format: { type: 'object' },
  });
});

it('takes out the posts that the review rejects, but keeps the choice when the review rejects everything', async () => {
  const chosen = {
    inom_omradet: true,
    poster: [
      { id: 'RA-EXP-02', varfor: 'Rätt.' },
      { id: 'RA-INT-03', varfor: 'Ser bara rätt ut.' },
    ],
  };
  const reviewing = (verdicts: object[]): Chat => {
    let call = 0;
    return async (_, options) => {
      call += 1;
      if (!options?.format) return 'Följ RA-EXP-02.';
      return JSON.stringify(call === 1 ? chosen : { poster: verdicts });
    };
  };
  const ids = async (verdicts: object[]) => {
    const answer = await createAssistant(reviewing(verdicts))(
      'Ett API',
      artifacts,
      blocks,
    );
    return [answer.items.map(i => i.id), answer.others.map(i => i.id)];
  };
  // What the review takes out is kept for the reader, apart from what is answered.
  expect(
    await ids([
      { id: 'RA-EXP-02', galler: true },
      { id: 'RA-INT-03', galler: false },
    ]),
  ).toEqual([['RA-EXP-02'], ['RA-INT-03']]);
  expect(
    await ids([
      { id: 'RA-EXP-02', galler: false },
      { id: 'RA-INT-03', galler: false },
    ]),
  ).toEqual([['RA-EXP-02', 'RA-INT-03'], []]);
});
