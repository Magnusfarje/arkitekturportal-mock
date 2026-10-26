import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ArchitecturePage } from './Page';
import {
  ArtifactView,
  emptyArtifact,
} from '@myndigheten/backstage-plugin-architecture-common';

const request = jest.fn();
jest.mock('./api', () => ({ useRequest: () => request }));
jest.mock('@backstage/core-components', () => ({
  Page: ({ children }: any) => <div>{children}</div>,
  Content: ({ children }: any) => <main>{children}</main>,
  Header: ({ title }: any) => <h1>{title}</h1>,
  MarkdownContent: ({ content }: any) => <pre>{content}</pre>,
}));
const a: ArtifactView = {
  ...emptyArtifact(),
  id: 'TP-TEST-01',
  title: 'Testprincip',
  statement: 'Tydlig regel',
  rationale: 'Motiv',
  scope: 'Nya system',
  consequences: 'Anvisning',
  owner: 'group:default/guests',
  source: 'dokument/Test.md#TP-TEST-01',
  provenance: {
    path: 'styrning/tekniska-principer/TP-TEST-01.yaml',
    etag: 'abc123',
    url: 'https://git.example/innehall/blob/main/styrning/tekniska-principer/TP-TEST-01.yaml',
  },
  completionNeeds: ['Innehållsägare'],
};
beforeEach(() => {
  request.mockReset();
  request.mockImplementation(async (path: string) =>
    path === '/artifacts' ? { items: [a] } : a,
  );
});
it('searches the artifacts and opens one as a proposal, without versions', async () => {
  render(
    <MemoryRouter initialEntries={['/architecture']}>
      <ArchitecturePage />
    </MemoryRouter>,
  );
  await screen.findByRole('link', { name: 'TP-TEST-01 – Testprincip' });
  fireEvent.change(
    screen.getByLabelText('Sök ID, titel, innehåll eller krav'),
    { target: { value: 'saknas' } },
  );
  expect(
    screen.getByText('Inga artefakter matchar sökningen.'),
  ).toBeInTheDocument();
  fireEvent.change(
    screen.getByLabelText('Sök ID, titel, innehåll eller krav'),
    { target: { value: 'Tydlig regel' } },
  );
  fireEvent.click(
    screen.getByRole('link', { name: 'TP-TEST-01 – Testprincip' }),
  );
  await screen.findByText('Kompletteringsbehov (1)');
  expect(screen.getByText('Förslag')).toBeInTheDocument();
  expect(screen.queryByLabelText('Innehållsversion')).not.toBeInTheDocument();
  expect(screen.queryByText(/[Gg]ällande version/)).not.toBeInTheDocument();
  expect(request).not.toHaveBeenCalledWith('/artifacts/TP-TEST-01/versions');
  // The access of the reader is not asked for: everyone who may read reads the same.
  expect(request).not.toHaveBeenCalledWith('/access');
});
it('reads an artifact under the headings its kind has in the guide, with named relation targets', async () => {
  const guide: ArtifactView = {
    ...emptyArtifact(),
    id: 'VL-TEST-01',
    kind: 'guide',
    binding: 'guidance',
    title: 'Hur följer jag testprincipen?',
    statement: 'Följ den.',
    rationale: 'Vet vad regeln gäller.',
    scope: 'Alla team',
    consequences: '1. Läs regeln.',
    relations: [
      { type: 'leads-to', target: 'TP-TEST-01', note: 'När regeln gäller' },
    ],
    completionNeeds: [],
  };
  request.mockImplementation(async (path: string) => {
    if (path === '/artifacts') return { items: [a, guide] };
    return path.endsWith('VL-TEST-01') ? guide : a;
  });
  const { unmount } = render(
    <MemoryRouter initialEntries={['/architecture?id=TP-TEST-01']}>
      <ArchitecturePage />
    </MemoryRouter>,
  );
  await screen.findByText('Kompletteringsbehov (1)');
  for (const label of ['Princip', 'Varför', 'Gäller för', 'Det innebär'])
    expect(screen.getByText(label)).toBeInTheDocument();
  expect(screen.queryByText('Formulering')).not.toBeInTheDocument();
  unmount();
  render(
    <MemoryRouter initialEntries={['/architecture?id=VL-TEST-01']}>
      <ArchitecturePage />
    </MemoryRouter>,
  );
  await screen.findByText('Kort svar');
  for (const label of ['Innan du börjar', 'Gäller för', 'Gör så här'])
    expect(screen.getByText(label)).toBeInTheDocument();
  expect(
    screen.getByRole('link', { name: 'TP-TEST-01 – Testprincip' }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/Leder till:.*– När regeln gäller/),
  ).toBeInTheDocument();
});
it('says where the content came from and that a change is made there, and offers nothing to edit', async () => {
  render(
    <MemoryRouter initialEntries={['/architecture?id=TP-TEST-01']}>
      <ArchitecturePage />
    </MemoryRouter>,
  );
  await screen.findByText('Kompletteringsbehov (1)');
  expect(
    screen.getByText(/Läst ur styrning\/tekniska-principer\/TP-TEST-01\.yaml/),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'öppna filen' })).toHaveAttribute(
    'href',
    a.provenance!.url,
  );
  expect(screen.getByText(/Innehållsrepot vid abc123/)).toBeInTheDocument();
  for (const name of [
    'Redigera',
    'Skapa artefakt',
    'Skicka till granskning',
    'Registrera fastställande',
    'Upphäv',
  ])
    expect(screen.queryByRole('button', { name })).not.toBeInTheDocument();
  expect(request).not.toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({ method: 'PUT' }),
  );
});
