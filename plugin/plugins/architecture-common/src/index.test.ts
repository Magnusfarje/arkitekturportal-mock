import {
  CatalogEntity,
  Described,
  emptyArtifact,
  flowsThrough,
  fromCatalog,
  fromFile,
  governanceFor,
} from './index';

const artifact = (a: Partial<ReturnType<typeof emptyArtifact>>) => ({
  ...emptyArtifact(),
  ...a,
});
const gateway = 'component:it-miljo/api-gateway-extern';
const artifacts = [
  artifact({
    id: 'RA-EXP-02',
    flows: 'Konsument [internet] -> Extern API-gateway [dmz]: HTTPS',
    relations: [
      { type: 'uses', target: gateway, note: 'kvoter' },
      { type: 'replaces', target: 'RA-EXP-00' },
    ],
  }),
  artifact({
    id: 'RA-EXP-00',
    flows: 'Konsument [internet] -> Ditt API [tjanst]',
    relations: [{ type: 'uses', target: gateway }],
  }),
  artifact({
    id: 'RA-HEM-01',
    relations: [
      { type: 'uses', target: 'component:it-miljo/hemlighetstjanst' },
    ],
  }),
];

it('finds the governance that uses a service, with what the service does there', () => {
  expect(
    governanceFor(gateway, artifacts).map(g => [g.artifact.id, g.role]),
  ).toEqual([['RA-EXP-02', 'kvoter']]);
  expect(governanceFor('component:it-miljo/saknas', artifacts)).toEqual([]);
});

it('finds the patterns whose flows pass a zone, and leaves out a replaced one', () => {
  expect(flowsThrough('dmz', artifacts).map(a => a.id)).toEqual(['RA-EXP-02']);
  expect(flowsThrough('internet', artifacts).map(a => a.id)).toEqual([
    'RA-EXP-02',
  ]);
  expect(flowsThrough('tjanst', artifacts)).toEqual([]);
});

const described: Described = {
  note: 'Två egna datahallar.',
  stages: [],
  terms: [],
  platforms: {
    intro: '',
    sections: [
      {
        id: '7.8',
        title: 'Integrationsplattformen',
        text: 'Så fungerar den.',
        blocks: ['api-gateway-extern', 'saknas'],
      },
    ],
  },
};
const entity = (
  kind: string,
  name: string,
  annotations: Record<string, string>,
  spec: Record<string, unknown> = {},
  namespace = 'it-miljo',
): CatalogEntity => ({
  kind,
  metadata: {
    name,
    namespace,
    title: `Titel ${name}`,
    description: `Om ${name}.`,
    annotations: Object.fromEntries(
      Object.entries(annotations).map(([key, value]) => [
        `architecture.portal/${key}`,
        value,
      ]),
    ),
  },
  spec,
});
const resource = (
  type: string,
  name: string,
  annotations: Record<string, string>,
  namespace?: string,
) =>
  entity(
    'Resource',
    name,
    annotations,
    { type, owner: 'group:default/team-nat' },
    namespace,
  );
// The organisation's systems stand in default; the environment's own services in it-miljo.
const component = (
  name: string,
  annotations: Record<string, string>,
  dependsOn: string[] = [],
  namespace = 'default',
) =>
  entity(
    'Component',
    name,
    annotations,
    { type: 'service', owner: 'group:default/team-nat', dependsOn },
    namespace,
  );
