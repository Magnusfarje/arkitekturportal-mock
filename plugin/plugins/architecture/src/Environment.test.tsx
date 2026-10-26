import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { EnvironmentPage } from './Environment';
import {
  ArtifactView,
  BuildingBlock,
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
const gateway = {
  type: 'uses' as const,
  target: 'component:default/api-gateway-extern',
};
const items = [
  artifact({
    id: 'RA-EXP-02',
    kind: 'reference-architecture',
    binding: 'recommended',
    title: 'API mot internet',
    statement: 'API:et publiceras genom gatewayen.',
    flows:
      'Konsument [internet] -> Extern API-gateway [dmz]: HTTPS\nExtern API-gateway [dmz] -> Ditt API [tjanst]: mTLS',
    relations: [
      { ...gateway, note: 'kvoter' },
      { type: 'replaces', target: 'RA-EXP-00' },
    ],
  }),
  artifact({
    id: 'RA-EXP-00',
    kind: 'reference-architecture',
    binding: 'recommended',
    title: 'API mot internet, äldre',
    statement: 'Ersatt.',
    relations: [gateway],
  }),
  artifact({
    id: 'TP-MIL-01',
    kind: 'technical-principle',
    binding: 'binding',
    title: 'Drift sker i egna datahallar',
    statement: 'Inga publika molntjänster.',
  }),
];
const at = (id: string) => `resource:it-miljo/${id}`;
const site = (id: string, name: string) => ({
  id,
  ref: at(id),
  name,
  type: 'datahall',
  owner: 'Datahall och infrastruktur',
  description: 'Produktion.',
});
const zone = (
  id: string,
  name: string,
  domain: string,
  acceptsFrom: string[],
) => ({
  id,
  ref: at(id),
  name,
  domain,
  description: `Om ${name}.`,
  acceptsFrom,
});
const segment = (id: string, name: string, zoneId: string) => ({
  id,
  ref: at(id),
  name,
  zone: zoneId,
  stages: ['prod'],
  sites: ['dh1', 'dh2'],
  description: `Nätet ${id}.`,
});
const block = (
  id: string,
  name: string,
  segmentId: string,
  category: BuildingBlock['category'],
  uses?: string[],
): BuildingBlock => ({
  id,
  ref: `component:default/${id}`,
  name,
  zone: segmentId.split('-')[0],
  segment: segmentId,
  owner: 'Drift och leverans',
  purpose: `Syftet med ${name}.`,
  interfaces: 'HTTPS',
  category,
  uses,
});
const environment: Environment = {
  note: 'Två egna datahallar.',
  sites: [site('dh1', 'Datahall 1'), site('dh2', 'Datahall 2')],
  stages: [
    {
      id: 'prod',
      name: 'Produktion',
      purpose: 'Verksamheten.',
      data: 'Verklig information.',
      sites: ['dh1', 'dh2'],
    },
  ],
  zones: [
    zone('internet', 'Internet', 'Extern', ['dmz']),
    zone('dmz', 'Exponeringszon', 'Exponering', ['internet', 'tjanst']),
    zone('tjanst', 'Tjänstezon', 'Verksamhets-IT', ['dmz']),
    zone('plattform', 'Plattformszon', 'Gemensam infrastruktur', ['tjanst']),
  ],
  segments: [
    segment('dmz-api', 'API och meddelanden', 'dmz'),
    segment('tjanst-container', 'Containerplattform', 'tjanst'),
    segment('tjanst-lb', 'Lastbalansering', 'tjanst'),
    segment('plattform-identitet', 'Identitet', 'plattform'),
  ],
  blocks: [
    block(
      'api-gateway-extern',
      'Extern API-gateway',
      'dmz-api',
      'building-block',
    ),
    block(
      'containerplattform',
      'Containerplattform',
      'tjanst-container',
      'building-block',
    ),
    block('lastbalansering', 'Lastbalansering', 'tjanst-lb', 'building-block'),
    block('intranat', 'Intranät', 'tjanst-container', 'shared-service'),
    block('felanmalan', 'Felanmälan', 'tjanst-container', 'business-system', [
      'containerplattform',
      'inloggningstjanst',
    ]),
    block(
      'inloggningstjanst',
      'Inloggningstjänst',
      'plattform-identitet',
      'building-block',
    ),
  ],
  externals: [
    {
      id: 'sgsi',
      ref: at('sgsi'),
      name: 'Det myndighetsgemensamma nätet',
      zone: 'internet',
      through: ['api-gateway-extern'],
      purpose: 'Utbyte med andra myndigheter.',
      connection: 'Fast förbindelse',
      owner: 'Integration',
    },
  ],
  terms: [{ term: 'Zon', meaning: 'En del av nätet.' }],
  platforms: {
    intro: 'En lösning körs på containerplattformen, enligt TP-MIL-01.',
    sections: [
      {
        id: '7.1',
        title: 'Containerplattformen',
        text: 'Containerplattformen är Kubernetes. Publicering enligt RA-EXP-02 och TP-FINNS-01.',
        blocks: ['containerplattform'],
      },
      {
        id: '7.4',
        title: 'När en datahall faller',
        text: 'Varje datahall bär ensam produktionen.',
        blocks: [],
      },
    ],
  },
  problems: [],
  unplaced: [],
};
beforeEach(() => {
  request.mockReset();
  request.mockImplementation(async (path: string) => {
    if (path === '/environment') return environment;
    return { items };
  });
});
const open = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <EnvironmentPage />
    </MemoryRouter>,
  );
