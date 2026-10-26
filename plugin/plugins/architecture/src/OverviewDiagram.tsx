import { useTheme } from '@material-ui/core';
import {
  bindingLabels,
  relationLabels,
} from '@myndigheten/backstage-plugin-architecture-common';

// The picture never changes, so the boxes and arrows are laid out by hand.
const boxWidth = 160;
const boxHeight = 48;
const columns = [40, 300, 560];
const width = 760;
const height = 476;

type Box = {
  title: string;
  sub: string;
  x: number;
  y: number;
  binding?: boolean;
};

// The three sources: the registry, the environment description and the catalog.
const governance: Box[] = [
  {
    title: 'Teknisk princip',
    sub: `${
      bindingLabels.binding
    } eller ${bindingLabels.recommended.toLowerCase()}`,
    x: columns[0],
    y: 56,
    binding: true,
  },
  {
    title: 'Arkitekturprincip',
    sub: bindingLabels.binding,
    x: columns[2],
    y: 56,
    binding: true,
  },
  { title: 'Vägledning', sub: bindingLabels.guidance, x: columns[0], y: 150 },
  {
    title: 'Referensarkitektur',
    sub: `Mönster · ${bindingLabels.recommended.toLowerCase()}`,
    x: columns[1],
    y: 150,
  },
];
const environment: Box[] = [
  {
    title: 'Zon',
    sub: 'Zonmodellen: vad får tala med vad',
    x: columns[0],
    y: 272,
  },
  { title: 'Segment', sub: 'Del av en zon', x: columns[2], y: 272 },
];
const catalog: Box[] = [
  {
    title: 'Team',
    sub: 'Group · förvaltar, beställs hos',
    x: columns[0],
    y: 392,
  },
  {
    title: 'Byggsten',
    sub: 'Component · plattformstjänst',
    x: columns[1],
    y: 392,
  },
  {
    title: 'Verksamhetssystem',
    sub: 'System och Component · din lösning',
    x: columns[2],
    y: 392,
  },
];

type Edge = {
  path: string;
  label: string;
  at: [number, number];
  anchor?: 'start' | 'middle' | 'end';
};

const edges: Edge[] = [
  // Guide to pattern.
  {
    path: 'M200 174 L300 174',
    label: relationLabels['leads-to'],
    at: [250, 166],
  },
  // Guide and pattern rest on rules.
  {
    path: 'M120 150 L120 104',
    label: relationLabels['motivated-by'],
    at: [128, 130],
    anchor: 'start',
  },
  {
    path: 'M380 150 V80 H200',
    label: relationLabels['motivated-by'],
    at: [290, 72],
  },
  // A rule makes a principle concrete.
  {
    path: 'M120 56 V36 H640 V56',
    label: relationLabels.concretizes,
    at: [380, 32],
  },
  // A pattern uses building blocks in the catalog, and its flows follow the zone model.
  {
    path: 'M380 198 L380 392',
    label: relationLabels.uses,
    at: [388, 232],
    anchor: 'start',
  },
  {
    path: 'M340 198 V232 H160 V272',
    label: 'Flödet följer zonmodellen',
    at: [250, 228],
  },
  // A system stands in a segment, depends on building blocks, and a building block has a team.
  {
    path: 'M640 392 L640 320',
    label: 'Står i: architecture.portal/segment',
    at: [632, 360],
    anchor: 'end',
  },
  { path: 'M560 416 L460 416', label: 'Beror på', at: [510, 408] },
  { path: 'M300 416 L200 416', label: 'Beställs hos', at: [250, 408] },
];

/** Draws how the artifact types relate, and how they meet the environment and the catalog. */
export function OverviewDiagram() {
  const theme = useTheme();
  const line = theme.palette.text.secondary;
  const band = (y: number, h: number, title: string) => (
    <g>
      <rect
        x={16}
        y={y}
        width={width - 32}
        height={h}
        rx={8}
        fill={theme.palette.action.hover}
      />
      <text
        x={28}
        y={y + 16}
        fontSize={11}
        fontWeight={600}
        fill={theme.palette.text.secondary}
      >
        {title}
      </text>
    </g>
  );
  const box = (b: Box) => (
    <g key={b.title}>
      <rect
        x={b.x}
        y={b.y}
        width={boxWidth}
        height={boxHeight}
        rx={6}
        fill={theme.palette.background.paper}
        stroke={b.binding ? theme.palette.primary.main : line}
        strokeWidth={b.binding ? 2 : 1}
      />
      <text
        x={b.x + boxWidth / 2}
        y={b.y + 20}
        textAnchor="middle"
        fontSize={12}
        fontWeight={600}
        fill={theme.palette.text.primary}
      >
        {b.title}
      </text>
      <text
        x={b.x + boxWidth / 2}
        y={b.y + 36}
        textAnchor="middle"
        fontSize={11}
        fill={theme.palette.text.secondary}
      >
        {b.sub}
      </text>
    </g>
  );
  return (
    <svg
      role="img"
      aria-label="Hur arkitekturstyrningens delar hänger ihop"
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', maxWidth: width, minWidth: 560, height: 'auto' }}
    >
      <defs>
        <marker
          id="overview-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M 0 0 L 10 5 L 0 10 z" fill={line} />
        </marker>
      </defs>
      {band(16, 200, 'Arkitekturstyrning')}
      {band(240, 100, 'IT-miljöbeskrivning')}
      {band(358, 100, 'Systemkatalog')}
      {edges.map(e => (
        <g key={e.path}>
          <path
            d={e.path}
            fill="none"
            stroke={line}
            strokeWidth={1.5}
            strokeLinejoin="round"
            markerEnd="url(#overview-arrow)"
          />
          <text
            x={e.at[0]}
            y={e.at[1]}
            textAnchor={e.anchor ?? 'middle'}
            fontSize={11}
            fontWeight={600}
            fill={theme.palette.text.secondary}
          >
            {e.label}
          </text>
        </g>
      ))}
      {governance.map(box)}
      {environment.map(box)}
      {catalog.map(box)}
    </svg>
  );
}
