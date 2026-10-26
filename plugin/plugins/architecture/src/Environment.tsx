import { ReactNode, useEffect, useState } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  CircularProgress,
  Grid,
  Link,
  Paper,
  Typography,
} from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import {
  Content,
  Header,
  MarkdownContent,
  Page,
} from '@backstage/core-components';
import {
  ArtifactView,
  bindingLabels,
  Environment,
  flowsThrough,
  governanceFor,
  kindLabels,
  parseFlows,
  PlatformSection,
  replacedBy,
} from '@myndigheten/backstage-plugin-architecture-common';
import { TextField } from './Field';
import { useRequest } from './api';
import { EnvironmentMap, Marks, ZoneDetail } from './EnvironmentMap';
import { ZoneDiagram } from './ZoneDiagram';
import {
  BlockCard,
  catalogPath,
  guidePath,
  idPattern,
  Rows,
  Section,
  to,
} from './parts';

const flowPath = (id: string) => `?flode=${encodeURIComponent(id)}`;

/** A part of the environment description, where the governance it names can be followed. */
function Described({ text, ids }: { text: string; ids: Set<string> }) {
  const linked = text.replace(new RegExp(idPattern.source, 'gu'), id =>
    ids.has(id) ? `[${id}](${guidePath(id)})` : id,
  );
  return (
    <Box style={{ overflowX: 'auto' }}>
      <MarkdownContent content={linked} />
    </Box>
  );
}

function Links({
  title,
  items,
}: {
  title: string;
  items: { id: string; name: string }[];
}) {
  if (!items.length) return null;
  return (
    <Typography variant="body2" paragraph>
      {title}:{' '}
      {items.map((item, i) => (
        <span key={item.id}>
          {i > 0 && ', '}
          <Link component={RouterLink} to={to(item.id)}>
            {item.name}
          </Link>
        </span>
      ))}
    </Typography>
  );
}

function Panel({
  title,
  children,
  heading = true,
}: {
  title: string;
  children: ReactNode;
  heading?: boolean;
}) {
  return (
    <Box component={Paper} p={2} role="region" aria-label={title}>
      {heading && (
        <Typography variant="h6" component="h2" gutterBottom>
          {title}
        </Typography>
      )}
      {children}
    </Box>
  );
}