const map = () =>
  within(screen.getByRole('group', { name: 'Karta över IT-miljön' }));
const chosen = (name: string) => within(screen.getByRole('region', { name }));

it('gives the shape of the environment at a glance: domains, zones and how much stands in each', async () => {
  open('/it-miljo');
  expect(
    await screen.findByRole('group', { name: 'Domän: Verksamhets-IT' }),
  ).toBeInTheDocument();
  expect(screen.getByText('Två egna datahallar.')).toBeInTheDocument();
  expect(
    screen.getByText(
      '2 datahallar · 1 miljöer · 4 zoner i 4 domäner · 6 tjänster och system',
    ),
  ).toBeInTheDocument();
  // How a solution runs is told first, with the rule behind it one step away.
  expect(
    screen.getByText(
      'En lösning körs på containerplattformen, enligt [TP-MIL-01](/arkitekturguide?id=TP-MIL-01).',
    ),
  ).toBeInTheDocument();
  // A zone is a tile on the map that says how much it holds. Its services are not shown until it is opened.
  const tile = map().getByRole('link', { name: 'Tjänstezon' });
  expect(tile).toHaveAttribute('href', '/it-miljo?id=tjanst');
  expect(within(tile).getByText('4 tjänster')).toBeInTheDocument();
  expect(
    within(map().getByRole('link', { name: 'Internet' })).getByText(
      '1 extern anslutning',
    ),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole('link', { name: 'Intranät' }),
  ).not.toBeInTheDocument();
  expect(
    screen.getByText('Peka på en zon för att se vad som får ansluta till den.'),
  ).toBeInTheDocument();
  // Pointing at a zone draws what may connect to it.
  fireEvent.mouseEnter(map().getByRole('link', { name: 'Exponeringszon' }));
  expect(
    screen.getByText(/^Heldragna pilar får ansluta till Exponeringszon\./),
  ).toBeInTheDocument();
  fireEvent.mouseLeave(map().getByRole('link', { name: 'Exponeringszon' }));
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  expect(screen.queryByText(/MSB|fiktiv/i)).not.toBeInTheDocument();
});

it('opens a zone to its segments and services, and says which zones connect to it', async () => {
  open('/it-miljo?id=tjanst');
  const container = within(
    await screen.findByRole('group', { name: 'Segment: Containerplattform' }),
  );
  expect(container.getByRole('link', { name: 'Intranät' })).toHaveAttribute(
    'href',
    '/it-miljo?id=intranat',
  );
  expect(
    container.queryByRole('link', { name: 'Lastbalansering' }),
  ).not.toBeInTheDocument();
  expect(map().getByRole('link', { name: 'Tjänstezon' })).toHaveAttribute(
    'aria-current',
    'true',
  );
  expect(
    screen.getByText(
      'Heldragna pilar får ansluta till Tjänstezon. Streckade pilar visar vart Tjänstezon får ansluta.',
    ),
  ).toBeInTheDocument();
  const panel = chosen('Tjänstezon');
  expect(
    panel.getByText('Tar emot anslutningar från: Exponeringszon'),
  ).toBeInTheDocument();
  expect(
    panel.getByText('Får ansluta till: Exponeringszon, Plattformszon'),
  ).toBeInTheDocument();
  expect(
    panel.getByRole('link', { name: 'Öppna i katalogen' }),
  ).toHaveAttribute('href', '/catalog/it-miljo/resource/tjanst');
  // The flows through the zone are followed on the map.
  expect(panel.getByRole('link', { name: 'API mot internet' })).toHaveAttribute(
    'href',
    '/it-miljo?flode=RA-EXP-02',
  );
});

