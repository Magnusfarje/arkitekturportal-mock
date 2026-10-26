import { TextField } from './Field';
import { useEffect, useState } from 'react';
import { useSearchParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Link,
  MenuItem,
  Paper,
  Typography,
} from '@material-ui/core';
import { Content, Header, Page } from '@backstage/core-components';
import {
  ArtifactInput,
  ArtifactView,
  fieldLabels,
  kinds,
  kindLabels,
  bindingLabels,
  bindings,
  relationLabels,
  replacedBy,
} from '@myndigheten/backstage-plugin-architecture-common';
import { useRequest } from './api';

function Text({ label, value }: { label: string; value?: string }) {
  return (
    <Box my={2}>
      <Typography variant="subtitle2">{label}</Typography>
      <Typography style={{ whiteSpace: 'pre-wrap' }}>
        {value || 'Ej angivet – behöver kompletteras'}
      </Typography>
    </Box>
  );
}
function CatalogLink({ refValue }: { refValue: string }) {
  const match = /^([^:]+):([^/]+)\/(.+)$/.exec(refValue);
  return match ? (
    <Link
      component={RouterLink}
      to={`/catalog/${match[2]}/${match[1]}/${match[3]}`}
    >
      {refValue}
    </Link>
  ) : (
    <>{refValue}</>
  );
}
function RelationTarget({
  relation: r,
  items,
}: {
  relation: ArtifactInput['relations'][number];
  items: ArtifactView[];
}) {
  if (r.type === 'uses') return <CatalogLink refValue={r.target} />;
  const target = items.find(a => a.id === r.target);
  if (target)
    return (
      <Link component={RouterLink} to={`?id=${encodeURIComponent(r.target)}`}>
        {target.id} – {target.title}
      </Link>
    );
  return <>{r.target} (referens ej registrerad)</>;
}

