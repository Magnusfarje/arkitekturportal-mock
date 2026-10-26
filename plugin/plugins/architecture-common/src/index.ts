import { z } from 'zod/v3';
import { createPermission } from '@backstage/plugin-permission-common';
import { parse as parseYaml } from 'yaml';

export const kinds = [
  'architecture-principle',
  'technical-principle',
  'reference-architecture',
  'guide',
] as const;
export const kindLabels = {
  'architecture-principle': 'Arkitekturprincip',
  'technical-principle': 'Teknisk princip',
  'reference-architecture': 'Referensarkitektur',
  guide: 'Vägledning',
};
// An ID starts with the prefix of its kind, so that it says what the artifact is.
export const idPrefixes: Record<(typeof kinds)[number], string> = {
  'architecture-principle': 'AP',
  'technical-principle': 'TP',
  'reference-architecture': 'RA',
  guide: 'VL',
};
export const bindings = ['binding', 'recommended', 'guidance'] as const;
export const bindingLabels = {
  binding: 'Bindande',
  recommended: 'Rekommenderad',
  guidance: 'Vägledande',
};
export const relationTypes = [
  'concretizes',
  'motivated-by',
  'replaces',
  'leads-to',
  'uses',
] as const;
export const relationLabels = {
  concretizes: 'Konkretiserar',
  'motivated-by': 'Motiveras av',
  replaces: 'Ersätter',
  'leads-to': 'Leder till',
  uses: 'Använder',
};
// What each free-text field means to a reader depends on the artifact type.
const ruleFields = {
  statement: 'Princip',
  rationale: 'Varför',
  scope: 'Gäller för',
  consequences: 'Det innebär',
};
export const fieldLabels: Record<
  (typeof kinds)[number],
  { statement: string; rationale: string; scope: string; consequences: string }
> = {
  'architecture-principle': ruleFields,
  'technical-principle': ruleFields,
  'reference-architecture': {
    statement: 'Lösning',
    rationale: 'Varför',
    scope: 'När mönstret passar',
    consequences: 'Du ansvarar för',
  },
  guide: {
    statement: 'Kort svar',
    rationale: 'Innan du börjar',
    scope: 'Gäller för',
    consequences: 'Gör så här',
  },
};

// A flow is one line: "Från [zon] -> Till [zon]: vad som skickas".
export type FlowNode = { name: string; zone: string };
export type Flow = { from: FlowNode; to: FlowNode; label: string };
const flowPattern =
  /^(.+?) \[([a-z0-9-]+)\] -> (.+?) \[([a-z0-9-]+)\](?:: (.+))?$/;
export function parseFlows(value: string): {
  flows: Flow[];
  errors: string[];
} {
  const flows: Flow[] = [];
  const errors: string[] = [];
  for (const line of value.split('\n').map(l => l.trim())) {
    if (!line) continue;
    const m = flowPattern.exec(line);
    if (m)
      flows.push({
        from: { name: m[1].trim(), zone: m[2] },
        to: { name: m[3].trim(), zone: m[4] },
        label: m[5]?.trim() ?? '',
      });
    else errors.push(`Ogiltigt flöde: ${line}`);
  }
  return { flows, errors };
}
// The environment is drawn from the catalog. A zone, a segment, a site and an external connection
// are known by their name there; `ref` leads to the entity.
export type Zone = {
  id: string;
  ref: string;
  name: string;
  domain: string;
  description: string;
  acceptsFrom: string[];
};
// A network of its own within a zone, in the stages and at the sites listed.
export type Segment = {
  id: string;
  ref: string;
  name: string;
  zone: string;
  stages: string[];
  sites: string[];
  description: string;
};
export type Site = {
  id: string;
  ref: string;
  name: string;
  type: string;
  owner: string;
  description: string;
};
export type Stage = {
  id: string;
  name: string;
  purpose: string;
  data: string;
  sites: string[];
};
export const blockCategoryLabels = {
  'building-block': 'Byggstenar',
  infrastructure: 'Infrastrukturtjänster',
  'shared-service': 'Gemensamma tjänster',
  'business-system': 'Verksamhetssystem',
};
// A service or system of the environment. The patterns of the guide use the building blocks.
// It is known by its catalog reference, so `id` and `ref` say the same.
export type BuildingBlock = {
  id: string;
  ref: string;
  name: string;
  zone: string;
  segment: string;
  owner: string;
  purpose: string;
  interfaces: string;
  category: keyof typeof blockCategoryLabels;
  // The services and systems it is built on.
  uses?: string[];
};
export type ExternalConnection = {
  id: string;
  ref: string;
  name: string;
  zone: string;
  through: string[];
  purpose: string;
  connection: string;
  owner: string;
};
// A part of the environment description that says how a platform works, and which services it is about.
export type PlatformSection = {
  id: string;
  title: string;
  text: string;
  blocks: string[];
};
export type Environment = {
  note: string;
  sites: Site[];
  stages: Stage[];
  zones: Zone[];
  segments: Segment[];
  blocks: BuildingBlock[];
  externals: ExternalConnection[];
  terms: { term: string; meaning: string }[];
  platforms: { intro: string; sections: PlatformSection[] };
  // What the catalog says that does not hold together, and is therefore left out.
  problems: string[];
  // Components of the catalog that do not say which segment they stand in.
  unplaced: { ref: string; name: string }[];
};
// What the catalog does not hold: the text of the environment description, and its stages.
export type Described = Pick<
  Environment,
  'note' | 'stages' | 'terms' | 'platforms'
