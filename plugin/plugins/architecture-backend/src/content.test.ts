import { mkdtemp, writeFile, cp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  flowViolations,
  idPrefixes,
  kinds,
  parseFlows,
  replacedBy,
} from '@myndigheten/backstage-plugin-architecture-common';
import { directoryReader, loadContent, urlReader } from './content';
import { ContentStore } from './store';
import { checkDirectory } from './check';
import {
  catalogEnvironment,
  contentDir,
  labCatalog,
  readContent,
} from './__testUtils__/content';
import { NotModifiedError } from '@backstage/errors';
import { UrlReaderService } from '@backstage/backend-plugin-api';

describe('what the content holds', () => {
  it('reads one content per artifact, with where each came from', async () => {
    const { artifacts, etag } = await readContent();
    expect(artifacts).toHaveLength(86);
    const count = (kind: string) =>
      artifacts.filter(a => a.kind === kind).length;
    expect(kinds.map(count)).toEqual([5, 43, 20, 18]);
    for (const a of artifacts) {
      expect(a.provenance).toEqual({
        path: `styrning/${
          {
            'architecture-principle': 'arkitekturprinciper',
            'technical-principle': 'tekniska-principer',
            'reference-architecture': 'referensarkitekturer',
            guide: 'vagledningar',
          }[a.kind]
        }/${a.id}.yaml`,
        etag,
      });
      // There is no version, status, decision or timestamp to read.
      for (const removed of ['version', 'status', 'updatedAt', 'updatedBy'])
        expect(a).not.toHaveProperty(removed);
    }
  });
  it('gives every artifact an ID with the prefix of its kind, and no dead references', async () => {
    const store = new ContentStore(directoryReader(contentDir));
    await store.refresh();
    const all = store.list();
    const ids = new Set(all.map(a => a.id));
    const blocks = new Set((await catalogEnvironment()).blocks.map(b => b.ref));
    for (const a of all) {
      expect(a.id.startsWith(`${idPrefixes[a.kind]}-`)).toBe(true);
      for (const r of a.relations)
        expect(
          r.type === 'uses' ? blocks.has(r.target) : ids.has(r.target),
        ).toBe(true);
      expect(
        a.completionNeeds.some(n => n.startsWith('Saknad relaterad')),
      ).toBe(false);
    }
    // The building blocks stand in the environment's namespace, apart from the organisation's systems.
    for (const r of all
      .flatMap(a => a.relations)
      .filter(x => x.type === 'uses'))
      expect(r.target).toMatch(/^component:it-miljo\//);
  });
  it('holds the rules with their requirements, and the principles, patterns and guides without', async () => {
    const store = new ContentStore(directoryReader(contentDir));
    await store.refresh();
    const all = store.list();
    expect(all.flatMap(a => a.requirements)).toHaveLength(43);
    for (const a of all)
      expect(
        a.kind === 'technical-principle' || a.requirements.length === 0,
      ).toBe(true);
    expect(store.get('TP-EXP-01').binding).toBe('binding');
    expect(store.get('TP-TEK-01').binding).toBe('recommended');
    expect(() => store.get('AB-EXP-01')).toThrow('Artefakten finns inte');
    for (const a of all.filter(x => x.kind === 'architecture-principle'))
      expect(a.completionNeeds).not.toContain('Konkretiserande regel');
    expect(store.get('TP-ERJU-SCS-01').requirements).toHaveLength(9);
    // The labelled parts of a text are composed in the registry's order.
    expect(store.get('AP-ERJU-01').consequences).toMatch(/\n\nBegrepp: /);
    expect(store.get('TP-DRI-14').consequences).toMatch(
      /^Möjliga förutsättningar:[\s\S]*\n\nMöjliga lösningar:[\s\S]*\n\nSå följer du regeln:[\s\S]*\n\nOm ni inte når dit: /,
    );
    const requirement = store
      .get('TP-BER-01')
      .requirements.find(r => r.criteria.includes('Räcker inte:'));
    expect(requirement?.criteria).toMatch(/\n\nRäcker inte: /);
  });
  it('lets TP-DRI-14 take over the requirements of the rule it replaces', async () => {
    const { artifacts } = await readContent();
    const get = (id: string) => artifacts.find(a => a.id === id)!;
    const post = get('TP-DRI-14');
    const rule = get('TP-ÅTE-01');
    expect(replacedBy('TP-ÅTE-01', artifacts)?.id).toBe('TP-DRI-14');
    expect(replacedBy('TP-DRI-14', artifacts)).toBeUndefined();
    expect(post.relations).toEqual([
      { type: 'concretizes', target: 'AP-SÄK-04' },
      { type: 'replaces', target: 'TP-ÅTE-01' },
    ]);
    expect(
      post.requirements.map(r =>
        [r.statement, r.criteria].map(v =>
          v.replace(/TP-DRI-14/g, 'TP-ÅTE-01'),
        ),
      ),
    ).toEqual(rule.requirements.map(r => [r.statement, r.criteria]));
  });
  it('gives every guide something to build on and every pattern a flow the zone model allows', async () => {
    const { artifacts } = await readContent();
    const { zones } = await catalogEnvironment();
    for (const a of artifacts) {
      const choices = a.relations.filter(r => r.type === 'leads-to');
      const builds = a.relations.some(r =>
        ['leads-to', 'motivated-by'].includes(r.type),
      );
      expect(a.kind !== 'guide' || builds).toBe(true);
      expect(a.kind === 'guide' || choices.length === 0).toBe(true);
      for (const r of choices) expect(r.note).toBeTruthy();
      const { flows, errors } = parseFlows(a.flows);
      expect(errors).toEqual([]);
      expect(flows.length > 0).toBe(a.kind === 'reference-architecture');
      expect(flowViolations(flows, zones)).toEqual([]);
    }
  });
});

describe('the check', () => {
  it('passes the content as it is, with the environment it describes', async () => {
    expect(
      await checkDirectory(contentDir, { catalogFiles: [labCatalog] }),
    ).toEqual({ artifacts: 86, problems: [] });
    // Without the pilot's catalog the environment still holds together: the pilot adds systems, not services.
    expect((await checkDirectory(contentDir)).problems).toEqual([]);
  });
});

describe('reading the repository', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'architecture-content-'));
    await cp(contentDir, dir, { recursive: true });
  });
  afterEach(() => rm(dir, { recursive: true, force: true }));
  const file = (...parts: string[]) => join(dir, ...parts);
  const edit = async (path: string, change: (text: string) => string) =>
    writeFile(path, change(await readFile(path, 'utf8')));
  it('reads again only when something changed, and keeps what it had when a reading fails', async () => {
    const store = new ContentStore(directoryReader(dir));
    expect(() => store.current).toThrow('Innehållet har inte lästs in än');
    expect(await store.refresh()).toBe(true);
    const before = store.current.etag;
    expect(await store.refresh()).toBe(false);
    const rule = file('styrning/tekniska-principer/TP-BER-01.yaml');
    await edit(rule, t => t.replace('title: ', 'title: Ändrad '));
    expect(await store.refresh()).toBe(true);
    expect(store.current.etag).not.toBe(before);
    expect(store.get('TP-BER-01').title).toMatch(/^Ändrad /);
    // A file that breaks the definition stops the reading; the registry keeps the last content.
    await writeFile(
      rule,
      'id: TP-BER-01\nkind: technical-principle\nstatus: decided\n',
    );
    await expect(store.refresh()).rejects.toThrow('TP-BER-01.yaml');
    await store.tryRefresh();
    expect(store.get('TP-BER-01').title).toMatch(/^Ändrad /);
  });
  it('says what breaks the definition, one line each, with the file it is in', async () => {
    const problems = async () => (await checkDirectory(dir)).problems;
    // A file in the wrong directory, under the wrong name, with a duplicate ID.
    await cp(
      file('styrning/vagledningar/VL-AI-01.yaml'),
      file('styrning/tekniska-principer/VL-KOPIA.yaml'),
    );
    expect(await problems()).toEqual([
      'styrning/tekniska-principer/VL-KOPIA.yaml: en vägledning med ID VL-AI-01 ska heta styrning/vagledningar/VL-AI-01.yaml',
      'styrning/vagledningar/VL-AI-01.yaml: ID VL-AI-01 används redan i styrning/tekniska-principer/VL-KOPIA.yaml',
    ]);
    await rm(file('styrning/tekniska-principer/VL-KOPIA.yaml'));
    // A reference to something that does not exist, in a relation and in running text.
    await edit(file('styrning/vagledningar/VL-AI-01.yaml'), t =>
      t
        .replace('target: RA-AI-01', 'target: RA-AI-99')
        .replace('answer: ', 'answer: Se TP-SAKNAS-01. '),
    );
    expect(await problems()).toEqual([
      'styrning/vagledningar/VL-AI-01.yaml: leder till RA-AI-99, som inte finns',
      'styrning/vagledningar/VL-AI-01.yaml: nämner TP-SAKNAS-01, som inte finns',
    ]);
    await cp(
      join(contentDir, 'styrning/vagledningar/VL-AI-01.yaml'),
      file('styrning/vagledningar/VL-AI-01.yaml'),
    );
    // A flow the zone model does not allow, into a building block that is not in that zone.
    await edit(file('styrning/referensarkitekturer/RA-EXP-02.yaml'), t =>
      t.replace(
        'to: { name: Exponeringsplattform, zone: dmz }',
        'to: { name: Exponeringsplattform, zone: tjanst }',
      ),
    );
    expect(await problems()).toEqual([
      'styrning/referensarkitekturer/RA-EXP-02.yaml: Tjänstezon tar inte emot anslutningar från Internet (Konsument → Exponeringsplattform)',
      'styrning/referensarkitekturer/RA-EXP-02.yaml: Exponeringsplattform står i zonen dmz, inte tjanst',
    ]);
    await cp(
      join(contentDir, 'styrning/referensarkitekturer/RA-EXP-02.yaml'),
      file('styrning/referensarkitekturer/RA-EXP-02.yaml'),
    );
    // A word the glossary avoids.
    await edit(file('styrning/arkitekturprinciper/AP-SÄK-02.yaml'), t =>
      t.replace('rationale: ', 'rationale: Enligt vårt repository. '),
    );
    expect(await problems()).toEqual([
      'styrning/arkitekturprinciper/AP-SÄK-02.yaml: använder ordet "repository", som ordlistan avråder från',
    ]);
    await cp(
      join(contentDir, 'styrning/arkitekturprinciper/AP-SÄK-02.yaml'),
      file('styrning/arkitekturprinciper/AP-SÄK-02.yaml'),
    );
    // A field the definition does not have.
    await edit(
      file('styrning/vagledningar/VL-AI-01.yaml'),
      t => `${t}version: 2\n`,
    );
    expect(await problems()).toEqual([
      "styrning/vagledningar/VL-AI-01.yaml: filen: Unrecognized key(s) in object: 'version'",
    ]);
    await cp(
      join(contentDir, 'styrning/vagledningar/VL-AI-01.yaml'),
      file('styrning/vagledningar/VL-AI-01.yaml'),
    );
    // The environment description is required.
    await rm(file('it-miljo/beskrivning.yaml'));
    expect(await problems()).toEqual(['it-miljo/beskrivning.yaml: saknas']);
  });
  it('links every artifact to its file when the configuration says where the repository is browsed', async () => {
    const store = new ContentStore(directoryReader(dir), {
      browseUrl: 'https://git.example/styrning/blob/main/{path}',
    });
    await store.refresh();
    expect(store.get('VL-AI-01').provenance?.url).toBe(
      'https://git.example/styrning/blob/main/styrning/vagledningar/VL-AI-01.yaml',
    );
  });
  it('reads a tree through the UrlReader, and nothing when the tree is unchanged', async () => {
    const files = (await directoryReader(dir)())!.files;
    const readTree = jest.fn(
      async (_url: string, options?: { etag?: string }) => {
        if (options?.etag === 'commit-1') throw new NotModifiedError();
        return {
          etag: 'commit-1',
          files: async () =>
            files.map(({ path, text }) => ({
              path,
              content: async () => Buffer.from(text),
            })),
          archive: async () => {
            throw new Error('not used');
          },
          dir: async () => {
            throw new Error('not used');
          },
        };
      },
    );
    const reader = { readTree } as unknown as UrlReaderService;
    const store = new ContentStore(
      urlReader(reader, 'https://github.com/org/styrning/tree/main'),
    );
    expect(await store.refresh()).toBe(true);
    expect(store.current.etag).toBe('commit-1');
    expect(store.list()).toHaveLength(86);
    expect(await store.refresh()).toBe(false);
    expect(readTree).toHaveBeenLastCalledWith(
      'https://github.com/org/styrning/tree/main',
      { etag: 'commit-1' },
    );
    expect(() => loadContent({ etag: 'x', files: [] })).toThrow(
      'it-miljo/beskrivning.yaml: saknas',
    );
  });
});