const catalog = [
  entity('Group', 'team-nat', {}, { type: 'team' }, 'default'),
  resource('site', 'dh1', { 'site-type': 'datahall' }),
  // The order the catalog is asked to keep, not the order of the names.
  resource('network-zone', 'tjanst', {
    domain: 'Verksamhets-IT',
    'accepts-from': 'dmz',
    order: '2',
  }),
  resource('network-zone', 'dmz', {
    domain: 'Exponering',
    'accepts-from': 'internet, tjanst',
    order: '1',
  }),
  resource('network-segment', 'dmz-api', {
    zone: 'dmz',
    stages: 'prod, test',
    sites: 'dh1',
  }),
  resource('network-segment', 'tjanst-container', { zone: 'tjanst' }),
  resource('external-service', 'sgsi', {
    zone: 'dmz',
    through: 'component:it-miljo/api-gateway-extern, dmz-api',
    connection: 'Fast förbindelse',
  }),
  component(
    'api-gateway-extern',
    { segment: 'dmz-api', category: 'building-block', interfaces: 'HTTPS' },
    [],
    'it-miljo',
  ),
  component('felanmalan', { segment: 'tjanst-container' }, [
    'resource:it-miljo/tjanst-container',
    'component:it-miljo/api-gateway-extern',
    'felanmalan-db',
  ]),
  // A database is not drawn, and a component without a segment is not placed.
  resource('database', 'felanmalan-db', { segment: 'dmz-api' }, 'default'),
  component('example-website', {}),
];

it('draws the environment from the catalog: a component needs only to say its segment', () => {
  const environment = fromCatalog(catalog, described);
  expect(environment.zones.map(z => z.id)).toEqual(['dmz', 'tjanst']);
  expect(environment.zones[1]).toEqual({
    id: 'tjanst',
    ref: 'resource:it-miljo/tjanst',
    name: 'Titel tjanst',
    domain: 'Verksamhets-IT',
    description: 'Om tjanst.',
    acceptsFrom: ['dmz'],
  });
  expect(environment.segments[0]).toMatchObject({
    id: 'dmz-api',
    zone: 'dmz',
    stages: ['prod', 'test'],
    sites: ['dh1'],
  });
  expect(environment.sites[0]).toMatchObject({
    id: 'dh1',
    type: 'datahall',
    owner: 'Titel team-nat',
  });
  // A system is known by its reference, takes its zone from its segment, and is a business system unless it says otherwise.
  expect(environment.blocks).toEqual([
    {
      id: 'component:it-miljo/api-gateway-extern',
      ref: 'component:it-miljo/api-gateway-extern',
      name: 'Titel api-gateway-extern',
      zone: 'dmz',
      segment: 'dmz-api',
      owner: 'Titel team-nat',
      purpose: 'Om api-gateway-extern.',
      interfaces: 'HTTPS',
      category: 'building-block',
      uses: [],
    },
    expect.objectContaining({
      id: 'component:default/felanmalan',
      zone: 'tjanst',
      category: 'business-system',
      // Of what it depends on, the services and systems on the map.
      uses: ['component:it-miljo/api-gateway-extern'],
    }),
  ]);
  expect(environment.externals[0]).toMatchObject({
    id: 'sgsi',
    ref: 'resource:it-miljo/sgsi',
    purpose: 'Om sgsi.',
    connection: 'Fast förbindelse',
    through: ['component:it-miljo/api-gateway-extern', 'dmz-api'],
  });
  expect(environment.platforms.sections[0].blocks).toEqual([
    'component:it-miljo/api-gateway-extern',
  ]);
  expect(environment.unplaced).toEqual([
    { ref: 'component:default/example-website', name: 'Titel example-website' },
  ]);
  expect(environment.note).toBe('Två egna datahallar.');
  expect(environment.problems).toEqual([
    'Titel dmz (resource:it-miljo/dmz): tar emot från zonen internet, som inte finns i katalogen.',
    'Avsnittet Integrationsplattformen beskriver component:it-miljo/saknas, som inte finns på kartan.',
  ]);
});