>;

// How the catalog describes the environment. A Component says its segment and is then drawn;
// zones, segments, sites and external connections are Resources of the types below.
// What the environment description generates stands in a namespace of its own, apart from
// the organisation's systems; a reference without a namespace is read as one of its own.
export const environmentNamespace = 'it-miljo';
export const environmentAnnotation = (key: string) =>
  `architecture.portal/${key}`;
export const environmentTypes = {
  zone: 'network-zone',
  segment: 'network-segment',
  site: 'site',
  external: 'external-service',
};
export type CatalogEntity = {
  kind: string;
  metadata: {
    name: string;
    namespace?: string;
    title?: string;
    description?: string;
    annotations?: Record<string, string>;
  };
  spec?: Record<string, unknown>;
};
const lower = (value: string) => value.toLocaleLowerCase('en-US');
const refOf = (e: CatalogEntity) =>
  lower(`${e.kind}:${e.metadata.namespace ?? 'default'}/${e.metadata.name}`);
// A reference as the catalog reads it: what it leaves out is filled in.
function toRef(value: string, kind: string, namespace: string) {
  const m = /^(?:([^:/]+):)?(?:([^:/]+)\/)?([^:/]+)$/.exec(value.trim());
  return m ? lower(`${m[1] ?? kind}:${m[2] ?? namespace}/${m[3]}`) : '';
}
const listed = (value: string) =>
  value
    .split(',')
    .map(part => part.trim())
    .filter(Boolean);

/**
 * The environment as the catalog describes it. What does not hold together is left out and
 * named in `problems`, so that one faulty entity does not take the page with it.
 */
