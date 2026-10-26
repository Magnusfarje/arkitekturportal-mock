import '@testing-library/jest-dom';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GuidePage } from './Guide';
import {
  ArtifactView,
  emptyArtifact,
  Environment,
} from '@myndigheten/backstage-plugin-architecture-common';

const request = jest.fn();
jest.mock('./api', () => ({ useRequest: () => request }));
jest.mock('@backstage/core-components', () => ({
  Page: ({ children }: any) => <div>{children}</div>,
  Content: ({ children }: any) => <main>{children}</main>,
  Header: ({ title }: any) => <h1>{title}</h1>,
  MarkdownContent: ({ content }: any) => <pre>{content}</pre>,
}));
const artifact = (a: Partial<ArtifactView>): ArtifactView => ({
  ...emptyArtifact(),
  scope: 'Lösningar',
  source: 'internal:test',
  completionNeeds: [],
  ...a,
});
// The package of the guide, whose patterns use the environment.
const reference = {
  provenance: { path: 'styrning/x.yaml', etag: 'x' },
};
const items = [
  artifact({
    ...reference,
    id: 'VL-EXP-01',
    kind: 'guide',
    binding: 'guidance',
    topic: 'Exponering',
    title: 'Hur publicerar jag ett API mot internet?',
    statement: 'Genom exponeringsplattformen.',
    rationale: '- Får informationen publiceras?',
    consequences:
      '1. Beskriv API:et.\n2. Beställ publicering enligt RA-EXP-02.',
    relations: [
      {
        type: 'leads-to',
        target: 'RA-EXP-02',
        note: 'API:et finns i verksamhets-IT.',
      },
    ],
  }),
  artifact({
    ...reference,
    id: 'RA-EXP-02',
    kind: 'reference-architecture',
    binding: 'recommended',
    topic: 'Exponering',
    title: 'API mot internet',
    statement: 'API:et publiceras genom gatewayen.',
    consequences: '- Beskriv API:et med OpenAPI.',
    flows:
      'Konsument [internet] -> Extern API-gateway [dmz]: HTTPS\nExtern API-gateway [dmz] -> Ditt API [tjanst]: mTLS',
    relations: [
      {
        type: 'uses',
        target: 'component:default/api-gateway-extern',
        note: 'kvoter',
      },
      { type: 'motivated-by', target: 'TP-EXP-01' },
    ],
  }),
  artifact({
    ...reference,
    id: 'TP-EXP-01',
    kind: 'technical-principle',
    binding: 'binding',
    topic: 'Exponering',
    title: 'Allt publiceras genom exponeringsplattformen',
    statement: 'En gemensam väg in.',
  }),
  artifact({
    id: 'VL-BEH-01',
    kind: 'guide',
    binding: 'guidance',
    topic: 'Identitet och åtkomst',
    title: 'Hur testar jag behörigheterna i applikationen?',
    statement: 'Beskriv behörigheterna i en matris.',
    rationale: '- Vilka roller finns?',
    consequences: '1. Skapa testidentiteter.',
    relations: [{ type: 'motivated-by', target: 'TP-BEH-01' }],
  }),
  artifact({
    id: 'TP-BEH-01',
    kind: 'technical-principle',
    binding: 'binding',
    title: 'Servern avgör vad användaren får göra',
    statement: 'Behörighet prövas på servern.',
  }),
  artifact({
    id: 'TP-DRI-13',
    kind: 'technical-principle',
    binding: 'binding',
    topic: 'Drift och återställning',
    title: 'Systemet går att se i drift',
    statement: 'Ett system i drift går att förstå utifrån.',
    consequences:
      'Möjliga lösningar: skicka loggarna skyddat (TP-SÄK-10).\n\nOm ni inte når dit: inget system är undantaget.',
  }),
  artifact({
    id: 'TP-SÄK-10',
    kind: 'technical-principle',
    binding: 'binding',
    topic: 'Säkerhet',
    title: 'Information är skyddad under överföring',
    statement: 'Information går inte att läsa på vägen.',
  }),
  artifact({
    id: 'TP-ÅTE-01',
    kind: 'technical-principle',
    binding: 'binding',
    topic: 'Drift och återställning',
    title: 'Återställning är testad, inte antagen',
    statement: 'Återställningen ska vara testad.',
  }),
  artifact({
    id: 'TP-DRI-14',
    kind: 'technical-principle',
    binding: 'binding',
    topic: 'Drift och återställning',
    title: 'Systemet går att återställa',
    statement: 'Återställningen är prövad.',
    relations: [{ type: 'replaces', target: 'TP-ÅTE-01' }],
  }),
];
const environment: Environment = {
  note: 'Två egna datahallar.',
  sites: [
    {
      id: 'dh1',
      ref: 'resource:it-miljo/dh1',
      name: 'Datahall 1',
      type: 'datahall',
      owner: 'Datahall och infrastruktur',
      description: 'Produktion.',
    },
  ],
  stages: [
    {
      id: 'prod',
      name: 'Produktion',
      purpose: 'Verksamheten.',
      data: 'Verklig information.',
      sites: ['dh1'],
    },
  ],
  segments: [
    {
      id: 'dmz-api',
      ref: 'resource:it-miljo/dmz-api',
      name: 'API och meddelanden',
      zone: 'dmz',
      stages: ['prod'],
      sites: ['dh1'],
      description: 'Extern API-gateway.',
    },
  ],
  externals: [
    {
      id: 'sgsi',
      ref: 'resource:it-miljo/sgsi',
      name: 'Det myndighetsgemensamma nätet',
      zone: 'partner',
      through: ['api-gateway-extern'],
      purpose: 'Utbyte med andra myndigheter.',
      connection: 'Fast förbindelse',
      owner: 'Integration',
    },
  ],
  zones: [
    {
      id: 'internet',
      ref: 'resource:it-miljo/internet',
      name: 'Internet',
      domain: 'Extern',
      description: 'Obetrott',
      acceptsFrom: [],
    },
    {
      id: 'dmz',
      ref: 'resource:it-miljo/dmz',
      name: 'Exponeringszon',
      domain: 'Exponering',
      description: 'Väg in',
      acceptsFrom: ['internet'],
    },
    {
      id: 'tjanst',
      ref: 'resource:it-miljo/tjanst',
      name: 'Tjänstezon',
      domain: 'Verksamhets-IT',
      description: 'Tjänster',
      acceptsFrom: ['dmz'],
    },
  ],
  blocks: [
    {
      id: 'api-gateway-extern',
      ref: 'component:default/api-gateway-extern',
      name: 'Extern API-gateway',
      zone: 'dmz',
      segment: 'dmz-api',
      owner: 'Integration',
      purpose: 'API:er till internet.',
      interfaces: 'HTTPS',
      category: 'building-block',
    },
    {
      id: 'felanmalan',
      ref: 'component:default/felanmalan',
      name: 'Felanmälan',
      zone: 'tjanst',
      segment: 'tjanst-container',
      owner: 'Förvaltning anläggning och underhåll',
      purpose: 'Tar emot anmälningar om fel.',
      interfaces: '',
      category: 'business-system',
    },
  ],
  terms: [{ term: 'Zon', meaning: 'En del av nätet.' }],
  platforms: { intro: '', sections: [] },
  problems: [],
  unplaced: [],
};
const answer = async (path: string) => {
  if (path === '/environment') return environment;
  if (path === '/access') return { actor: 'user:default/reader' };
  return { items };
};
beforeEach(() => {
  request.mockReset();
  request.mockImplementation(answer);
});
const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <GuidePage />
    </MemoryRouter>,
  );