export function ArchitecturePage() {
  const request = useRequest();
  const [params, setParams] = useSearchParams();
  const id = params.get('id');
  const [items, setItems] = useState<ArtifactView[]>([]);
  const [selected, setSelected] = useState<ArtifactView>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('');
  const [binding, setBinding] = useState('');
  const [owner, setOwner] = useState('');
  const [needs, setNeeds] = useState('');
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setSelected(undefined);
    const load = async () => {
      const all = await request<{ items: ArtifactView[] }>('/artifacts');
      if (!active) return;
      setItems(all.items);
      if (id) {
        const detail = await request<ArtifactView>(
          `/artifacts/${encodeURIComponent(id)}`,
        );
        if (!active) return;
        setSelected(detail);
      }
    };
    load()
      .catch(e => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [request, id, refresh]);
  const filtered = items.filter(
    a =>
      (!kind || a.kind === kind) &&
      (!binding || a.binding === binding) &&
      (!owner || a.owner === owner) &&
      (!needs || a.completionNeeds.length > 0) &&
      JSON.stringify(a)
        .toLocaleLowerCase('sv')
        .includes(q.toLocaleLowerCase('sv')),
  );
  return (
    <Page themeId="documentation">
      <Header title="Arkitekturstyrning" subtitle="Registret över förslag" />
      <Content>
        <Box component={Paper} p={2} mb={3}>
          <Typography>
            <strong>Allt i registret är förslag.</strong> Inget är beslutad
            styrning. Registret håller ett innehåll per artefakt, läst ur
            innehållsrepot. En ändring görs där och syns här vid nästa läsning.
          </Typography>
        </Box>
        {error && (
          <Box mb={2}>
            <Typography color="error" role="alert">
              {error}
            </Typography>
            <Button onClick={() => setRefresh(v => v + 1)}>Försök igen</Button>
          </Box>
        )}
        {loading && <CircularProgress aria-label="Läser artefakter" />}
        {!loading && selected && (
          <>
            <Button onClick={() => setParams({})}>Till översikten</Button>
            <Box display="flex" alignItems="center" my={2}>
              <Typography variant="h4">
                {selected.id} – {selected.title}
              </Typography>
            </Box>
            <Chip label="Förslag" /> <Chip label={kindLabels[selected.kind]} />{' '}
            <Chip label={bindingLabels[selected.binding]} />{' '}
            {replacedBy(selected.id, items) && (
              <Chip label={`Ersatt av ${replacedBy(selected.id, items)!.id}`} />
            )}{' '}
            <Link
              component={RouterLink}
              to={`/arkitekturguide?id=${encodeURIComponent(selected.id)}`}
            >
              Läs i arkitekturguiden
            </Link>
            {selected.provenance && (
              <Box my={2}>
                <Typography color="textSecondary">
                  Läst ur {selected.provenance.path} i innehållsrepot
                  {selected.provenance.url ? '' : '.'}
                  {selected.provenance.url && (
                    <>
                      {' '}
                      (
                      <Link
                        href={selected.provenance.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        öppna filen
                      </Link>
                      ).
                    </>
                  )}{' '}
                  En ändring görs där.
                </Typography>
              </Box>
            )}
            {selected.completionNeeds.length > 0 && (
              <Box component={Paper} p={2} my={2}>
                <Typography variant="h6">
                  Kompletteringsbehov ({selected.completionNeeds.length})
                </Typography>
                <ul>
                  {selected.completionNeeds.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </Box>
            )}
            <Text
              label={fieldLabels[selected.kind].statement}
              value={selected.statement}
            />
            <Text
              label={fieldLabels[selected.kind].rationale}
              value={selected.rationale}
            />
            <Text
              label={fieldLabels[selected.kind].scope}
              value={selected.scope}
            />
            {selected.flows && <Text label="Flöden" value={selected.flows} />}
            <Text
              label={fieldLabels[selected.kind].consequences}
              value={selected.consequences}
            />
            <Typography variant="subtitle2">Innehållsägare</Typography>
            {selected.owner ? (
              <CatalogLink refValue={selected.owner} />
            ) : (
              <Typography>Ej utsedd</Typography>
            )}
            {selected.source && (
              <Text label="Källreferens" value={selected.source} />
            )}
            {/^https?:\/\//.test(selected.source) && (
              <Link
                href={selected.source}
                target="_blank"
                rel="noopener noreferrer"
              >
                Öppna förvaltat original
              </Link>
            )}
            {selected.provenance && (
              <Text
                label="Importkälla"
                value={`Innehållsrepot vid ${selected.provenance.etag}`}
              />
            )}
            <Text
              label="Externa kravreferenser"
              value={selected.externalReferences}
            />
            <Typography variant="h5">Relationer</Typography>
            {selected.relations.length === 0 && (
              <Typography>Inga relationer registrerade.</Typography>
            )}
            <ul>
              {selected.relations.map((r, i) => (
                <li key={i}>
                  {relationLabels[r.type]}:{' '}
                  <RelationTarget relation={r} items={items} />
                  {r.note ? ` – ${r.note}` : ''}
                </li>
              ))}
            </ul>
            {items.some(a =>
              a.relations.some(r => r.target === selected.id),
            ) && (
              <>
                <Typography variant="h6">Refereras av</Typography>
                <ul>
                  {items
                    .filter(a =>
                      a.relations.some(r => r.target === selected.id),
                    )
                    .map(a => (
                      <li key={a.id}>
                        <Link
                          component={RouterLink}
                          to={`?id=${encodeURIComponent(a.id)}`}
                        >
                          {a.id} – {a.title}
                        </Link>
                      </li>
                    ))}
                </ul>
              </>
            )}
            <Typography variant="h5">
              Krav ({selected.requirements.length})
            </Typography>
            {selected.requirements.map(r => (
              <Box key={r.id} component={Paper} p={3} my={2}>
                <Typography variant="h6">
                  {r.id} – {r.title}
                </Typography>
                <Text label="Krav" value={r.statement} />
                <Text label="Tillämplighet" value={r.scope} />
                <Text label="Bedömningskriterier" value={r.criteria} />
                {r.method && (
                  <Text
                    label="Kontrollmetod"
                    value={
                      {
                        manual: 'Manuell',
                        automatic: 'Automatisk',
                        combined: 'Kombinerad',
                      }[r.method]
                    }
                  />
                )}
              </Box>
            ))}
          </>
        )}
        {!loading && !selected && !id && (
          <>
            <Box display="flex" flexWrap="wrap" gridGap={16} mb={3}>
              <TextField
                label="Sök ID, titel, innehåll eller krav"
                value={q}
                onChange={e => setQ(e.target.value)}
                style={{ minWidth: 300 }}
              />
              <TextField
                select
                label="Typ"
                value={kind}
                onChange={e => setKind(e.target.value)}
                style={{ minWidth: 180 }}
              >
                <MenuItem value="">Alla typer</MenuItem>
                {kinds.map(k => (
                  <MenuItem key={k} value={k}>
                    {kindLabels[k]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Bindningsgrad"
                value={binding}
                onChange={e => setBinding(e.target.value)}
                style={{ minWidth: 180 }}
              >
                <MenuItem value="">Alla</MenuItem>
                {bindings.map(b => (
                  <MenuItem key={b} value={b}>
                    {bindingLabels[b]}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Ägare"
                value={owner}
                onChange={e => setOwner(e.target.value)}
                style={{ minWidth: 180 }}
              >
                <MenuItem value="">Alla ägare</MenuItem>
                {Array.from(
                  new Set(items.map(a => a.owner).filter(Boolean)),
                ).map(o => (
                  <MenuItem key={o} value={o}>
                    {o}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                label="Kompletteringar"
                value={needs}
                onChange={e => setNeeds(e.target.value)}
                style={{ minWidth: 180 }}
              >
                <MenuItem value="">Alla artefakter</MenuItem>
                <MenuItem value="yes">Behöver kompletteras</MenuItem>
              </TextField>
            </Box>
            <Typography>
              {filtered.length} av {items.length} artefakter
            </Typography>
            {filtered.length === 0 && (
              <Typography>Inga artefakter matchar sökningen.</Typography>
            )}
            {filtered.map(a => (
              <Box component={Paper} key={a.id} p={3} my={2}>
                <Typography variant="h6">
                  <Link
                    component={RouterLink}
                    to={`?id=${encodeURIComponent(a.id)}`}
                  >
                    {a.id} – {a.title}
                  </Link>
                </Typography>
                <Typography>
                  {kindLabels[a.kind]} · {bindingLabels[a.binding]} · förslag
                  {replacedBy(a.id, items) &&
                    ` · ersatt av ${replacedBy(a.id, items)!.id}`}
                </Typography>
                <Text label={fieldLabels[a.kind].scope} value={a.scope} />
                <Typography>
                  Ägare: {a.owner || 'Ej utsedd'} · {a.requirements.length} krav
                  · {a.completionNeeds.length} kompletteringsbehov
                </Typography>
              </Box>
            ))}
          </>
        )}
      </Content>
    </Page>
  );
}