export function EnvironmentPage() {
  const request = useRequest();
  const [params, setParams] = useSearchParams();
  const [items, setItems] = useState<ArtifactView[]>();
  const [guide, setGuide] = useState<Environment>();
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([
      request<{ items: ArtifactView[] }>('/artifacts'),
      request<Environment>('/environment'),
    ])
      .then(([all, environment]) => {
        if (!active) return;
        setItems(all.items);
        setGuide(environment);
      })
      .catch(e => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [request]);

  let body: ReactNode = <CircularProgress aria-label="Läser IT-miljön" />;
  if (items && guide) {
    const id = params.get('id') ?? '';
    const ids = new Set(items.map(a => a.id));
    const zone = guide.zones.find(z => z.id === id);
    const segment = guide.segments.find(s => s.id === id);
    const block = guide.blocks.find(b => b.id === id);
    const external = guide.externals.find(e => e.id === id);
    const section = guide.platforms.sections.find(s => s.id === id);
    const zoneName = (zoneId: string) =>
      guide.zones.find(z => z.id === zoneId)?.name ?? zoneId;
    const named = (wanted: string[]) =>
      [...guide.blocks, ...guide.segments].filter(i => wanted.includes(i.id));

    const patterns = items
      .filter(a => a.flows.trim() && !replacedBy(a.id, items))
      .sort((a, b) => a.title.localeCompare(b.title, 'sv'));
    const followed = patterns.find(a => a.id === params.get('flode'));
    const flows = followed ? parseFlows(followed.flows).flows : [];

    const marks: Marks = {
      open: zone?.id ?? (segment ?? block ?? external)?.zone,
      current: id || undefined,
      related: new Set(),
      links: [],
      hops: [],
    };
    const uses = block ? named(block.uses ?? []) : [];
    const usedBy = block
      ? guide.blocks.filter(b => b.uses?.includes(block.id))
      : [];
    const reaches = block
      ? guide.externals.filter(e => e.through.includes(block.id))
      : [];
    const through = external ? named(external.through) : [];
    const describes = section ? named(section.blocks) : [];
    for (const item of [
      ...uses,
      ...usedBy,
      ...reaches,
      ...through,
      ...describes,
    ])
      marks.related.add(item.id);
    const tie = (from: string, target: string) => {
      if (!marks.links.some(l => l.from === from && l.to === target))
        marks.links.push({ from, to: target });
    };
    if (block) {
      uses.forEach(used => tie(block.zone, used.zone));
      usedBy.forEach(user => tie(user.zone, block.zone));
    }
    flows.forEach((f, i) => {
      marks.hops.push({ from: f.from.zone, to: f.to.zone, step: i + 1 });
      for (const node of [f.from, f.to]) {
        const known = guide.blocks.find(
          b => b.name === node.name && b.zone === node.zone,
        );
        if (known) marks.related.add(known.id);
      }
    });
    const opened = guide.zones.find(z => z.id === marks.open);

    const sections = block
      ? guide.platforms.sections.filter(s => s.blocks.includes(block.id))
      : [];
    const governance = block ? governanceFor(block.ref, items) : [];
    const needle = q.trim().toLocaleLowerCase('sv');
    const found = needle
      ? [...guide.zones, ...guide.segments, ...guide.blocks, ...guide.externals]
          .filter(i =>
            `${i.name} ${i.id}`.toLocaleLowerCase('sv').includes(needle),
          )
          .slice(0, 8)
      : [];
    const count = (type: string) =>
      guide.sites.filter(s => s.type === type).length;

    let panel: ReactNode;
    if (followed)
      panel = (
        <Panel title={followed.title}>
          <ol style={{ paddingLeft: 20, marginTop: 0 }}>
            {flows.map((f, i) => (
              <Typography component="li" variant="body2" key={i}>
                {f.from.name} ({zoneName(f.from.zone)}) → {f.to.name} (
                {zoneName(f.to.zone)}){f.label ? `: ${f.label}` : ''}
              </Typography>
            ))}
          </ol>
          <Typography variant="body2">
            <Link component={RouterLink} to={guidePath(followed.id)}>
              Läs mönstret i arkitekturguiden
            </Link>
          </Typography>
        </Panel>
      );
    else if (block)
      panel = (
        // The card names the service and leads to the catalog.
        <Panel title={block.name} heading={false}>
          <BlockCard block={block} guide={guide} onMap />
          <Box mt={2}>
            <Links title="Bygger på" items={uses} />
            <Links title="Används av" items={usedBy} />
            <Links title="Ansluter mot" items={reaches} />
            <Typography variant="subtitle2">
              Styrning som använder tjänsten
            </Typography>
            {governance.length === 0 && (
              <Typography variant="body2">
                Inget mönster och ingen vägledning använder tjänsten ännu.
              </Typography>
            )}
            {governance.map(({ artifact, role }) => (
              <Box key={artifact.id} my={1}>
                <Typography variant="body2">
                  <Link component={RouterLink} to={guidePath(artifact.id)}>
                    {artifact.title}
                  </Link>
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {kindLabels[artifact.kind]} ·{' '}
                  {bindingLabels[artifact.binding]} · {artifact.id}
                </Typography>
                {role && <Typography variant="body2">Här: {role}</Typography>}
              </Box>
            ))}
          </Box>
        </Panel>
      );
    else if (zone) {
      const passing = flowsThrough(zone.id, items);
      panel = (
        <Panel title={zone.name}>
          <Typography variant="body2" paragraph>
            {zone.description}
          </Typography>
          <Typography variant="body2" paragraph>
            Tar emot anslutningar från:{' '}
            {zone.acceptsFrom.map(zoneName).join(', ') || 'ingen zon'}
          </Typography>
          <Typography variant="body2" paragraph>
            Får ansluta till:{' '}
            {guide.zones
              .filter(z => z.acceptsFrom.includes(zone.id))
              .map(z => z.name)
              .join(', ') || 'ingen zon'}
          </Typography>
          <Typography variant="body2" paragraph>
            <Link component={RouterLink} to={catalogPath(zone.ref)}>
              Öppna i katalogen
            </Link>
          </Typography>
          <Typography variant="subtitle2">Flöden genom zonen</Typography>
          {passing.length === 0 && (
            <Typography variant="body2">
              Inget mönster har ett flöde genom zonen.
            </Typography>
          )}
          {passing.map(a => (
            <Typography variant="body2" key={a.id}>
              <Link component={RouterLink} to={flowPath(a.id)}>
                {a.title}
              </Link>
            </Typography>
          ))}
        </Panel>
      );
    } else if (segment)
      panel = (
        <Panel title={segment.name}>
          <Typography variant="body2" paragraph>
            {segment.description}
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            {zoneName(segment.zone)} · {segment.id}
          </Typography>
          <Typography variant="body2">
            Miljöer:{' '}
            {segment.stages
              .map(s => guide.stages.find(g => g.id === s)?.name ?? s)
              .join(', ')}
          </Typography>
          <Typography variant="body2" paragraph>
            Platser:{' '}
            {segment.sites
              .map(s => guide.sites.find(g => g.id === s)?.name ?? s)
              .join(', ')}
          </Typography>
          <Typography variant="body2">
            <Link component={RouterLink} to={catalogPath(segment.ref)}>
              Öppna i katalogen
            </Link>
          </Typography>
        </Panel>
      );
    else if (external)
      panel = (
        <Panel title={external.name}>
          <Typography variant="body2" paragraph>
            {external.purpose}
          </Typography>
          <Typography variant="body2" paragraph>
            Förbindelse: {external.connection}
          </Typography>
          <Links title="Ansluts genom" items={through} />
          <Typography variant="body2" color="textSecondary" paragraph>
            Förvaltas av: {external.owner}
          </Typography>
          <Typography variant="body2">
            <Link component={RouterLink} to={catalogPath(external.ref)}>
              Öppna i katalogen
            </Link>
          </Typography>
        </Panel>
      );
    else if (section)
      panel = (
        <Panel title={section.title}>
          <Links title="Beskriver" items={describes} />
          <Typography variant="body2">
            Texten står under Driftplattformar längre ned.
          </Typography>
        </Panel>
      );

    const platform = (s: PlatformSection) => (
      // An accordion keeps its first state, so a chosen part is drawn anew, open.
      <Accordion
        key={`${s.id}-${s.id === id}`}
        defaultExpanded={s.id === id}
        TransitionProps={{ unmountOnExit: true }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography>{s.title}</Typography>
        </AccordionSummary>
        <AccordionDetails style={{ display: 'block' }}>
          <Links title="Beskriver" items={named(s.blocks)} />
          <Described text={s.text} ids={ids} />
        </AccordionDetails>
      </Accordion>
    );

    body = (
      <>
        <Typography paragraph>{guide.note}</Typography>
        <Described text={guide.platforms.intro} ids={ids} />
        <Typography paragraph>
          {count('datahall')} datahallar · {guide.stages.length} miljöer ·{' '}
          {guide.zones.length} zoner i{' '}
          {new Set(guide.zones.map(z => z.domain)).size} domäner ·{' '}
          {guide.blocks.length} tjänster och system
        </Typography>
        <Box display="flex" flexWrap="wrap" gridGap={16} mb={1}>
          <TextField
            label="Hitta en zon, ett segment eller en tjänst"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ minWidth: 320 }}
          />
          <TextField
            select
            label="Följ ett flöde"
            value={followed?.id ?? ''}
            onChange={e =>
              setParams(e.target.value ? { flode: e.target.value } : {})
            }
            SelectProps={{ native: true }}
            InputLabelProps={{ shrink: true }}
            style={{ minWidth: 320 }}
          >
            <option value="">Inget flöde</option>
            {patterns.map(a => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </TextField>
        </Box>
        {needle && (
          <Typography variant="body2" paragraph>
            {found.length === 0 && 'Inget i miljön heter så.'}
            {found.map((item, i) => (
              <span key={item.id}>
                {i > 0 && ' · '}
                <Link
                  component={RouterLink}
                  to={to(item.id)}
                  onClick={() => setQ('')}
                >
                  {item.name}
                </Link>
              </span>
            ))}
          </Typography>
        )}
        {id && !panel && (
          <Typography role="alert" paragraph>
            {id} finns inte i miljön.
          </Typography>
        )}
        {(panel || id) && (
          <Typography variant="body2" paragraph>
            <Link component={RouterLink} to="?">
              Visa hela miljön
            </Link>
          </Typography>
        )}
        {guide.problems.length > 0 && (
          <Accordion TransitionProps={{ unmountOnExit: true }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>
                {guide.problems.length === 1
                  ? '1 uppgift i katalogen går inte ihop med miljön'
                  : `${guide.problems.length} uppgifter i katalogen går inte ihop med miljön`}
              </Typography>
            </AccordionSummary>
            <AccordionDetails style={{ display: 'block' }}>
              <Typography variant="body2" paragraph>
                Det som står här visas inte på kartan förrän det är rättat i
                katalogen.
              </Typography>
              <ul style={{ paddingLeft: 20, marginTop: 0 }}>
                {guide.problems.map(problem => (
                  <Typography component="li" variant="body2" key={problem}>
                    {problem}
                  </Typography>
                ))}
              </ul>
            </AccordionDetails>
          </Accordion>
        )}
        <EnvironmentMap guide={guide} marks={marks} />
        <Box mt={2}>
          <Grid container spacing={2}>
            {opened && (
              <Grid item xs={12} md={panel ? 8 : 12}>
                <ZoneDetail zone={opened} guide={guide} marks={marks} />
              </Grid>
            )}
            {panel && (
              <Grid item xs={12} md={opened ? 4 : 12}>
                {panel}
              </Grid>
            )}
          </Grid>
        </Box>
        {followed && (
          <Section title="Flödet steg för steg">
            <Box style={{ overflowX: 'auto' }}>
              <ZoneDiagram
                flows={flows}
                zones={guide.zones}
                label={`Flöde för ${followed.title}`}
              />
            </Box>
          </Section>
        )}
        {!followed &&
          sections.map(s => (
            <Section key={s.id} title={`Så fungerar den: ${s.title}`}>
              <Described text={s.text} ids={ids} />
            </Section>
          ))}
        <Section title="Driftplattformar">
          {guide.platforms.sections.map(platform)}
        </Section>
        <Section title="Platser">
          <Rows
            head={['Plats', 'Typ', 'Vad som finns där']}
            rows={guide.sites.map(s => [s.name, s.type, s.description])}
          />
        </Section>
        <Section title="Miljöer">
          <Rows
            head={['Miljö', 'Används för', 'Data', 'Plats']}
            rows={guide.stages.map(s => [
              s.name,
              s.purpose,
              s.data,
              s.sites
                .map(site => guide.sites.find(g => g.id === site)?.name ?? site)
                .join(', '),
            ])}
          />
        </Section>
        <Section title="Begrepp">
          {guide.terms.map(t => (
            <Typography key={t.term} paragraph>
              <strong>{t.term}.</strong> {t.meaning}
            </Typography>
          ))}
        </Section>
        {guide.unplaced.length > 0 && (
          <Section title="System i katalogen utan placering">
            <Typography paragraph>
              De här systemen finns i katalogen men säger inte vilket segment de
              står i, och syns därför inte på kartan. Lägg till annotationen{' '}
              <code>architecture.portal/segment</code> med segmentets ID i
              systemets <code>catalog-info.yaml</code>.
            </Typography>
            <Typography variant="body2">
              {guide.unplaced.map((item, i) => (
                <span key={item.ref}>
                  {i > 0 && ' · '}
                  <Link component={RouterLink} to={catalogPath(item.ref)}>
                    {item.name}
                  </Link>
                </span>
              ))}
            </Typography>
          </Section>
        )}
      </>
    );
  }
  return (
    <Page themeId="documentation">
      <Header
        title="IT-miljön"
        subtitle="Zoner, plattformar, tjänster och system – och styrningen som använder dem"
      />
      <Content>
        <Box component={Paper} p={2} mb={3}>
          <Typography>
            Mönster och vägledningar som kartan leder till är förslag, inte
            beslutad styrning.
          </Typography>
        </Box>
        {error ? (
          <Typography color="error" role="alert">
            {error}
          </Typography>
        ) : (
          body
        )}
      </Content>
    </Page>
  );
}