export function fromCatalog(
  entities: CatalogEntity[],
  described: Described,
): Environment {
  const problems: string[] = [];
  const note = (e: CatalogEntity, key: string) =>
    e.metadata.annotations?.[environmentAnnotation(key)]?.trim() ?? '';
  const name = (e: CatalogEntity) => e.metadata.title ?? e.metadata.name;
  const label = (e: CatalogEntity) => `${name(e)} (${refOf(e)})`;
  const of = (kind: string) => entities.filter(e => lower(e.kind) === kind);
  const groups = new Map(of('group').map(e => [refOf(e), name(e)]));
  const owner = (e: CatalogEntity) => {
    const ref = toRef(
      String(e.spec?.owner ?? ''),
      'group',
      e.metadata.namespace ?? 'default',
    );
    return groups.get(ref) ?? ref.split('/').pop() ?? '';
  };
  const position = (e: CatalogEntity) => {
    const n = Number(note(e, 'order') || NaN);
    return Number.isNaN(n) ? Number.MAX_SAFE_INTEGER : n;
  };
  const sorted = (items: CatalogEntity[]) =>
    [...items].sort(
      (a, b) =>
        position(a) - position(b) ||
        name(a).localeCompare(name(b), 'sv') ||
        refOf(a).localeCompare(refOf(b)),
    );

  // The page knows a zone, a segment, a site and an external connection by name alone.
  const taken = new Map<string, string>();
  const resources = (type: string) =>
    sorted(of('resource').filter(e => e.spec?.type === type)).filter(e => {
      const other = taken.get(e.metadata.name);
      if (other)
        problems.push(`${label(e)}: namnet används redan av ${other}.`);
      else taken.set(e.metadata.name, refOf(e));
      return !other;
    });
  const base = (e: CatalogEntity) => ({
    id: e.metadata.name,
    ref: refOf(e),
    name: name(e),
  });
  const text = (e: CatalogEntity) => e.metadata.description ?? '';

  const sites: Site[] = resources(environmentTypes.site).map(e => ({
    ...base(e),
    type: note(e, 'site-type'),
    owner: owner(e),
    description: text(e),
  }));
  const zoneEntities = resources(environmentTypes.zone);
  const zoneIds = new Set(zoneEntities.map(e => e.metadata.name));
  const zones: Zone[] = zoneEntities.map(e => {
    if (!note(e, 'domain'))
      problems.push(
        `${label(e)}: saknar domän (${environmentAnnotation('domain')}).`,
      );
    return {
      ...base(e),
      domain: note(e, 'domain') || 'Utan domän',
      description: text(e),
      acceptsFrom: listed(note(e, 'accepts-from')).filter(from => {
        if (!zoneIds.has(from))
          problems.push(
            `${label(
              e,
            )}: tar emot från zonen ${from}, som inte finns i katalogen.`,
          );
        return zoneIds.has(from);
      }),
    };
  });
  const known = (e: CatalogEntity, zone: string) => {
    if (!zoneIds.has(zone))
      problems.push(
        zone
          ? `${label(e)}: zonen ${zone} finns inte i katalogen.`
          : `${label(e)}: säger inte vilken zon (${environmentAnnotation(
              'zone',
            )}).`,
      );
    return zoneIds.has(zone);
  };
  const siteIds = new Set(sites.map(s => s.id));
  const segments: Segment[] = resources(environmentTypes.segment)
    .filter(e => known(e, note(e, 'zone')))
    .map(e => ({
      ...base(e),
      zone: note(e, 'zone'),
      stages: listed(note(e, 'stages')),
      sites: listed(note(e, 'sites')).filter(site => {
        if (!siteIds.has(site))
          problems.push(`${label(e)}: platsen ${site} finns inte i katalogen.`);
        return siteIds.has(site);
      }),
      description: text(e),
    }));
  const segmentZone = new Map(segments.map(s => [s.id, s.zone]));

  const categories = Object.keys(blockCategoryLabels);
  const unplaced: Environment['unplaced'] = [];
  const placed = of('component').filter(e => {
    const segment = note(e, 'segment');
    if (!segment) unplaced.push({ ref: refOf(e), name: name(e) });
    else if (!segmentZone.has(segment))
      problems.push(
        `${label(e)}: segmentet ${segment} finns inte i katalogen.`,
      );
    return segmentZone.has(segment);
  });
  unplaced.sort((a, b) => a.name.localeCompare(b.name, 'sv'));
  const placedRefs = new Set(placed.map(refOf));
  const blocks: BuildingBlock[] = sorted(placed).map(e => {
    const ref = refOf(e);
    const category = note(e, 'category') || 'business-system';
    if (!categories.includes(category))
      problems.push(
        `${label(e)}: kategorin ${category} finns inte. Välj ${categories.join(
          ', ',
        )}.`,
      );
    const depends = Array.isArray(e.spec?.dependsOn) ? e.spec.dependsOn : [];
    return {
      id: ref,
      ref,
      name: name(e),
      zone: segmentZone.get(note(e, 'segment'))!,
      segment: note(e, 'segment'),
      owner: owner(e),
      purpose: text(e),
      interfaces: note(e, 'interfaces'),
      category: (categories.includes(category)
        ? category
        : 'business-system') as BuildingBlock['category'],
      uses: depends
        .map(d =>
          toRef(String(d), 'component', e.metadata.namespace ?? 'default'),
        )
        .filter(used => used !== ref && placedRefs.has(used)),
    };
  });

  const externals: ExternalConnection[] = resources(environmentTypes.external)
    .filter(e => known(e, note(e, 'zone')))
    .map(e => ({
      ...base(e),
      zone: note(e, 'zone'),
      // A name alone is a segment. A service is named by its reference.
      through: listed(note(e, 'through'))
        .map(t =>
          segmentZone.has(t) ? t : toRef(t, 'component', environmentNamespace),
        )
        .filter(t => {
          const found = segmentZone.has(t) || placedRefs.has(t);
          if (!found)
            problems.push(
              `${label(e)}: ansluts genom ${t}, som inte finns på kartan.`,
            );
          return found;
        }),
      purpose: text(e),
      connection: note(e, 'connection'),
      owner: owner(e),
    }));

  const sections = described.platforms.sections.map(section => ({
    ...section,
    blocks: section.blocks
      .map(b => toRef(b, 'component', environmentNamespace))
      .filter(b => {
        if (!placedRefs.has(b))
          problems.push(
            `Avsnittet ${section.title} beskriver ${b}, som inte finns på kartan.`,
          );
        return placedRefs.has(b);
      }),
  }));
  return {
    ...described,
    platforms: { ...described.platforms, sections },
    sites,
    zones,
    segments,
    blocks,
    externals,
    problems,
    unplaced,
  };
}
// Flows that open a connection across a zone boundary the zone model does not allow.
export function flowViolations(flows: Flow[], zones: Zone[]): string[] {
  const byId = new Map(zones.map(entry => [entry.id, entry]));
  return flows.flatMap(f => {
    for (const zone of [f.from.zone, f.to.zone])
      if (!byId.has(zone)) return [`Okänd zon: ${zone}`];
    return f.from.zone === f.to.zone ||
      byId.get(f.to.zone)!.acceptsFrom.includes(f.from.zone)
      ? []
      : [
          `${byId.get(f.to.zone)!.name} tar inte emot anslutningar från ${
            byId.get(f.from.zone)!.name
          } (${f.from.name} → ${f.to.name})`,
        ];
  });
}
const text = z.string().trim().max(20000);
const required = text.min(1);
const id = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(
    /^[\p{L}\p{N}][\p{L}\p{N}._-]*$/u,
    'Använd bokstäver, siffror, punkt, bindestreck eller understreck',
  );