it('starts from the questions and says that the content is a proposal', async () => {
  open('/arkitekturguide');
  expect(
    await screen.findByRole('link', {
      name: 'Hur publicerar jag ett API mot internet?',
    }),
  ).toHaveAttribute('href', '/arkitekturguide?id=VL-EXP-01');
  expect(
    screen.getByText(/är förslag, inte beslutad\s+styrning/),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'API mot internet' })).toBeVisible();
  fireEvent.change(screen.getByLabelText(/^Sök/), {
    target: { value: 'hemlighet' },
  });
  expect(
    screen.getByText('Inga vägledningar matchar sökningen.'),
  ).toBeInTheDocument();
});

it('leads from a guide to its pattern and shows the rules behind both', async () => {
  open('/arkitekturguide?id=VL-EXP-01');
  const choices = within(await screen.findByRole('table'));
  expect(
    choices.getByText('API:et finns i verksamhets-IT.'),
  ).toBeInTheDocument();
  expect(
    choices.getByRole('link', { name: 'API mot internet' }),
  ).toHaveAttribute('href', '/arkitekturguide?id=RA-EXP-02');
  expect(
    screen.getByText('Förslag – inte beslutad styrning'),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Beställ publicering enligt', { exact: false }),
  ).toContainElement(screen.getByRole('link', { name: 'RA-EXP-02' }));
  expect(
    screen.getByRole('link', {
      name: 'Allt publiceras genom exponeringsplattformen',
    }),
  ).toBeInTheDocument();
});

