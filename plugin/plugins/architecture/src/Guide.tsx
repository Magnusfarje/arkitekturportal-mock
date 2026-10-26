import { ReactNode, useEffect, useState } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Chip,
  CircularProgress,
  Grid,
  Link,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@material-ui/core';
import { Content, Header, Page } from '@backstage/core-components';
import {
  Access,
  ArtifactView,
  bindingLabels,
  Environment,
  fieldLabels,
  flowViolations,
  kindLabels,
  parseFlows,
  relationLabels,
  replacedBy,
} from '@myndigheten/backstage-plugin-architecture-common';
import { TextField } from './Field';
import { useRequest } from './api';
import { Assistant } from './Assistant';
import { ZoneDiagram } from './ZoneDiagram';
import {
  ArtifactCard,
  BlockCard,
  catalogPath,
  RichText,
  Section,
  to,
} from './parts';

type Guide = Environment;
function Reader({
  a,
  items,
  guide,
}: {
  a: ArtifactView;
  items: ArtifactView[];
  guide: Guide;
}) {
  const ids = new Set(items.map(i => i.id));
  const byId = (id: string) => items.find(i => i.id === id);
  const labels = fieldLabels[a.kind];
  const { flows } = parseFlows(a.flows ?? '');
  const violations = flowViolations(flows, guide.zones);
  const choices = a.relations.filter(r => r.type === 'leads-to');
  const uses = a.relations.filter(r => r.type === 'uses');
  // A guide shows the rules behind itself and behind the patterns it leads to.
  const basis = Array.from(
    new Set(
      [a, ...choices.map(r => byId(r.target))].flatMap(
        source =>
          source?.relations
            .filter(r =>
              ['motivated-by', 'concretizes', 'supports'].includes(r.type),
            )
            .map(r => r.target) ?? [],
      ),
    ),
  ).filter(id => id !== a.id);
  const usedBy = items.filter(i => i.relations.some(r => r.target === a.id));
  const successor = replacedBy(a.id, items);
  const field = (key: keyof typeof labels) =>
    a[key] && (
      <Section title={labels[key]}>
        <RichText value={a[key]} ids={ids} />
      </Section>
    );
  return (
    <>
      <Link component={RouterLink} to="?">
        Till arkitekturguiden
      </Link>
      <Box mt={2} mb={1}>
        {a.topic && <Typography variant="overline">{a.topic}</Typography>}
        <Typography variant="h4" component="h1">
          {a.title}
        </Typography>
      </Box>
      <Chip size="small" label={kindLabels[a.kind]} />{' '}
      <Chip size="small" label={bindingLabels[a.binding]} />{' '}
      <Chip size="small" label="Förslag – inte beslutad styrning" />
      {successor && (
        <Box component={Paper} p={2} mt={2}>
          <Typography>
            Ersatt av{' '}
            <Link component={RouterLink} to={to(successor.id)}>
              {successor.id} – {successor.title}
            </Link>
          </Typography>
        </Box>
      )}
      <Box mt={3}>
        <Typography variant="subtitle2">{labels.statement}</Typography>
        <Typography variant="h6" component="p" style={{ fontWeight: 400 }}>
          {a.statement}
        </Typography>
      </Box>
      {a.kind === 'guide' && field('rationale')}
      {choices.length > 0 && (
        <Section title="Vägval">
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Om det här gäller dig</TableCell>
                <TableCell>Gå till</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {choices.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <RichText value={r.note ?? ''} ids={ids} />
                  </TableCell>
                  <TableCell>
                    <Link component={RouterLink} to={to(r.target)}>
                      {byId(r.target)?.title ?? r.target}
                    </Link>
                    <Typography variant="body2" color="textSecondary">
                      {byId(r.target)
                        ? `${kindLabels[byId(r.target)!.kind]} · ${r.target}`
                        : 'Saknas i registret'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}
      {a.kind !== 'guide' && a.kind !== 'reference-architecture' && (
        <>
          {field('rationale')}
          {field('scope')}
        </>
      )}
      {a.kind === 'reference-architecture' && field('scope')}
      {flows.length > 0 && (
        <Section title="Flöde">
          <ZoneDiagram
            flows={flows}
            zones={guide.zones}
            label={`Flöde för ${a.title}`}
          />
          <Link
            component={RouterLink}
            to={`/it-miljo?flode=${encodeURIComponent(a.id)}`}
          >
            Visa flödet i IT-miljön
          </Link>
          <ol>
            {flows.map((f, i) => (
              <Typography component="li" key={i}>
                {f.from.name} → {f.to.name}
                {f.label ? `: ${f.label}` : ''}
              </Typography>
            ))}
          </ol>
          {violations.map(v => (
            <Typography key={v} color="error" role="alert">
              Flödet följer inte zonmodellen: {v}
            </Typography>
          ))}
        </Section>
      )}
      {field('consequences')}
      {a.kind === 'reference-architecture' && field('rationale')}
      {a.requirements.length > 0 && (
        <Section title={`Krav (${a.requirements.length})`}>
          {a.requirements.map(r => (
            <Box key={r.id} component={Paper} p={2} my={1}>
              <Typography variant="subtitle1">{r.title}</Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                {r.id}
              </Typography>
              <Typography paragraph>{r.statement}</Typography>
              <Typography variant="subtitle2">Gäller när</Typography>
              <RichText value={r.scope} ids={ids} />
              <Typography variant="subtitle2">
                Så uppfyller du kravet
              </Typography>
              <RichText value={r.criteria} ids={ids} />
            </Box>
          ))}
        </Section>
      )}
      {uses.length > 0 && (
        <Section title="Byggstenar">
          <Grid container spacing={2}>
            {uses.map(r => {
              const block = guide.blocks.find(b => b.ref === r.target);
              return (
                <Grid item xs={12} md={6} key={r.target}>
                  {block ? (
                    <BlockCard block={block} guide={guide} role={r.note} />
                  ) : (
                    <Link component={RouterLink} to={catalogPath(r.target)}>
                      {r.target}
                    </Link>
                  )}
                </Grid>
              );
            })}
          </Grid>
        </Section>
      )}
      {basis.length > 0 && (
        <Section
          title={
            a.kind === 'guide' ? 'Regler och krav som gäller' : 'Bygger på'
          }
        >
          {basis.map(id =>
            byId(id) ? (
              <ArtifactCard key={id} a={byId(id)!} />
            ) : (
              <Typography key={id}>{id}</Typography>
            ),
          )}
        </Section>
      )}
      {a.kind === 'guide' && field('scope')}
      {usedBy.length > 0 && (
        <Section title="Används i">
          {usedBy.map(i => (
            <Typography key={i.id}>
              <Link component={RouterLink} to={to(i.id)}>
                {i.title}
              </Link>{' '}
              <Typography component="span" color="textSecondary">
                {kindLabels[i.kind]} ·{' '}
                {i.relations
                  .filter(r => r.target === a.id)
                  .map(r => relationLabels[r.type].toLocaleLowerCase('sv'))
                  .join(', ')}
              </Typography>
            </Typography>
          ))}
        </Section>
      )}
      <Box component={Paper} p={2} my={4}>
        <Typography variant="subtitle2">
          Passar det inte din lösning?
        </Typography>
        <Typography>
          Vägledningar och mönster är rekommendationer. Väljer du en annan
          lösning ska du kunna visa att reglerna och kraven ändå är uppfyllda.
          Går det inte: kontakta den som förvaltar innehållet innan du bygger.
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Förvaltas av: {a.owner || 'Ägare ej utsedd'} ·{' '}
          <Link
            component={RouterLink}
            to={`/architecture?id=${encodeURIComponent(a.id)}`}
          >
            Öppna i registret
          </Link>
        </Typography>
      </Box>
    </>
  );
}

function Overview({
  items,
  guide,
  canAsk,
}: {
  items: ArtifactView[];
  guide: Guide;
  canAsk: boolean;
}) {
  const [q, setQ] = useState('');
  const match = (a: ArtifactView) =>
    [a.id, a.title, a.statement, a.topic, a.consequences]
      .join(' ')
      .toLocaleLowerCase('sv')
      .includes(q.toLocaleLowerCase('sv'));
  const grouped = (kind: ArtifactView['kind']) => {
    // A replaced artifact is still readable, but is not offered as something to follow.
    const found = items.filter(
      a => a.kind === kind && match(a) && !replacedBy(a.id, items),
    );
    return Array.from(new Set(found.map(a => a.topic || 'Övrigt'))).map(
      topic => ({
        topic,
        items: found.filter(a => (a.topic || 'Övrigt') === topic),
      }),
    );
  };
  const guides = grouped('guide');
  return (
    <>
      {canAsk && <Assistant items={items} guide={guide} />}
      <TextField
        label="Sök i vägledningar, mönster och regler"
        value={q}
        onChange={e => setQ(e.target.value)}
        style={{ minWidth: 360 }}
      />
      <Section title="Vad ska du göra?">
        {guides.length === 0 && (
          <Typography>Inga vägledningar matchar sökningen.</Typography>
        )}
        {guides.map(group => (
          <Box key={group.topic} mb={3}>
            <Typography variant="overline">{group.topic}</Typography>
            {group.items.map(a => (
              <Box component={Paper} p={2} my={1} key={a.id}>
                <Typography variant="h6" component="h3">
                  <Link component={RouterLink} to={to(a.id)}>
                    {a.title}
                  </Link>
                </Typography>
                <Typography>{a.statement}</Typography>
              </Box>
            ))}
          </Box>
        ))}
      </Section>
      <Section title="Miljön">
        <Typography paragraph>
          {guide.sites.length} platser, {guide.zones.length} zoner,{' '}
          {guide.segments.length} segment och {guide.blocks.length} tjänster och
          system.{' '}
          <Link component={RouterLink} to="/it-miljo">
            Visa IT-miljön
          </Link>
        </Typography>
      </Section>
      {(
        [
          ['reference-architecture', 'Mönster'],
          ['technical-principle', 'Regler'],
        ] as const
      ).map(([kind, title]) => (
        <Section key={kind} title={title}>
          <Grid container spacing={2}>
            {grouped(kind).map(group => (
              <Grid item xs={12} md={6} key={group.topic}>
                <Typography variant="overline">{group.topic}</Typography>
                {group.items.map(a => (
                  <Typography key={a.id}>
                    <Link component={RouterLink} to={to(a.id)}>
                      {a.title}
                    </Link>
                  </Typography>
                ))}
              </Grid>
            ))}
          </Grid>
        </Section>
      ))}
      <Typography>
        Arkitekturprinciper och krav finns i{' '}
        <Link component={RouterLink} to="/architecture">
          arkitekturstyrningen
        </Link>
        .
      </Typography>
    </>
  );
}

export function GuidePage() {
  const request = useRequest();
  const [params] = useSearchParams();
  const id = params.get('id');
  const [items, setItems] = useState<ArtifactView[]>();
  const [guide, setGuide] = useState<Guide>();
  const [canAsk, setCanAsk] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([
      request<{ items: ArtifactView[] }>('/artifacts'),
      request<Guide>('/environment'),
      request<Access>('/access'),
    ])
      .then(([all, environment, access]) => {
        if (!active) return;
        setItems(all.items);
        setGuide(environment);
        setCanAsk(Boolean(access.canAsk));
      })
      .catch(e => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [request]);
  const selected = id ? items?.find(a => a.id === id) : undefined;
  let body: ReactNode = (
    <CircularProgress aria-label="Läser arkitekturguiden" />
  );
  if (items && guide) {
    if (selected) body = <Reader a={selected} items={items} guide={guide} />;
    else if (id) body = <Typography>{id} finns inte i registret.</Typography>;
    else body = <Overview items={items} guide={guide} canAsk={canAsk} />;
  }
  return (
    <Page themeId="documentation">
      <Header
        title="Arkitekturguide"
        subtitle="Svar på vanliga frågor – med mönster, byggstenar, regler och krav"
      />
      <Content>
        <Box component={Paper} p={2} mb={3}>
          <Typography>
            Vägledningar, mönster och regler är förslag, inte beslutad styrning.
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