const entityRef = z.string().regex(/^[a-z]+:[a-z0-9_.-]+\/[a-z0-9_.-]+$/);
// A requirement is what a rule is assessed against. How it is checked is the
// assessor's matter, so the method is optional and the control descriptions
// live in the validation package, not in the registry.
export const requirementMethods = ['manual', 'automatic', 'combined'] as const;
export const requirementSchema = z
  .object({
    id,
    title: required,
    statement: required,
    scope: required,
    criteria: required,
    method: z.enum(requirementMethods).optional(),
  })
  .strict();
export const artifactSchema = z
  .object({
    id,
    kind: z.enum(kinds),
    title: required,
    binding: z.enum(bindings),
    statement: required,
    rationale: text,
    scope: required,
    consequences: text,
    owner: z.union([
      z.literal(''),
      entityRef.refine(
        v => /^(group|user):/.test(v),
        'Ägaren måste vara en användare eller grupp',
      ),
    ]),
    source: text.default(''),
    externalReferences: text,
    relations: z
      .array(
        z
          .object({
            type: z.enum(relationTypes),
            target: required.max(200),
            note: text.max(1000).optional(),
          })
          .strict(),
      )
      .max(200),
    requirements: z.array(requirementSchema).max(100),
    topic: text.max(100).default(''),
    flows: text.default(''),
  })
  .strict()
  .superRefine((a, ctx) => {
    const error = (message: string) =>
      ctx.addIssue({ code: 'custom', message });
    if (a.kind === 'architecture-principle' && a.binding !== 'binding')
      error('Arkitekturprinciper har bindningsgrad bindande');
    if (
      a.kind === 'guide' &&
      (a.binding !== 'guidance' || a.requirements.length)
    )
      error('Vägledningar är vägledande och får inte införa krav');
    if (a.kind === 'technical-principle' && a.binding === 'guidance')
      error('Tekniska principer är bindande eller rekommenderade');
    // A binding rule without requirements is itself the requirement, as a
    // decision of a protocol or a platform is.
    const ids = a.requirements.map(r => r.id);
    if (new Set(ids).size !== ids.length)
      error('Krav-ID:n måste vara unika inom artefakten');
    for (const message of parseFlows(a.flows).errors) error(message);
    for (const r of a.relations) {
      if (r.target === a.id && r.type !== 'replaces')
        error('En artefakt får inte relatera till sig själv');
      if (r.type === 'concretizes' && a.kind !== 'technical-principle')
        error('Endast tekniska principer konkretiserar arkitekturprinciper');
      if (r.type === 'uses' && !entityRef.safeParse(r.target).success)
        error('Använder kräver en fullständig katalogreferens');
      if (r.type === 'leads-to' && a.kind !== 'guide')
        error('Leder till används av vägledningar');
    }
  });