it('answers how a rule is followed without choices, and shows the rule it builds on', async () => {
  open('/arkitekturguide?id=VL-BEH-01');
  expect(
    await screen.findByText('Regler och krav som gäller'),
  ).toBeInTheDocument();
  expect(screen.getByText('Vägledning')).toBeInTheDocument();
  expect(screen.getByText('Innan du börjar')).toBeInTheDocument();
  expect(screen.queryByText('Vägval')).not.toBeInTheDocument();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Servern avgör vad användaren får göra' }),
  ).toHaveAttribute('href', '/arkitekturguide?id=TP-BEH-01');
});

it('lists the rules by topic and reads a post with what applies when the outcome is not reached', async () => {
  open('/arkitekturguide');
  const rule = await screen.findByRole('link', {
    name: 'Systemet går att se i drift',
  });
  expect(rule).toHaveAttribute('href', '/arkitekturguide?id=TP-DRI-13');
  expect(screen.getByText('Regler')).toBeInTheDocument();
  expect(screen.getByText('Drift och återställning')).toBeInTheDocument();
  fireEvent.click(rule);
  expect(
    await screen.findByText('Om ni inte når dit: inget system är undantaget.'),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'TP-SÄK-10' })).toHaveAttribute(
    'href',
    `/arkitekturguide?id=${encodeURIComponent('TP-SÄK-10')}`,
  );
});

it('does not offer a replaced rule, but says what replaced it when it is read', async () => {
  open('/arkitekturguide');
  expect(
    await screen.findByRole('link', { name: 'Systemet går att återställa' }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('link', {
      name: 'Återställning är testad, inte antagen',
    }),
  ).not.toBeInTheDocument();
  cleanup();
  open('/arkitekturguide?id=TP-ÅTE-01');
  expect(await screen.findByText('Ersatt av', { exact: false })).toBeVisible();
  expect(
    screen.getByRole('link', {
      name: 'TP-DRI-14 – Systemet går att återställa',
    }),
  ).toHaveAttribute('href', '/arkitekturguide?id=TP-DRI-14');
});

it('shows a pattern as a flow across zones with the building blocks and who to order from', async () => {
  open('/arkitekturguide?id=RA-EXP-02');
  expect(
    await screen.findByRole('img', { name: 'Flöde för API mot internet' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText('Konsument → Extern API-gateway: HTTPS'),
  ).toBeInTheDocument();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByText('Beställs hos: Integration')).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'Extern API-gateway' }),
  ).toHaveAttribute('href', '/catalog/default/component/api-gateway-extern');
  expect(
    screen.getByRole('link', {
      name: 'Hur publicerar jag ett API mot internet?',
    }),
  ).toBeInTheDocument();
});

it('warns when a flow opens a connection the zone model does not allow', async () => {
  request.mockImplementation(async (path: string) =>
    path === '/environment'
      ? environment
      : {
          items: [
            {
              ...items[1],
              flows: 'Konsument [internet] -> Ditt API [tjanst]: HTTPS',
            },
          ],
        },
  );
  open('/arkitekturguide?id=RA-EXP-02');
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Tjänstezon tar inte emot anslutningar från Internet',
  );
});

it('leads to the environment, from the overview and from a building block of a pattern', async () => {
  const { unmount } = open('/arkitekturguide');
  expect(
    await screen.findByRole('link', { name: 'Visa IT-miljön' }),
  ).toHaveAttribute('href', '/it-miljo');
  unmount();
  open('/arkitekturguide?id=RA-EXP-02');
  expect(
    await screen.findByRole('link', { name: 'Visa i IT-miljön' }),
  ).toHaveAttribute('href', '/it-miljo?id=api-gateway-extern');
  expect(
    screen.getByRole('link', { name: 'Visa flödet i IT-miljön' }),
  ).toHaveAttribute('href', '/it-miljo?flode=RA-EXP-02');
});

it('offers the assistant only when a language model is configured', async () => {
  open('/arkitekturguide');
  await screen.findByLabelText(/^Sök/);
  expect(
    screen.queryByRole('button', { name: /^Odin/ }),
  ).not.toBeInTheDocument();
});