it('describes a chosen service and leads to the governance that uses it', async () => {
  open('/it-miljo?id=api-gateway-extern');
  const panel = within(
    await screen.findByRole('region', { name: 'Extern API-gateway' }),
  );
  expect(panel.getByText('Syftet med Extern API-gateway.')).toBeInTheDocument();
  expect(
    panel.getByRole('link', { name: 'Extern API-gateway' }),
  ).toHaveAttribute('href', '/catalog/default/component/api-gateway-extern');
  expect(panel.getByRole('link', { name: 'API mot internet' })).toHaveAttribute(
    'href',
    '/arkitekturguide?id=RA-EXP-02',
  );
  expect(panel.getByText('Här: kvoter')).toBeInTheDocument();
  // A replaced pattern is not offered as something to follow.
  expect(
    panel.queryByRole('link', { name: 'API mot internet, äldre' }),
  ).not.toBeInTheDocument();
  expect(
    panel.getByRole('link', { name: 'Det myndighetsgemensamma nätet' }),
  ).toHaveAttribute('href', '/it-miljo?id=sgsi');
  // The service is marked where it stands, in its segment.
  expect(
    within(
      screen.getByRole('group', { name: 'Segment: API och meddelanden' }),
    ).getByRole('link', { name: 'Extern API-gateway' }),
  ).toHaveAttribute('aria-current', 'true');
});

it('says how a platform works where the platform is chosen, and what is built on it', async () => {
  open('/it-miljo?id=containerplattform');
  expect(
    await screen.findByRole('heading', {
      name: 'Så fungerar den: Containerplattformen',
    }),
  ).toBeInTheDocument();
  // Governance the registry holds becomes a link. An ID it does not hold is left as text.
  expect(
    screen.getByText(
      'Containerplattformen är Kubernetes. Publicering enligt [RA-EXP-02](/arkitekturguide?id=RA-EXP-02) och TP-FINNS-01.',
    ),
  ).toBeInTheDocument();
  const panel = chosen('Containerplattform');
  expect(panel.getByRole('link', { name: 'Felanmälan' })).toHaveAttribute(
    'href',
    '/it-miljo?id=felanmalan',
  );
  expect(
    panel.getByText(
      'Inget mönster och ingen vägledning använder tjänsten ännu.',
    ),
  ).toBeInTheDocument();
});

it('shows what a system is built on, and ties its zone to theirs on the map', async () => {
  open('/it-miljo?id=felanmalan');
  const panel = within(
    await screen.findByRole('region', { name: 'Felanmälan' }),
  );
  expect(panel.getByText(/Bygger på:/)).toHaveTextContent(
    'Bygger på: Containerplattform, Inloggningstjänst',
  );
  expect(
    screen.getByText(
      'Streckade pilar går från ett system till zonerna med det som systemet bygger på.',
    ),
  ).toBeInTheDocument();
  expect(
    within(
      screen.getByRole('group', { name: 'Segment: Containerplattform' }),
    ).getByRole('link', { name: 'Felanmälan' }),
  ).toHaveAttribute('aria-current', 'true');
});