export type ArtifactInput = z.infer<typeof artifactSchema>;
export type Requirement = z.infer<typeof requirementSchema>;
// The registry holds one content per artifact, read from the content repository.
// Everything in it is a proposal: there are no versions and no decisions until
// the way of working is settled. Where the content came from: the file, and the
// state of the repository it was read from (a commit, or a checksum of the files).
export type Provenance = {
  path: string;
  etag: string;
  // The file in the content repository, when the configuration says where it is browsed.
  url?: string;
};
export type Artifact = ArtifactInput & { provenance?: Provenance };
export type ArtifactView = Artifact & { completionNeeds: string[] };
// An artifact that another one replaces is shown as replaced.
export function replacedBy<T extends ArtifactInput>(
  artifactId: string,
  artifacts: T[],
): T | undefined {
  return artifacts.find(
    t =>
      t.id !== artifactId &&
      t.relations.some(r => r.type === 'replaces' && r.target === artifactId),
  );
}
// The governance that builds on a service, each with what the service does there.
export function governanceFor<T extends ArtifactInput>(
  ref: string,
  artifacts: T[],
): { artifact: T; role: string }[] {
  return artifacts
    .filter(a => !replacedBy(a.id, artifacts))
    .flatMap(a =>
      a.relations
        .filter(r => r.type === 'uses' && r.target === ref)
        .slice(0, 1)
        .map(r => ({ artifact: a, role: r.note ?? '' })),
    );
}
// The patterns whose flows pass a zone.
export function flowsThrough<T extends ArtifactInput>(
  zoneId: string,
  artifacts: T[],
): T[] {
  return artifacts.filter(
    a =>
      !replacedBy(a.id, artifacts) &&
      parseFlows(a.flows).flows.some(
        f => f.from.zone === zoneId || f.to.zone === zoneId,
      ),
  );
}
export function completionNeeds(
  a: ArtifactInput,
  artifacts: ArtifactInput[],
): string[] {
  const needs: string[] = [];
  for (const [key, label] of Object.entries({
    owner: 'Innehållsägare',
    rationale: 'Motiv',
    consequences: 'Konsekvenser / tillämpningsanvisning',
  })) {
    if (!a[key as keyof ArtifactInput]) needs.push(label);
  }
  if (
    a.kind === 'architecture-principle' &&
    !a.requirements.length &&
    !artifacts.some(t =>
      t.relations.some(r => r.type === 'concretizes' && r.target === a.id),
    )
  )
    needs.push('Konkretiserande regel');
  if (
    a.kind === 'guide' &&
    !a.relations.some(r => ['leads-to', 'motivated-by'].includes(r.type))
  )
    needs.push('Regel eller mönster som vägledningen bygger på');
  for (const r of a.relations) {
    if (
      ['concretizes', 'replaces', 'leads-to'].includes(r.type) &&
      !artifacts.some(t => t.id === r.target)
    )
      needs.push(`Saknad relaterad artefakt: ${r.target}`);
  }
  return needs;
}
export function emptyArtifact(): ArtifactInput {
  return {
    id: '',
    kind: 'technical-principle',
    title: '',
    binding: 'recommended',
    statement: '',
    rationale: '',
    scope: '',
    consequences: '',
    owner: '',
    source: '',
    externalReferences: '',
    relations: [],
    requirements: [],
    topic: '',
    flows: '',
  };
}
// What the signed-in reader may do. canAsk is set when the assistant is configured.
export type Access = { actor: string; canAsk?: boolean };
// Reading the governance. The permission policy of the Backstage instance decides who may.
export const architectureReadPermission = createPermission({
  name: 'architecture.read',
  attributes: { action: 'read' },
});
export const architecturePermissions = [architectureReadPermission];
// What the assistant found for a question. The language model chooses the items and
// writes the summary; the alternatives, blocks and basis follow from the registry.
export type AssistantAnswer = {
  // False when the question is not about building or changing an IT solution.
  inScope: boolean;
  summary: string;
  items: { id: string; why: string }[];
  // What the model chose from the index but took out when it read the posts themselves.
  others: { id: string; why: string }[];
  // Patterns that a chosen guide leads to, with the condition the guide gives.
  alternatives: { id: string; from: string; when: string }[];
  // Catalog references of the building blocks the chosen items use.
  blocks: string[];
  // The binding rules and principles the chosen items build on.
  basis: string[];
};

