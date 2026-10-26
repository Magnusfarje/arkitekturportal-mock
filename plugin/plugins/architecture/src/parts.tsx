import { Fragment, ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@material-ui/core';
import {
  ArtifactView,
  bindingLabels,
  BuildingBlock,
  Environment,
  kindLabels,
} from '@myndigheten/backstage-plugin-architecture-common';

// What the guide and its assistant both show: text with links, cards for artifacts and for building blocks.
export const idPattern = /((?:RA|VL|TP|AP)-[\p{Lu}]+(?:-[\p{Lu}]+)?-\d+)/u;
export const to = (id: string) => `?id=${encodeURIComponent(id)}`;
// From another page, a link names the page it leads to.
export const guidePath = (id: string) =>
  `/arkitekturguide?id=${encodeURIComponent(id)}`;
export const environmentPath = (id: string) =>
  `/it-miljo?id=${encodeURIComponent(id)}`;
export const catalogPath = (ref: string) => {
  const m = /^([^:]+):([^/]+)\/(.+)$/.exec(ref);
  return m ? `/catalog/${m[2]}/${m[1]}/${m[3]}` : '/catalog';
};

/** Plain text with lists, where known artifact IDs become links. */
export function RichText({ value, ids }: { value: string; ids: Set<string> }) {
  const inline = (line: string) =>
    line.split(idPattern).map((part, i) =>
      ids.has(part) ? (
        <Link key={i} component={RouterLink} to={to(part)}>
          {part}
        </Link>
      ) : (
        <Fragment key={i}>{part}</Fragment>
      ),
    );
  const blocks: ReactNode[] = [];
  let list: { ordered: boolean; items: string[] } | undefined;
  const flush = () => {
    if (!list) return;
    const items = list.items.map((item, i) => (
      <Typography component="li" key={i} style={{ marginBottom: 4 }}>
        {inline(item)}
      </Typography>
    ));
    blocks.push(
      list.ordered ? (
        <ol key={blocks.length}>{items}</ol>
      ) : (
        <ul key={blocks.length}>{items}</ul>
      ),
    );
    list = undefined;
  };
  for (const line of value.split('\n')) {
    const item = /^(- |\d+\. )(.*)$/.exec(line);
    if (item) {
      const ordered = item[1] !== '- ';
      if (list && list.ordered !== ordered) flush();
      list = list ?? { ordered, items: [] };
      list.items.push(item[2]);
    } else {
      flush();
      if (line.trim())
        blocks.push(
          <Typography key={blocks.length} paragraph>
            {inline(line)}
          </Typography>,
        );
    }
  }
  flush();
  return <>{blocks}</>;
}
export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Box my={4}>
      <Typography variant="h6" component="h2" gutterBottom>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
export function Rows({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {head.map(h => (
            <TableCell key={h}>{h}</TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((cells, i) => (
          <TableRow key={i}>
            {cells.map((cell, j) => (
              <TableCell key={j}>{cell}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
export function ArtifactCard({ a, note }: { a: ArtifactView; note?: string }) {
  return (
    <Box component={Paper} p={2} my={1}>
      {note && <Typography color="textSecondary">{note}</Typography>}
      <Typography variant="subtitle1">
        <Link component={RouterLink} to={to(a.id)}>
          {a.title}
        </Link>
      </Typography>
      <Typography variant="body2" color="textSecondary">
        {kindLabels[a.kind]} · {bindingLabels[a.binding]} · {a.id}
      </Typography>
      <Typography variant="body2">{a.statement}</Typography>
    </Box>
  );
}
export function BlockCard({
  block,
  guide,
  role,
  onMap,
}: {
  block: BuildingBlock;
  guide: Environment;
  role?: string;
  // On the map itself, the card does not lead to where the reader already is.
  onMap?: boolean;
}) {
  return (
    <Box component={Paper} p={2} height="100%">
      <Typography variant="subtitle1">
        <Link component={RouterLink} to={catalogPath(block.ref)}>
          {block.name}
        </Link>
      </Typography>
      {role && <Typography variant="body2">Här: {role}</Typography>}
      <Typography variant="body2">{block.purpose}</Typography>
      <Typography variant="body2" color="textSecondary">
        {[
          guide.zones.find(z => z.id === block.zone)?.name,
          block.segment,
          block.interfaces,
        ]
          .filter(Boolean)
          .join(' · ')}
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Beställs hos: {block.owner}
      </Typography>
      {!onMap && (
        <Typography variant="body2">
          <Link component={RouterLink} to={environmentPath(block.id)}>
            Visa i IT-miljön
          </Link>
        </Typography>
      )}
    </Box>
  );
}
