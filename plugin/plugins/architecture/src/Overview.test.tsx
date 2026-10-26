import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OverviewPage } from './Overview';
import {
  bindingLabels,
  idPrefixes,
  kindLabels,
  kinds,
  relationLabels,
} from '@myndigheten/backstage-plugin-architecture-common';

jest.mock('@backstage/core-components', () => ({
  Page: ({ children }: any) => <div>{children}</div>,
  Content: ({ children }: any) => <main>{children}</main>,
  Header: ({ title }: any) => <h1>{title}</h1>,
}));

const open = () =>
  render(
    <MemoryRouter initialEntries={['/om-arkitekturstyrning']}>
      <OverviewPage />
    </MemoryRouter>,
  );

it('describes the governance model with its four artifact types and binding grades', () => {
  open();
  expect(
    screen.getByRole('heading', { name: 'Så hänger det ihop', level: 1 }),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/är förslag, inte beslutad\s+styrning/),
  ).toBeInTheDocument();
  for (const kind of kinds) {
    expect(
      screen.getAllByRole('cell', { name: kindLabels[kind] }).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getByRole('cell', { name: idPrefixes[kind] }),
    ).toBeInTheDocument();
  }
  expect(
    screen.getByRole('cell', { name: bindingLabels.guidance }),
  ).toBeInTheDocument();
  expect(
    screen.getAllByRole('cell', { name: bindingLabels.binding }).length,
  ).toBeGreaterThan(0);
});

it('draws how the parts relate, with the relation types', () => {
  open();
  const img = screen.getByRole('img', {
    name: 'Hur arkitekturstyrningens delar hänger ihop',
  });
  expect(within(img).getByText(relationLabels['leads-to'])).toBeInTheDocument();
  expect(within(img).getByText(relationLabels.concretizes)).toBeInTheDocument();
  expect(within(img).getByText(relationLabels.uses)).toBeInTheDocument();
  expect(within(img).getAllByText(relationLabels['motivated-by']).length).toBe(
    2,
  );
  expect(within(img).getByText('Byggsten')).toBeInTheDocument();
  expect(within(img).getByText('Vägledning')).toBeInTheDocument();
  expect(within(img).getByText('Systemkatalog')).toBeInTheDocument();
  expect(within(img).getByText('IT-miljöbeskrivning')).toBeInTheDocument();
  expect(within(img).getByText('Verksamhetssystem')).toBeInTheDocument();
});

it('leads to the guide, the environment and the registry', () => {
  open();
  for (const link of screen.getAllByRole('link', { name: 'Arkitekturguiden' }))
    expect(link).toHaveAttribute('href', '/arkitekturguide');
  for (const link of screen.getAllByRole('link', { name: 'IT-miljön' }))
    expect(link).toHaveAttribute('href', '/it-miljo');
  expect(
    screen.getByRole('link', { name: 'Arkitekturstyrning – registret' }),
  ).toHaveAttribute('href', '/architecture');
});

it('names the example systems and the assistant', () => {
  open();
  expect(
    screen.getByRole('heading', { name: 'Exempelsystemen' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('heading', { name: 'Assistenten Odin' }),
  ).toBeInTheDocument();
});

it('names the three sources and the two ways to get an answer', () => {
  open();
  expect(
    screen.getByRole('heading', { name: 'Tre källor, två sätt att få svar' }),
  ).toBeInTheDocument();
  for (const source of [
    'Arkitekturstyrning',
    'IT-miljöbeskrivning',
    'Systemkatalog',
  ])
    expect(
      screen.getAllByRole('cell', { name: source }).length,
    ).toBeGreaterThan(0);
  expect(screen.getAllByRole('cell', { name: 'Källa' })).toHaveLength(3);
  expect(screen.getAllByRole('cell', { name: 'Svar' })).toHaveLength(2);
});
