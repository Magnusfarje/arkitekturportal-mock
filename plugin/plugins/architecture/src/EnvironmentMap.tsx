import { useState } from 'react';
import { Link as RouterLink, useHref, useNavigate } from 'react-router-dom';
import { Box, Link, Typography, useTheme } from '@material-ui/core';
import {
  blockCategoryLabels,
  BuildingBlock,
  Environment,
  Zone,
} from '@myndigheten/backstage-plugin-architecture-common';
import { to } from './parts';

type Category = BuildingBlock['category'];
// What the page has worked out about the reader's choice, for the map to show.
export type Marks = {
  // The zone the reader is in: marked on the map and drawn with its segments and services.
  open?: string;
  // The zone, segment, service or connection the reader chose.
  current?: string;
  // Services and connections that belong with the choice.
  related: Set<string>;
  // Zones tied together by what the chosen service is built on, or by what is built on it.
  links: { from: string; to: string }[];
  // The steps of a followed flow, from zone to zone.
  hops: { from: string; to: string; step: number }[];
};

const width = 1160;
const pad = 12;
const head = 26;
const gap = 10;
const tileHeight = 62;
const rows = 3;
const between = 36;
const column = rows * tileHeight + (rows - 1) * gap;
const upper = head + column + pad;
const height = upper + between + head + tileHeight + pad;

type Rect = { x: number; y: number; w: number; h: number };
const center = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
// Where the line between two tiles leaves the first one.
function edge(from: Rect, toward: Rect) {
  const a = center(from);
  const b = center(toward);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const scale = Math.min(
    dx ? from.w / 2 / Math.abs(dx) : Infinity,
    dy ? from.h / 2 / Math.abs(dy) : Infinity,
  );
  // The line stops just short of the tile, so that the arrowhead stays in front of it.
  const clear = 1 + 5 / (Math.hypot(dx, dy) * scale || 1);
  return { x: a.x + dx * scale * clear, y: a.y + dy * scale * clear };
}