it('leaves out what does not hold together, and says why', () => {
  const environment = fromCatalog(
    [
      ...catalog,
      resource('network-zone', 'ot', {}),
      resource('network-segment', 'ot-styr', { zone: 'okand' }),
      resource('network-segment', 'ot-lager', { zone: 'tjanst', sites: 'dh9' }),
      resource('network-segment', 'utan-zon', {}),
      resource('external-service', 'partner', {
        zone: 'dmz',
        through: 'okand-tjanst',
      }),
      // The same name in another namespace: the page could not tell the two apart.
      resource('network-zone', 'dmz', { domain: 'Exponering' }, 'default'),
      component('ställverk', { segment: 'ot-styr' }),
      component('rapport', { segment: 'dmz-api', category: 'rapporter' }),
    ],
    described,
  );
  expect(environment.zones.map(z => [z.id, z.ref, z.domain])).toEqual([
    ['dmz', 'resource:it-miljo/dmz', 'Exponering'],
    ['tjanst', 'resource:it-miljo/tjanst', 'Verksamhets-IT'],
    ['ot', 'resource:it-miljo/ot', 'Utan domän'],
  ]);
  expect(environment.segments.map(s => [s.id, s.sites])).toEqual([
    ['dmz-api', ['dh1']],
    ['ot-lager', []],
    ['tjanst-container', []],
  ]);
  expect(environment.blocks.map(b => [b.id, b.category])).toEqual([
    ['component:it-miljo/api-gateway-extern', 'building-block'],
    ['component:default/felanmalan', 'business-system'],
    ['component:default/rapport', 'business-system'],
  ]);
  expect(environment.externals.map(e => [e.id, e.through])).toEqual([
    ['partner', []],
    ['sgsi', ['component:it-miljo/api-gateway-extern', 'dmz-api']],
  ]);
  // A component that names a segment is a problem to solve, not one that is yet to be placed.
  expect(environment.unplaced).toHaveLength(1);
  expect(environment.problems).toEqual(
    expect.arrayContaining([
      'Titel dmz (resource:default/dmz): namnet används redan av resource:it-miljo/dmz.',
      'Titel ot (resource:it-miljo/ot): saknar domän (architecture.portal/domain).',
      'Titel ot-styr (resource:it-miljo/ot-styr): zonen okand finns inte i katalogen.',
      'Titel utan-zon (resource:it-miljo/utan-zon): säger inte vilken zon (architecture.portal/zone).',
      'Titel ot-lager (resource:it-miljo/ot-lager): platsen dh9 finns inte i katalogen.',
      'Titel ställverk (component:default/ställverk): segmentet ot-styr finns inte i katalogen.',
      'Titel rapport (component:default/rapport): kategorin rapporter finns inte. Välj building-block, infrastructure, shared-service, business-system.',
      'Titel partner (resource:it-miljo/partner): ansluts genom component:it-miljo/okand-tjanst, som inte finns på kartan.',
    ]),
  );
  expect(environment.problems).toHaveLength(10);
});

const principleFile = {
  id: 'AP-TEST-01',
  kind: 'architecture-principle',
  title: 'Principen',
  source: 'dokument/Test.md#AP-TEST-01',
  statement: 'Principen.',
  rationale: 'Varför.',
  scope: 'Allt.',
  consequences: 'Det innebär.',
};