// ---- The files of the content repository ----
// One YAML file per artifact, where the labelled parts of a text are keys of
// their own, relations are keyed by type and flows are structured. The file is
// composed into the registry's shape here.
const optionalText = text.optional();
const target = required.max(200);
const note = text.max(1000).optional();
// A relation that may carry a note: the role of a building block, or when a choice applies.
const used = z.union([target, z.object({ target, role: note }).strict()]);
const chosen = z.union([target, z.object({ target, when: note }).strict()]);
const targets = z.array(required.max(200)).optional();
const owner = artifactSchema.innerType().shape.owner.optional();
const fileCommon = {
  id,
  title: required,
  topic: text.max(100).optional(),
  owner,
  // A reference to something outside the repository, such as a standard. The file is the original.
  source: optionalText,
  externalReferences: z.array(text).optional(),
};
const ruleFile = z
  .object({
    ...fileCommon,
    kind: z.enum(['architecture-principle', 'technical-principle']),
    binding: z.enum(['binding', 'recommended']).optional(),
    statement: required,
    rationale: optionalText,
    scope: required,
    consequences: optionalText,
    preconditions: optionalText,
    solutions: optionalText,
    sections: z
      .array(z.object({ title: required, text: required }).strict())
      .optional(),
    notCovered: optionalText,
    howTo: optionalText,
    ifNotMet: optionalText,
    concretizes: targets,
    motivatedBy: targets,
    replaces: targets,
    requirements: z
      .array(
        z
          .object({
            id,
            title: required,
            statement: required,
            scope: required,
            criteria: required,
            notEnough: optionalText,
            limits: optionalText,
            method: z.enum(requirementMethods).optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();
const patternFile = z
  .object({
    ...fileCommon,
    kind: z.literal('reference-architecture'),
    solution: required,
    rationale: optionalText,
    fits: required,
    responsibilities: optionalText,
    variants: optionalText,
    flows: z
      .array(
        z
          .object({
            from: z.object({ name: required, zone: required }).strict(),
            to: z.object({ name: required, zone: required }).strict(),
            label: optionalText,
          })
          .strict(),
      )
      .optional(),
    uses: z.array(used).optional(),
    motivatedBy: targets,
  })
  .strict();
const guideFile = z
  .object({
    ...fileCommon,
    kind: z.literal('guide'),
    answer: required,
    before: optionalText,
    scope: required,
    steps: optionalText,
    leadsTo: z.array(chosen).optional(),
    motivatedBy: targets,
    uses: z.array(used).optional(),
  })
  .strict();
export const artifactFileSchema = z.union([ruleFile, patternFile, guideFile]);
export type ArtifactFile = z.infer<typeof artifactFileSchema>;
// The labelled parts a text ends with, in the order the registry shows them. The
// sections an artifact has of its own come after the solutions.
const textParts: [string, string][] = [
  ['Möjliga förutsättningar', 'preconditions'],
  ['Möjliga lösningar', 'solutions'],
  ['Täcks inte av regler ännu', 'notCovered'],
  ['Så följer du regeln', 'howTo'],
  ['Om ni inte når dit', 'ifNotMet'],
  ['Varianter', 'variants'],
];
const criteriaParts: [string, string][] = [
  ['Räcker inte', 'notEnough'],
  ['Avgränsning', 'limits'],
];
// A labelled part starts a paragraph; a list starts on its own line.
function compose(base: string, labelled: [string, string][]): string {
  let result = base;
  for (const [label, value] of labelled)
    result = `${result}${result ? '\n\n' : ''}${label}:${
      value.startsWith('- ') ? '\n' : ' '
    }${value}`;
  return result;
}
const defaultBinding = {
  'architecture-principle': 'binding',
  'technical-principle': 'recommended',
  'reference-architecture': 'recommended',
  guide: 'guidance',
} as const;
/** The registry's shape of an artifact file, validated as the registry validates everything. */
export function fromFile(file: unknown): ArtifactInput {
  const f = artifactFileSchema.parse(file);
  const relation = (
    type: (typeof relationTypes)[number],
    items: (string | { target: string; role?: string; when?: string })[] = [],
  ) =>
    items.map(t =>
      typeof t === 'string'
        ? { type, target: t }
        : { type, target: t.target, note: t.role ?? t.when },
    );
  const pick = (
    source: Record<string, unknown>,
    parts: [string, string][],
  ): [string, string][] =>
    parts
      .filter(([, key]) => typeof source[key] === 'string')
      .map(([label, key]) => [label, source[key] as string]);
  let fields: Pick<
    ArtifactInput,
    'statement' | 'rationale' | 'scope' | 'consequences' | 'relations'
  > & { flows?: string; requirements?: ArtifactInput['requirements'] };
  if (f.kind === 'reference-architecture')
    fields = {
      statement: f.solution,
      rationale: f.rationale ?? '',
      scope: f.fits,
      consequences: compose(
        f.responsibilities ?? '',
        pick({ variants: f.variants }, textParts),
      ),
      flows: (f.flows ?? [])
        .map(
          x =>
            `${x.from.name} [${x.from.zone}] -> ${x.to.name} [${x.to.zone}]${
              x.label ? `: ${x.label}` : ''
            }`,
        )
        .join('\n'),
      relations: [
        ...relation('uses', f.uses),
        ...relation('motivated-by', f.motivatedBy),
      ],
    };
  else if (f.kind === 'guide')
    fields = {
      statement: f.answer,
      rationale: f.before ?? '',
      scope: f.scope,
      consequences: f.steps ?? '',
      relations: [
        ...relation('leads-to', f.leadsTo),
        ...relation('uses', f.uses),
        ...relation('motivated-by', f.motivatedBy),
      ],
    };
  else
    fields = {
      statement: f.statement,
      rationale: f.rationale ?? '',
      scope: f.scope,
      consequences: compose(f.consequences ?? '', [
        ...pick(f, textParts.slice(0, 2)),
        ...(f.sections ?? []).map((sec): [string, string] => [
          sec.title,
          sec.text,
        ]),
        ...pick(f, textParts.slice(2)),
      ]),
      relations: [
        ...relation('concretizes', f.concretizes),
        ...relation('replaces', f.replaces),
        ...relation('motivated-by', f.motivatedBy),
      ],
      requirements: (f.requirements ?? []).map(r => ({
        id: r.id,
        title: r.title,
        statement: r.statement,
        scope: r.scope,
        criteria: compose(r.criteria, pick(r, criteriaParts)),
        ...(r.method ? { method: r.method } : {}),
      })),
    };
  return artifactSchema.parse({
    id: f.id,
    kind: f.kind,
    title: f.title,
    binding: ('binding' in f && f.binding) || defaultBinding[f.kind],
    statement: fields.statement,
    rationale: fields.rationale,
    scope: fields.scope,
    consequences: fields.consequences,
    owner: f.owner ?? '',
    source: f.source ?? '',
    externalReferences: (f.externalReferences ?? []).join('\n'),
    relations: fields.relations,
    requirements: fields.requirements ?? [],
    topic: f.topic ?? '',
    flows: fields.flows ?? '',
  });
}

// ---- The content repository as a whole ----
// Everything the portal reads, and every rule it is checked against, in one
// place: the backend applies them when it reads the repository, and the check
// applies them in the repository's own CI.
export const contentLayout = {
  artifacts: 'styrning',
  described: 'it-miljo/beskrivning.yaml',
  catalog: 'it-miljo/katalog.yaml',
  directories: {
    'architecture-principle': 'arkitekturprinciper',
    'technical-principle': 'tekniska-principer',
    'reference-architecture': 'referensarkitekturer',
    guide: 'vagledningar',
  } as Record<(typeof kinds)[number], string>,
};
export const describedSchema: z.ZodType<Described> = z
  .object({
    note: z.string(),
    stages: z.array(
      z
        .object({
          id: z.string(),
          name: z.string(),
          purpose: z.string(),
          data: z.string(),
          sites: z.array(z.string()),
        })
        .strict(),
    ),
    terms: z.array(
      z.object({ term: z.string(), meaning: z.string() }).strict(),
    ),
    platforms: z
      .object({
        intro: z.string(),
        sections: z.array(
          z
            .object({
              id: z.string(),
              title: z.string(),
              text: z.string(),
              blocks: z.array(z.string()),
            })
            .strict(),
        ),
      })
      .strict(),
  })
  .strict();
export type ContentFile = { path: string; text: string };
export type CheckedContent = {
  artifacts: Artifact[];
  described?: Described;
  // What breaks the definition, one line each. Empty when the content may be shown.
  problems: string[];
};
// The glossary (ordlista.md) says which words the texts avoid.
const avoidedWords = ['repository', 'byggflöde', 'stackspår', 'evidens'];
const mentionedId = /\b(?:AP|TP|RA|VL)-[A-ZÅÄÖ]+(?:-[A-ZÅÄÖ]+)?-\d+\b(?!-K)/g;
const issues = (e: z.ZodError) =>
  e.issues.map(i => `${i.path.join('.') || 'filen'}: ${i.message}`).join('; ');
/**
 * Reads and checks the content repository: the artifact files under styrning/,
 * the environment description, and, when the catalog file is given, the
 * environment the flows and building blocks are checked against.
 */
export function checkContent(
  files: ContentFile[],
  options: {
    catalog?: CatalogEntity[];
    etag?: string;
    browseUrl?: string;
  } = {},
): CheckedContent {
  const problems: string[] = [];
  const say = (path: string, what: string) => problems.push(`${path}: ${what}`);
  const yaml = (file: ContentFile): unknown => {
    try {
      return parseYaml(file.text);
    } catch (e) {
      say(file.path, `går inte att läsa som YAML: ${(e as Error).message}`);
      return undefined;
    }
  };
  // The environment description.
  let described: Described | undefined;
  const describedFile = files.find(f => f.path === contentLayout.described);
  if (!describedFile) say(contentLayout.described, 'saknas');
  else {
    const parsed = describedSchema.safeParse(yaml(describedFile));
    if (parsed.success) described = parsed.data;
    else say(describedFile.path, issues(parsed.error));
  }
  // The artifacts: one per file, named after its ID, in the directory of its kind.
  const artifacts: Artifact[] = [];
  const seen = new Map<string, string>();
  const prefix = `${contentLayout.artifacts}/`;
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    if (!file.path.startsWith(prefix) || !/\.ya?ml$/.test(file.path)) continue;
    const data = yaml(file);
    if (data === undefined) continue;
    let artifact: ArtifactInput;
    try {
      artifact = fromFile(data);
    } catch (e) {
      say(
        file.path,
        e instanceof z.ZodError ? issues(e) : (e as Error).message,
      );
      continue;
    }
    const expected = `${prefix}${contentLayout.directories[artifact.kind]}/${
      artifact.id
    }.yaml`;
    if (file.path !== expected)
      say(
        file.path,
        `en ${kindLabels[artifact.kind].toLocaleLowerCase('sv')} med ID ${
          artifact.id
        } ska heta ${expected}`,
      );
    if (!artifact.id.startsWith(`${idPrefixes[artifact.kind]}-`))
      say(
        file.path,
        `ID för ${kindLabels[artifact.kind].toLocaleLowerCase(
          'sv',
        )} ska börja med ${idPrefixes[artifact.kind]}-`,
      );
    const other = seen.get(artifact.id);
    if (other) say(file.path, `ID ${artifact.id} används redan i ${other}`);
    seen.set(artifact.id, file.path);
    const provenance: Provenance = {
      path: file.path,
      etag: options.etag ?? '',
      ...(options.browseUrl
        ? { url: options.browseUrl.replace('{path}', file.path) }
        : {}),
    };
    artifacts.push({ ...artifact, provenance });
  }
  // What the artifacts refer to must exist.
  const ids = new Set(artifacts.map(a => a.id));
  const environment =
    options.catalog && described
      ? fromCatalog(options.catalog, described)
      : undefined;
  const blocks = new Map(environment?.blocks.map(b => [b.ref, b]) ?? []);
  const byName = new Map(environment?.blocks.map(b => [b.name, b]) ?? []);
  for (const a of artifacts) {
    const path = a.provenance!.path;
    for (const r of a.relations) {
      if (r.type === 'uses') {
        if (environment && !blocks.has(r.target))
          say(path, `använder ${r.target}, som inte finns på kartan`);
      } else if (!ids.has(r.target))
        say(
          path,
          `${relationLabels[r.type].toLocaleLowerCase('sv')} ${
            r.target
          }, som inte finns`,
        );
    }
    // What the artifact says, apart from where it points: the relations are checked above.
    const said = JSON.stringify({
      title: a.title,
      statement: a.statement,
      rationale: a.rationale,
      scope: a.scope,
      consequences: a.consequences,
      topic: a.topic,
      flows: a.flows,
      requirements: a.requirements,
      notes: a.relations.map(r => r.note ?? ''),
    });
    for (const mentioned of new Set(said.match(mentionedId) ?? []))
      if (!ids.has(mentioned)) say(path, `nämner ${mentioned}, som inte finns`);
    const lowered = said.toLocaleLowerCase('sv');
    for (const word of avoidedWords)
      if (lowered.includes(word))
        say(path, `använder ordet "${word}", som ordlistan avråder från`);
    if (environment) {
      const { flows } = parseFlows(a.flows);
      for (const violation of flowViolations(flows, environment.zones))
        say(path, violation);
      const usedRefs = new Set(
        a.relations.filter(r => r.type === 'uses').map(r => r.target),
      );
      for (const f of flows)
        for (const node of [f.from, f.to]) {
          const block = byName.get(node.name);
          if (!block) continue;
          if (block.zone !== node.zone)
            say(
              path,
              `${node.name} står i zonen ${block.zone}, inte ${node.zone}`,
            );
          if (!usedRefs.has(block.ref))
            say(
              path,
              `${node.name} finns i flödet men inte bland byggstenarna`,
            );
        }
    }
  }
  if (environment)
    for (const problem of environment.problems)
      say(contentLayout.catalog, problem);
  return { artifacts, described, problems };
}