it('follows the flow of a pattern through the zones, step by step', async () => {
  open('/it-miljo');
  fireEvent.change(await screen.findByLabelText('Följ ett flöde'), {
    target: { value: 'RA-EXP-02' },
  });
  // Each step of the flow is an arrow on the map, numbered as in the list.
  expect(map().getByText('1')).toBeInTheDocument();
  expect(map().getByText('2')).toBeInTheDocument();
  expect(
    screen.getByText('Pilarna är flödets steg, numrerade som i listan.'),
  ).toBeInTheDocument();
  const panel = chosen('API mot internet');
  expect(
    panel.getByText(
      'Konsument (Internet) → Extern API-gateway (Exponeringszon): HTTPS',
    ),
  ).toBeInTheDocument();
  expect(
    panel.getByRole('link', { name: 'Läs mönstret i arkitekturguiden' }),
  ).toHaveAttribute('href', '/arkitekturguide?id=RA-EXP-02');
  expect(
    screen.getByRole('img', { name: 'Flöde för API mot internet' }),
  ).toBeInTheDocument();
});

it('finds a service by name', async () => {
  open('/it-miljo');
  fireEvent.change(await screen.findByLabelText(/^Hitta/), {
    target: { value: 'inlogg' },
  });
  fireEvent.click(
    screen.getAllByRole('link', { name: 'Inloggningstjänst' })[0],
  );
  expect(
    chosen('Inloggningstjänst').getByText('Syftet med Inloggningstjänst.'),
  ).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/^Hitta/), {
    target: { value: 'finns inte' },
  });
  expect(screen.getByText('Inget i miljön heter så.')).toBeInTheDocument();
});

it('describes a segment and an external connection, and says when an ID is unknown', async () => {
  const first = open('/it-miljo?id=dmz-api');
  const segmentPanel = within(
    await screen.findByRole('region', { name: 'API och meddelanden' }),
  );
  expect(segmentPanel.getByText('Miljöer: Produktion')).toBeInTheDocument();
  expect(
    segmentPanel.getByText('Platser: Datahall 1, Datahall 2'),
  ).toBeInTheDocument();
  first.unmount();
  const second = open('/it-miljo?id=sgsi');
  const external = within(
    await screen.findByRole('region', {
      name: 'Det myndighetsgemensamma nätet',
    }),
  );
  expect(
    external.getByText('Förbindelse: Fast förbindelse'),
  ).toBeInTheDocument();
  expect(
    external.getByRole('link', { name: 'Extern API-gateway' }),
  ).toHaveAttribute('href', '/it-miljo?id=api-gateway-extern');
  second.unmount();
  open('/it-miljo?id=saknas');
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'saknas finns inte i miljön.',
  );
});

it('holds what applies to the whole environment below the map', async () => {
  open('/it-miljo?id=7.4');
  expect(
    await screen.findByText('Varje datahall bär ensam produktionen.'),
  ).toBeInTheDocument();
  // A part that is not chosen stays closed.
  expect(
    screen.queryByText(/Containerplattformen är Kubernetes/),
  ).not.toBeInTheDocument();
  expect(screen.getAllByText('Datahall 1').length).toBeGreaterThan(0);
  expect(screen.getByText('Verklig information.')).toBeInTheDocument();
  expect(screen.getByText('Zon.')).toBeInTheDocument();
  // The environment description is what this page shows; there is no document to open.
  expect(screen.queryByRole('button', { name: /RM-/ })).not.toBeInTheDocument();
  expect(request).not.toHaveBeenCalledWith(expect.stringMatching(/sources/));
});

it('says what in the catalog does not hold together, and which systems have yet to say where they stand', async () => {
  open('/it-miljo');
  await screen.findByRole('group', { name: 'Karta över IT-miljön' });
  // A catalog that holds together gives nothing to say.
  expect(screen.queryByText(/går inte ihop/)).not.toBeInTheDocument();
  expect(
    screen.queryByText('System i katalogen utan placering'),
  ).not.toBeInTheDocument();

  request.mockImplementation(async (path: string) =>
    path === '/environment'
      ? {
          ...environment,
          problems: [
            'Ställverk (component:default/stallverk): segmentet ot-styr finns inte i katalogen.',
          ],
          unplaced: [
            { ref: 'component:default/example-website', name: 'Exempelwebb' },
          ],
        }
      : { items },
  );
  open('/it-miljo');
  fireEvent.click(
    await screen.findByText('1 uppgift i katalogen går inte ihop med miljön'),
  );
  expect(
    screen.getByText(/segmentet ot-styr finns inte i katalogen/),
  ).toBeInTheDocument();
  expect(screen.getByText('architecture.portal/segment')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Exempelwebb' })).toHaveAttribute(
    'href',
    '/catalog/default/component/example-website',
  );
});