describe('the files of the content repository', () => {
  it('composes a rule file into the registry shape, with the labelled parts in order', () => {
    const rule = fromFile({
      id: 'TP-TEST-01',
      kind: 'technical-principle',
      title: 'Testregel',
      binding: 'binding',
      topic: 'Test',
      source: 'dokument/Test.md#TP-TEST-01',
      statement: 'Regeln.',
      rationale: 'Varför.',
      scope: 'Nya system.',
      consequences: 'Det innebär.',
      preconditions: '- En förutsättning',
      sections: [{ title: 'Begrepp', text: 'Ett begrepp.' }],
      notCovered: 'Inte detta.',
      howTo: '1. Gör så.',
      concretizes: ['AP-SÄK-02'],
      motivatedBy: ['TP-ANNAN-01'],
      replaces: ['TP-GAMMAL-01'],
      externalReferences: ['ISO 27001', 'MSBFS 2020:7'],
      requirements: [
        {
          id: 'TP-TEST-01-K01',
          title: 'Kravet',
          statement: 'Ska.',
          scope: 'Alltid.',
          criteria: 'Så här.',
          notEnough: 'Inte så.',
          limits: 'Bara detta.',
          method: 'manual',
        },
      ],
    });
    expect(rule.consequences).toBe(
      'Det innebär.\n\nMöjliga förutsättningar:\n- En förutsättning\n\nBegrepp: Ett begrepp.\n\nTäcks inte av regler ännu: Inte detta.\n\nSå följer du regeln: 1. Gör så.',
    );
    expect(rule.relations).toEqual([
      { type: 'concretizes', target: 'AP-SÄK-02' },
      { type: 'replaces', target: 'TP-GAMMAL-01' },
      { type: 'motivated-by', target: 'TP-ANNAN-01' },
    ]);
    expect(rule.externalReferences).toBe('ISO 27001\nMSBFS 2020:7');
    expect(rule.requirements[0].criteria).toBe(
      'Så här.\n\nRäcker inte: Inte så.\n\nAvgränsning: Bara detta.',
    );
    expect(rule.requirements[0].method).toBe('manual');
    expect(rule.owner).toBe('');
  });
  it('composes a pattern and a guide, with their own names for the fields and the bindings their kinds have', () => {
    const pattern = fromFile({
      id: 'RA-TEST-01',
      kind: 'reference-architecture',
      title: 'Mönstret',
      source: 'dokument/Test.md#RA-TEST-01',
      solution: 'Lösningen.',
      fits: 'När.',
      responsibilities: 'Du ansvarar.',
      variants: '- En variant',
      flows: [
        {
          from: { name: 'Konsument', zone: 'internet' },
          to: { name: 'Gateway', zone: 'dmz' },
          label: 'HTTPS',
        },
        {
          from: { name: 'Gateway', zone: 'dmz' },
          to: { name: 'API', zone: 'tjanst' },
        },
      ],
      uses: [
        { target: 'component:it-miljo/api-gateway-extern', role: 'kvoter' },
      ],
      motivatedBy: ['TP-EXP-01'],
    });
    expect(pattern.binding).toBe('recommended');
    expect(pattern.flows).toBe(
      'Konsument [internet] -> Gateway [dmz]: HTTPS\nGateway [dmz] -> API [tjanst]',
    );
    expect(pattern.consequences).toBe(
      'Du ansvarar.\n\nVarianter:\n- En variant',
    );
    expect(pattern.relations).toEqual([
      {
        type: 'uses',
        target: 'component:it-miljo/api-gateway-extern',
        note: 'kvoter',
      },
      { type: 'motivated-by', target: 'TP-EXP-01' },
    ]);
    const guide = fromFile({
      id: 'VL-TEST-01',
      kind: 'guide',
      title: 'Hur?',
      source: 'dokument/Test.md#VL-TEST-01',
      answer: 'Så.',
      before: '- Vad?',
      scope: 'Alla.',
      steps: '1. Först.',
      leadsTo: [{ target: 'RA-TEST-01', when: 'När det passar.' }],
      motivatedBy: ['TP-EXP-01'],
    });
    expect(guide.binding).toBe('guidance');
    expect(guide.statement).toBe('Så.');
    expect(guide.rationale).toBe('- Vad?');
    expect(guide.relations[0]).toEqual({
      type: 'leads-to',
      target: 'RA-TEST-01',
      note: 'När det passar.',
    });
    expect(fromFile({ ...principleFile }).binding).toBe('binding');
  });
  it('refuses a file with a key the definition does not have, or a kind without its fields', () => {
    expect(() => fromFile({ ...principleFile, status: 'decided' })).toThrow();
    expect(() => fromFile({ ...principleFile, version: 2 })).toThrow();
    expect(() => fromFile({ ...principleFile, kind: 'guide' })).toThrow();
    expect(() =>
      fromFile({ ...principleFile, owner: 'component:default/x' }),
    ).toThrow();
  });
});