function wrap(name: string, chars: number): string[] {
  const lines: string[] = [];
  for (const word of name.split(' ')) {
    const last = lines[lines.length - 1];
    if (last !== undefined && `${last} ${word}`.length <= chars)
      lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines.slice(0, 2);
}

/**
 * Places the domains as areas and the zones as tiles within them. The domain that most
 * zones connect to lies beneath the others, as the ground they stand on.
 */
function layout(zones: Zone[]) {
  const domains = Array.from(new Set(zones.map(z => z.domain)));
  const of = (domain: string) => zones.filter(z => z.domain === domain);
  const reach = (domain: string) =>
    Math.max(...of(domain).map(z => z.acceptsFrom.length));
  const ground =
    domains.length > 1
      ? domains.reduce((a, b) => (reach(b) > reach(a) ? b : a))
      : undefined;
  const above = domains.filter(d => d !== ground);
  const columns = (domain: string) => Math.ceil(of(domain).length / rows);
  const total = above.reduce((n, d) => n + columns(d), 0);
  const unit =
    (width -
      (above.length - 1) * between -
      above.reduce((n, d) => n + 2 * pad + (columns(d) - 1) * gap, 0)) /
    total;
  const areas: { domain: string; rect: Rect }[] = [];
  const tiles = new Map<string, Rect>();
  let x = 0;
  for (const domain of above) {
    const w = 2 * pad + columns(domain) * unit + (columns(domain) - 1) * gap;
    const left = x;
    areas.push({ domain, rect: { x: left, y: 0, w, h: upper } });
    of(domain).forEach((zone, i) => {
      const col = Math.floor(i / rows);
      // A column with fewer zones gives each of them more room.
      const inColumn = of(domain).filter(
        (_, j) => Math.floor(j / rows) === col,
      ).length;
      const h = (column - (inColumn - 1) * gap) / inColumn;
      tiles.set(zone.id, {
        x: left + pad + col * (unit + gap),
        y: head + (i % rows) * (h + gap),
        w: unit,
        h,
      });
    });
    x += w + between;
  }
  if (ground) {
    const y = above.length ? upper + between : 0;
    const w =
      (width - 2 * pad - (of(ground).length - 1) * gap) / of(ground).length;
    areas.push({
      domain: ground,
      rect: { x: 0, y, w: width, h: head + tileHeight + pad },
    });
    of(ground).forEach((zone, i) =>
      tiles.set(zone.id, {
        x: pad + i * (w + gap),
        y: y + head,
        w,
        h: tileHeight,
      }),
    );
  }
  return { areas, tiles };
}

export function useCategoryColors(): Record<Category, string> {
  const { palette } = useTheme();
  return {
    'building-block': palette.primary.main,
    infrastructure: palette.info.main,
    'shared-service': palette.success.main,
    'business-system': palette.warning.main,
  };
}
const several = (n: number, one: string, many: string) =>
  n === 1 ? `1 ${one}` : `${n} ${many}`;

function Tile({
  zone,
  rect,
  guide,
  marks,
  dimmed,
  onHover,
}: {
  zone: Zone;
  rect: Rect;
  guide: Environment;
  marks: Marks;
  dimmed: boolean;
  onHover: (id?: string) => void;
}) {
  const { palette } = useTheme();
  const colors = useCategoryColors();
  const navigate = useNavigate();
  const href = useHref(to(zone.id));
  const open = marks.open === zone.id;
  const blocks = guide.blocks.filter(b => b.zone === zone.id);
  const externals = guide.externals.filter(e => e.zone === zone.id).length;
  const holds = [
    blocks.length && several(blocks.length, 'tjänst', 'tjänster'),
    externals &&
      several(externals, 'extern anslutning', 'externa anslutningar'),
  ].filter(Boolean);
  // The bar along the bottom shows what kinds of services the zone holds.
  const shares = [
    ...Object.keys(blockCategoryLabels).map(category => ({
      n: blocks.filter(b => b.category === category).length,
      color: colors[category as Category],
    })),
    { n: externals, color: palette.text.secondary },
  ].filter(s => s.n > 0);
  const whole = shares.reduce((n, s) => n + s.n, 0);
  const starts = shares.map((_, i) =>
    shares.slice(0, i).reduce((n, s) => n + s.n, 0),
  );
  const name = wrap(zone.name, Math.floor((rect.w - 20) / 7.5));
  return (
    <a
      href={href}
      aria-label={zone.name}
      aria-current={open ? 'true' : undefined}
      onClick={e => {
        e.preventDefault();
        navigate(to(zone.id));
      }}
      onMouseEnter={() => onHover(zone.id)}
      onMouseLeave={() => onHover()}
      onFocus={() => onHover(zone.id)}
      onBlur={() => onHover()}
      style={{ cursor: 'pointer' }}
    >
      {/* A zone that is not part of what is shown steps back, but still hides the arrows behind it. */}
      <rect
        x={rect.x}
        y={rect.y}
        width={rect.w}
        height={rect.h}
        rx={6}
        fill={palette.background.default}
      />
      <g opacity={dimmed ? 0.4 : 1}>
        <rect
          x={rect.x}
          y={rect.y}
          width={rect.w}
          height={rect.h}
          rx={6}
          fill={open ? palette.action.selected : palette.background.paper}
          stroke={open ? palette.primary.main : palette.text.secondary}
          strokeWidth={open ? 3 : 1}
        />
        {name.map((line, i) => (
          <text
            key={i}
            x={rect.x + 10}
            y={rect.y + 22 + i * 16}
            fontSize={14}
            fontWeight={600}
            fill={palette.text.primary}
          >
            {line}
          </text>
        ))}
        <text
          x={rect.x + 10}
          y={rect.y + rect.h - 14}
          fontSize={12}
          fill={palette.text.secondary}
        >
          {holds.join(' · ')}
        </text>
        {shares.map((s, i) => (
          <rect
            key={i}
            x={rect.x + 10 + ((rect.w - 20) * starts[i]) / whole}
            y={rect.y + rect.h - 9}
            width={((rect.w - 20) * s.n) / whole}
            height={4}
            fill={s.color}
          />
        ))}
      </g>
    </a>
  );
}

type Arrow = { from: string; to: string; step?: number; out?: boolean };

/**
 * The environment as a map: domains as areas, zones as tiles. Arrows show what may connect
 * to the zone the reader points at or has chosen, or the steps of a followed flow.
 */
export function EnvironmentMap({
  guide,
  marks,
}: {
  guide: Environment;
  marks: Marks;
}) {
  const theme = useTheme();
  const { palette } = theme;
  const colors = useCategoryColors();
  const [hover, setHover] = useState<string>();
  const { areas, tiles } = layout(guide.zones);

  let arrows: Arrow[] = [];
  let reading = 'Peka på en zon för att se vad som får ansluta till den.';
  const pointed =
    hover ?? (marks.current === marks.open ? marks.open : undefined);
  const zone = guide.zones.find(z => z.id === pointed);
  if (marks.hops.length && !hover) {
    arrows = marks.hops;
    reading = 'Pilarna är flödets steg, numrerade som i listan.';
  } else if (zone) {
    arrows = [
      ...zone.acceptsFrom.map(from => ({ from, to: zone.id })),
      ...guide.zones
        .filter(z => z.acceptsFrom.includes(zone.id))
        .map(z => ({ from: zone.id, to: z.id, out: true })),
    ];
    reading = `Heldragna pilar får ansluta till ${zone.name}. Streckade pilar visar vart ${zone.name} får ansluta.`;
  } else if (marks.links.length) {
    arrows = marks.links.map(l => ({ ...l, out: true }));
    reading =
      'Streckade pilar går från ett system till zonerna med det som systemet bygger på.';
  }
  const drawn = arrows.filter(
    a => a.from !== a.to && tiles.has(a.from) && tiles.has(a.to),
  );
  const touched = new Set(drawn.flatMap(a => [a.from, a.to]));
  const pair = (a: Arrow) => [a.from, a.to].sort().join('|');
  const lines = drawn.map((a, i) => {
    const from = tiles.get(a.from)!;
    const target = tiles.get(a.to)!;
    const start = edge(from, target);
    const end = edge(target, from);
    // Arrows between the same two zones run beside each other.
    const beside = drawn.filter(o => pair(o) === pair(a));
    const direction = a.from === [a.from, a.to].sort()[0] ? 1 : -1;
    const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
    const shift =
      (beside.indexOf(a) - (beside.length - 1) / 2) * 16 * direction;
    const dx = (-(end.y - start.y) / length) * shift;
    const dy = ((end.x - start.x) / length) * shift;
    const color = a.out ? palette.text.secondary : palette.primary.main;
    const middle = {
      x: (start.x + end.x) / 2 + dx,
      y: (start.y + end.y) / 2 + dy,
    };
    return {
      line: (
        <line
          key={i}
          x1={start.x + dx}
          y1={start.y + dy}
          x2={end.x + dx}
          y2={end.y + dy}
          stroke={color}
          strokeWidth={2}
          strokeDasharray={a.out ? '6 4' : undefined}
          markerEnd={`url(#environment-arrow-${a.out ? 'out' : 'in'})`}
        />
      ),
      badge: a.step !== undefined && (
        <g key={i}>
          <circle
            cx={middle.x}
            cy={middle.y}
            r={11}
            fill={palette.primary.main}
          />
          <text
            x={middle.x}
            y={middle.y + 4}
            fontSize={12}
            fontWeight={600}
            textAnchor="middle"
            fill={palette.primary.contrastText}
          >
            {a.step}
          </text>
        </g>
      ),
    };
  });
  return (
    <Box>
      <Box style={{ overflowX: 'auto' }}>
        <svg
          viewBox={`-2 -2 ${width + 4} ${height + 4}`}
          role="group"
          aria-label="Karta över IT-miljön"
          style={{
            width: '100%',
            minWidth: 760,
            fontFamily: theme.typography.fontFamily,
          }}
        >
          <defs>
            {(
              [
                ['in', palette.primary.main],
                ['out', palette.text.secondary],
              ] as const
            ).map(([name, color]) => (
              <marker
                key={name}
                id={`environment-arrow-${name}`}
                viewBox="0 0 10 10"
                refX={9}
                refY={5}
                markerWidth={7}
                markerHeight={7}
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill={color} />
              </marker>
            ))}
          </defs>
          {areas.map(({ domain, rect }) => (
            <g key={domain} role="group" aria-label={`Domän: ${domain}`}>
              <rect
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                rx={8}
                fill={palette.background.default}
                stroke={palette.divider}
              />
              <text
                x={rect.x + pad}
                y={rect.y + 17}
                fontSize={11}
                letterSpacing={1}
                fill={palette.text.secondary}
              >
                {domain.toLocaleUpperCase('sv')}
              </text>
            </g>
          ))}
          {/* An arrow that passes another zone on its way runs behind it. */}
          {lines.map(l => l.line)}
          {guide.zones.map(z => (
            <Tile
              key={z.id}
              zone={z}
              rect={tiles.get(z.id)!}
              guide={guide}
              marks={marks}
              dimmed={
                drawn.length > 0 && !touched.has(z.id) && z.id !== marks.open
              }
              onHover={setHover}
            />
          ))}
          {lines.map(l => l.badge)}
        </svg>
      </Box>
      <Box display="flex" flexWrap="wrap" gridGap={16} mt={1}>
        <Typography variant="body2" color="textSecondary">
          {reading}
        </Typography>
        {Object.entries(blockCategoryLabels).map(([category, label]) => (
          <Typography key={category} variant="body2" color="textSecondary">
            <Box
              component="span"
              display="inline-block"
              mr={0.5}
              style={{
                width: 12,
                height: 4,
                verticalAlign: 'middle',
                background: colors[category as Category],
              }}
            />
            {label}
          </Typography>
        ))}
      </Box>
    </Box>
  );
}

function Item({
  id,
  name,
  color,
  kind,
  marks,
}: {
  id: string;
  name: string;
  color: string;
  kind: string;
  marks: Marks;
}) {
  const { palette } = useTheme();
  const current = marks.current === id;
  const related = marks.related.has(id);
  const line = current || related ? palette.text.primary : palette.divider;
  return (
    <Link
      component={RouterLink}
      to={to(id)}
      title={kind}
      aria-current={current ? 'true' : undefined}
      color="textPrimary"
      style={{
        padding: '2px 8px',
        borderRadius: 4,
        borderStyle: 'solid',
        borderWidth: '1px 1px 1px 4px',
        borderColor: `${line} ${line} ${line} ${color}`,
        background: current ? palette.action.selected : undefined,
        fontWeight: current ? 600 : undefined,
        fontSize: '0.875rem',
      }}
    >
      {name}
    </Link>
  );
}

/** The zone the reader is in, drawn with its segments and the services that stand in each. */
export function ZoneDetail({
  zone,
  guide,
  marks,
}: {
  zone: Zone;
  guide: Environment;
  marks: Marks;
}) {
  const { palette } = useTheme();
  const colors = useCategoryColors();
  const blocks = guide.blocks.filter(b => b.zone === zone.id);
  const externals = guide.externals.filter(e => e.zone === zone.id);
  const segments = guide.segments.filter(s => s.zone === zone.id);
  return (
    <Box
      role="group"
      aria-label={`Zon: ${zone.name}`}
      p={1.5}
      style={{
        borderRadius: 6,
        border: `3px solid ${palette.primary.main}`,
        background: palette.background.paper,
      }}
    >
      <Typography variant="subtitle1" component="h2">
        {zone.name}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {zone.description}
      </Typography>
      <Box display="flex" flexWrap="wrap" gridGap={8} mt={1}>
        {externals.map(e => (
          <Item
            key={e.id}
            id={e.id}
            name={e.name}
            color={palette.text.secondary}
            kind="Extern anslutning"
            marks={marks}
          />
        ))}
        {segments.map(s => (
          <Box
            key={s.id}
            role="group"
            aria-label={`Segment: ${s.name}`}
            p={1}
            style={{
              flex: '1 1 220px',
              borderRadius: 4,
              border: `1px dashed ${palette.text.secondary}`,
            }}
          >
            <Typography variant="body2">
              <Link
                component={RouterLink}
                to={to(s.id)}
                color="textSecondary"
                aria-current={marks.current === s.id ? 'true' : undefined}
                style={{
                  fontWeight: marks.current === s.id ? 600 : undefined,
                }}
              >
                {s.name}
              </Link>
            </Typography>
            <Box display="flex" flexWrap="wrap" gridGap={6} mt={0.5}>
              {blocks
                .filter(b => b.segment === s.id)
                .map(b => (
                  <Item
                    key={b.id}
                    id={b.id}
                    name={b.name}
                    color={colors[b.category]}
                    kind={blockCategoryLabels[b.category]}
                    marks={marks}
                  />
                ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
