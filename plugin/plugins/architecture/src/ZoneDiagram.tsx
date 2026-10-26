import { useTheme } from '@material-ui/core';
import { Flow, Zone } from '@myndigheten/backstage-plugin-architecture-common';

const columnWidth = 200;
const columnGap = 28;
const boxWidth = 168;
const boxHeight = 48;
const rowGap = 34;
const header = 56;
const lane = 22;
const pad = 16;

type Node = {
  name: string;
  zone: string;
  column: number;
  x: number;
  y: number;
};

function wrap(name: string): string[] {
  const lines: string[] = [];
  for (const word of name.split(' ')) {
    const last = lines[lines.length - 1];
    if (last !== undefined && `${last} ${word}`.length <= 22)
      lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
  }
  return lines.slice(0, 2);
}

/** Draws the flows of a pattern across the zones they pass, in zone model order. */
export function ZoneDiagram({
  flows,
  zones,
  label,
}: {
  flows: Flow[];
  zones: Zone[];
  label: string;
}) {
  const theme = useTheme();
  const order = zones.map(z => z.id);
  const position = (zone: string) =>
    order.includes(zone) ? order.indexOf(zone) : order.length;
  const used = Array.from(
    new Set(flows.flatMap(f => [f.from.zone, f.to.zone])),
  ).sort((a, b) => position(a) - position(b));
  const key = (n: { name: string; zone: string }) => `${n.zone}|${n.name}`;
  const column = (n: { zone: string }) => used.indexOf(n.zone);
  // Flows that pass other zones run in a lane of their own above the boxes.
  const long = flows.filter(f => Math.abs(column(f.from) - column(f.to)) > 1);
  const top = header + long.length * lane + pad;
  const nodes = new Map<string, Node>();
  const rows = new Map<string, number>();
  for (const n of flows.flatMap(f => [f.from, f.to])) {
    if (nodes.has(key(n))) continue;
    const row = rows.get(n.zone) ?? 0;
    rows.set(n.zone, row + 1);
    nodes.set(key(n), {
      ...n,
      column: column(n),
      x: pad + column(n) * (columnWidth + columnGap) + columnWidth / 2,
      y: top + row * (boxHeight + rowGap) + boxHeight / 2,
    });
  }
  const depth = Math.max(1, ...Array.from(rows.values()));
  const width = pad * 2 + used.length * (columnWidth + columnGap) - columnGap;
  const height = top + depth * (boxHeight + rowGap) - rowGap + pad;
  const line = theme.palette.text.secondary;

  // Flows that meet the same side of a box are spread out along that side.
  const ports = new Map<string, number>();
  const sides = flows.map(f => {
    const from = nodes.get(key(f.from))!;
    const to = nodes.get(key(f.to))!;
    if (from.column === to.column) {
      const down = to.y >= from.y;
      return [down ? 'bottom' : 'top', down ? 'top' : 'bottom'];
    }
    return from.column < to.column ? ['right', 'left'] : ['left', 'right'];
  });
  flows.forEach((f, i) =>
    [f.from, f.to].forEach((n, end) => {
      const port = `${key(n)}|${sides[i][end]}`;
      ports.set(port, (ports.get(port) ?? 0) + 1);
    }),
  );
  const taken = new Map<string, number>();
  const offset = (n: { name: string; zone: string }, side: string) => {
    const port = `${key(n)}|${side}`;
    const index = taken.get(port) ?? 0;
    taken.set(port, index + 1);
    return (index - (ports.get(port)! - 1) / 2) * 13;
  };
  const edges = flows.map((f, i) => {
    const from = nodes.get(key(f.from))!;
    const to = nodes.get(key(f.to))!;
    const [out, into] = sides[i];
    const a = offset(f.from, out);
    const b = offset(f.to, into);
    if (from.column === to.column) {
      const direction = out === 'bottom' ? 1 : -1;
      const start = { x: from.x + a, y: from.y + (direction * boxHeight) / 2 };
      const end = { x: to.x + b, y: to.y - (direction * boxHeight) / 2 };
      return {
        path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
        mid: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
      };
    }
    const direction = out === 'right' ? 1 : -1;
    const start = { x: from.x + (direction * boxWidth) / 2, y: from.y + a };
    const end = { x: to.x - (direction * boxWidth) / 2, y: to.y + b };
    const index = long.indexOf(f);
    if (index < 0)
      return {
        path: `M ${start.x} ${start.y} L ${end.x} ${end.y}`,
        mid: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
      };
    // Leave through the gap beside the column, cross in the lane, and come down beside the target.
    const gutter = (columnWidth + columnGap) / 2;
    const shift = (index - (long.length - 1) / 2) * 7;
    const up = from.x + direction * (gutter + shift);
    const down = to.x - direction * (gutter + shift);
    const y = header + index * lane + lane / 2;
    return {
      path: `M ${start.x} ${start.y} H ${up} V ${y} H ${down} V ${end.y} H ${end.x}`,
      mid: { x: (up + down) / 2, y },
    };
  });
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: '100%', maxWidth: width, height: 'auto' }}
    >
      <defs>
        <marker
          id="flow-arrow"
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
      {used.map((id, i) => {
        const zone = zones.find(z => z.id === id);
        const x = pad + i * (columnWidth + columnGap);
        return (
          <g key={id}>
            <rect
              x={x}
              y={pad / 2}
              width={columnWidth}
              height={height - pad}
              rx={8}
              fill={theme.palette.action.hover}
            />
            <text
              x={x + columnWidth / 2}
              y={28}
              textAnchor="middle"
              fontSize={13}
              fontWeight={600}
              fill={theme.palette.text.primary}
            >
              {zone?.name ?? id}
            </text>
            <text
              x={x + columnWidth / 2}
              y={44}
              textAnchor="middle"
              fontSize={11}
              fill={theme.palette.text.secondary}
            >
              {zone?.domain ?? 'Okänd zon'}
            </text>
          </g>
        );
      })}
      {edges.map((e, i) => (
        <path
          key={i}
          d={e.path}
          fill="none"
          stroke={line}
          strokeWidth={1.5}
          strokeLinejoin="round"
          markerEnd="url(#flow-arrow)"
        />
      ))}
      {Array.from(nodes.values()).map(n => {
        const lines = wrap(n.name);
        return (
          <g key={key(n)}>
            <rect
              x={n.x - boxWidth / 2}
              y={n.y - boxHeight / 2}
              width={boxWidth}
              height={boxHeight}
              rx={6}
              fill={theme.palette.background.paper}
              stroke={line}
            />
            {lines.map((text, i) => (
              <text
                key={i}
                x={n.x}
                y={n.y + 4 + (i - (lines.length - 1) / 2) * 15}
                textAnchor="middle"
                fontSize={12}
                fill={theme.palette.text.primary}
              >
                {text}
              </text>
            ))}
          </g>
        );
      })}
      {edges.map((e, i) => (
        <g key={i}>
          <circle
            cx={e.mid.x}
            cy={e.mid.y}
            r={10}
            fill={theme.palette.primary.main}
          />
          <text
            x={e.mid.x}
            y={e.mid.y + 4}
            textAnchor="middle"
            fontSize={11}
            fontWeight={600}
            fill={theme.palette.primary.contrastText}
          >
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}