it('answers a question with the governance that applies, read from the registry', async () => {
  const asked: unknown[] = [];
  request.mockImplementation(async (path: string, init?: RequestInit) => {
    if (path === '/access')
      return { actor: 'user:default/reader', canAsk: true };
    if (path === '/assistant') {
      asked.push(JSON.parse(String(init?.body)));
      return {
        inScope: true,
        summary: 'Publicera API:et enligt RA-EXP-02.',
        items: [{ id: 'VL-EXP-01', why: 'Frågan gäller ett API utåt.' }],
        others: [{ id: 'TP-DRI-13', why: 'Tjänsten ska gå att se i drift.' }],
        alternatives: [
          {
            id: 'RA-EXP-02',
            from: 'VL-EXP-01',
            when: 'API:et finns i verksamhets-IT.',
          },
        ],
        blocks: ['component:default/api-gateway-extern'],
        basis: ['TP-EXP-01'],
      };
    }
    return answer(path);
  });
  open('/arkitekturguide');
  // The assistant is folded until the reader opens it.
  const fold = await screen.findByRole('button', { name: /^Odin/ });
  expect(fold).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByLabelText('Din fråga')).not.toBeInTheDocument();
  fireEvent.click(fold);
  expect(fold).toHaveAttribute('aria-expanded', 'true');
  const ask = screen.getByRole('button', { name: 'Fråga' });
  expect(ask).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Din fråga'), {
    target: { value: 'Jag ska publicera ett API mot internet.' },
  });
  fireEvent.click(ask);
  const reply = within((await screen.findByText('Du frågade')).parentElement!);
  expect(asked).toEqual([
    { question: 'Jag ska publicera ett API mot internet.' },
  ]);
  // The summary links to the pattern, and says that a language model wrote it.
  expect(
    reply.getByText('Publicera API:et enligt', { exact: false }),
  ).toContainElement(reply.getAllByRole('link', { name: 'RA-EXP-02' })[0]);
  expect(reply.getByText(/skrivet av en språkmodell/)).toBeInTheDocument();
  // The chosen guide with the model's reason, the pattern it leads to, the building block and what binds.
  expect(reply.getByText('Frågan gäller ett API utåt.')).toBeInTheDocument();
  expect(
    reply.getByRole('link', {
      name: 'Hur publicerar jag ett API mot internet?',
    }),
  ).toHaveAttribute('href', '/arkitekturguide?id=VL-EXP-01');
  expect(reply.getByRole('link', { name: 'API mot internet' })).toHaveAttribute(
    'href',
    '/arkitekturguide?id=RA-EXP-02',
  );
  expect(reply.getByText('Beställs hos: Integration')).toBeInTheDocument();
  // What the model took out when it read the posts is still offered.
  expect(reply.getByText('Kan också gälla')).toBeInTheDocument();
  expect(
    reply.getByRole('link', { name: 'Systemet går att se i drift' }),
  ).toHaveAttribute('href', '/arkitekturguide?id=TP-DRI-13');
  expect(
    reply.getByRole('link', {
      name: 'Allt publiceras genom exponeringsplattformen',
    }),
  ).toHaveAttribute('href', '/arkitekturguide?id=TP-EXP-01');
});

it('says so when the question is not about building something, and when the model cannot be reached', async () => {
  let fail = false;
  request.mockImplementation(async (path: string) => {
    if (path === '/access')
      return { actor: 'user:default/reader', canAsk: true };
    if (path === '/assistant') {
      if (fail) throw new Error('Språkmodellen svarar inte.');
      return {
        inScope: false,
        summary: '',
        items: [],
        others: [],
        alternatives: [],
        blocks: [],
        basis: [],
      };
    }
    return answer(path);
  });
  open('/arkitekturguide');
  const fold = await screen.findByRole('button', { name: /^Odin/ });
  fireEvent.click(fold);
  const ask = screen.getByRole('button', { name: 'Fråga' });
  fireEvent.change(screen.getByLabelText('Din fråga'), {
    target: { value: 'Hur lagar jag köttfärssås?' },
  });
  fireEvent.click(ask);
  expect(
    await screen.findByText(/verkar inte handla om att bygga eller ändra/),
  ).toBeInTheDocument();
  fail = true;
  fireEvent.change(screen.getByLabelText('Din fråga'), {
    target: { value: 'En fråga till' },
  });
  fireEvent.click(ask);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Språkmodellen svarar inte.',
  );
  // Folding it away and opening it again keeps what was asked and answered.
  fireEvent.click(fold);
  expect(
    screen.queryByText(/verkar inte handla om att bygga eller ändra/),
  ).not.toBeInTheDocument();
  fireEvent.click(fold);
  expect(
    screen.getByText(/verkar inte handla om att bygga eller ändra/),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Din fråga')).toHaveValue('En fråga till');
});
