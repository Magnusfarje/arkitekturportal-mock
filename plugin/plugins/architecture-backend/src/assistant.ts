import { Config } from '@backstage/config';
import { ServiceUnavailableError } from '@backstage/errors';
import {
  ArtifactView,
  AssistantAnswer,
  BuildingBlock,
  fieldLabels,
  replacedBy,
} from '@myndigheten/backstage-plugin-architecture-common';

type Message = { role: 'system' | 'user'; content: string };
// Asks the language model: with a JSON schema when the answer must have a form,
// and with time to think when the answer is worth waiting for.
export type Chat = (
  messages: Message[],
  options?: { format?: object; think?: boolean },
) => Promise<string>;
export type Assistant = (
  question: string,
  artifacts: ArtifactView[],
  blocks: BuildingBlock[],
) => Promise<AssistantAnswer>;

const selectable = ['guide', 'reference-architecture'];
const choose =
  'Du hjälper en utvecklare eller lösningsarkitekt att hitta rätt i en arkitekturguide. ' +
  'Välj de vägledningar (VL) och mönster (RA) som frågan faktiskt berör, ' +
  'och säg i en kort mening varför var och en gäller just den här frågan. Ta inte med en post som inte passar. ' +
  'Handlar frågan inte om att bygga eller ändra en IT-lösning sätter du inom_omradet till false och väljer inga poster.';
const review =
  'Du granskar ett urval ur en arkitekturguide. Avgör för varje post om den gäller frågan. ' +
  'En post gäller bara om frågan beskriver just den situation som posten säger att den är till för. ' +
  'En post som handlar om något närliggande gäller inte.';
const summarize =
  'Du svarar en lösningsarkitekt på svenska. Skriv högst åtta meningar, i löpande text utan rubriker. Använd bara underlaget. ' +
  'Säg vilken post som gäller för vilken del av frågan, och hänvisa med ID inom hakparentes. ' +
  'Blanda inte ihop posterna: skriv bara det som står under respektive ID, och använd en post bara för det den själv säger att den är till för. ' +
  'Täcker ingen post en del av frågan säger du det i sista meningen, i stället för att välja den närmaste.';
const reference = /\[?((?:RA|VL|TP|AP)-\p{Lu}+(?:-\p{Lu}+)?-\d+)\]?/gu;

/**
 * The model chooses among the guides and patterns and writes a short summary.
 * Everything else in the answer is read from the registry, so that what the reader
 * follows is the governance itself and not the model's rendering of it.
 */
export function createAssistant(chat: Chat): Assistant {
  return async (question, artifacts, blocks) => {
    const byId = new Map(artifacts.map(a => [a.id, a]));
    const index = artifacts.filter(
      a => selectable.includes(a.kind) && !replacedBy(a.id, artifacts),
    );
    const lines = index.map(
      a =>
        `${a.id}: ${a.title} – ${(a.kind === 'reference-architecture'
          ? a.scope
          : a.statement
        ).slice(0, 170)}`,
    );
    const chosen: { inom_omradet?: boolean; poster?: unknown } = JSON.parse(
      await chat(
        [
          { role: 'system', content: choose },
          {
            role: 'user',
            content: `Poster:\n${lines.join('\n')}\n\nFråga: ${question}`,
          },
        ],
        // Time to think makes the choice markedly better, and is what the reader waits for.
        {
          think: true,
          format: {
            type: 'object',
            required: ['poster', 'inom_omradet'],
            properties: {
              poster: {
                type: 'array',
                maxItems: 8,
                items: {
                  type: 'object',
                  required: ['id', 'varfor'],
                  properties: {
                    id: { type: 'string', enum: index.map(a => a.id) },
                    varfor: { type: 'string' },
                  },
                },
              },
              inom_omradet: { type: 'boolean' },
            },
          },
        },
      ),
    );
    // The model may only point at what the registry holds, and at each post once.
    const candidates: AssistantAnswer['items'] = [];
    for (const p of Array.isArray(chosen.poster) ? chosen.poster : []) {
      const id = String(p?.id ?? '');
      if (index.some(a => a.id === id) && !candidates.some(i => i.id === id))
        candidates.push({ id, why: String(p?.varfor ?? '').trim() });
    }
    const describe = (a: ArtifactView, used: string[] = []) => {
      const labels = fieldLabels[a.kind];
      return [
        `[${a.id}] ${a.title}`,
        `${labels.statement}: ${a.statement}`,
        `${labels.scope}: ${a.scope}`,
        ...(used.length ? [`Byggstenar: ${used.join(', ')}`] : []),
      ].join('\n');
    };
    // The choice was made from one line per post. With the posts' own text in front of it,
    // the model takes out those that only looked right.
    let items = candidates;
    if (candidates.length > 1) {
      const kept: { poster?: unknown } = JSON.parse(
        await chat(
          [
            { role: 'system', content: review },
            {
              role: 'user',
              content: `Fråga: ${question}\n\nPoster:\n${candidates
                .map(c => describe(byId.get(c.id)!))
                .join('\n\n')}`,
            },
          ],
          {
            format: {
              type: 'object',
              required: ['poster'],
              properties: {
                poster: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id', 'galler'],
                    properties: {
                      id: { type: 'string', enum: candidates.map(c => c.id) },
                      galler: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        ),
      );
      const rejected = new Set(
        (Array.isArray(kept.poster) ? kept.poster : [])
          .filter(p => p?.galler === false)
          .map(p => String(p?.id)),
      );
      // A review that rejects everything says more about the review than about the choice.
      if (rejected.size < candidates.length)
        items = candidates.filter(c => !rejected.has(c.id));
    }
    // What the review took out is still shown, apart from what is answered: the review is strict,
    // and the reader is better served by one post too many than by one too few.
    const others = candidates.filter(c => !items.includes(c));
    // A question that the model found posts for is within the guide, whatever it says about the scope.
    if (!items.length)
      return {
        inScope: Boolean(chosen.inom_omradet),
        summary: '',
        items: [],
        others: [],
        alternatives: [],
        blocks: [],
        basis: [],
      };

    const picked = items.map(i => byId.get(i.id)!);
    const relations = picked.flatMap(a =>
      a.relations.map(r => ({ ...r, from: a.id })),
    );
    const alternatives = relations
      .filter(
        r =>
          r.type === 'leads-to' &&
          byId.get(r.target)?.kind === 'reference-architecture' &&
          !candidates.some(i => i.id === r.target),
      )
      .map(r => ({ id: r.target, from: r.from, when: r.note ?? '' }));
    const known = new Set(blocks.map(b => b.ref));
    const used = Array.from(
      new Set(
        relations
          .filter(r => r.type === 'uses' && known.has(r.target))
          .map(r => r.target),
      ),
    );
    const basis = Array.from(
      new Set(
        relations
          .filter(r => ['motivated-by', 'concretizes'].includes(r.type))
          .map(r => r.target),
      ),
    ).filter(
      id =>
        byId.get(id)?.binding === 'binding' &&
        !candidates.some(i => i.id === id),
    );

    const name = (ref: string) => blocks.find(b => b.ref === ref)?.name ?? ref;
    const material = picked.map(a =>
      describe(
        a,
        a.relations
          .filter(r => r.type === 'uses' && known.has(r.target))
          .map(r => name(r.target)),
      ),
    );
    const rules = basis.map(id => `[${id}] ${byId.get(id)!.title}`);
    const text = await chat([
      { role: 'system', content: summarize },
      {
        role: 'user',
        content: `Underlag:\n${material.join(
          '\n\n',
        )}\n\nBindande regler och principer bakom posterna:\n${rules.join(
          '\n',
        )}\n\nFråga: ${question}`,
      },
    ]);
    // An ID the registry does not hold is taken out, so that the reader never follows a dead reference.
    const summary = text
      .replace(reference, (_, id) => (byId.has(id) ? id : ''))
      .replace(/[ \t]{2,}/g, ' ')
      .trim();
    return {
      inScope: true,
      summary,
      items,
      others,
      alternatives,
      blocks: used,
      basis,
    };
  };
}

/** Ollama on the machine itself or on the network, asked for one whole answer at a time. */
export function ollamaChat(
  baseUrl: string,
  model: string,
  fetchImpl: typeof fetch = fetch,
): Chat {
  const unavailable = () =>
    new ServiceUnavailableError(
      `Språkmodellen svarar inte. Kontrollera att Ollama är igång på ${baseUrl} och att modellen ${model} finns.`,
    );
  return async (messages, { format, think = false } = {}) => {
    const ask = (thinking?: boolean) =>
      fetchImpl(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          format,
          think: thinking,
          stream: false,
          options: { num_ctx: 8192, temperature: 0 },
        }),
        signal: AbortSignal.timeout(300_000),
      }).catch(() => {
        throw unavailable();
      });
    // A model that cannot think refuses the setting, and is then asked without it.
    let response = await ask(think);
    if (response.status === 400) response = await ask();
    if (!response.ok) throw unavailable();
    const data = await response.json();
    return String(data.message?.content ?? '');
  };
}

export function assistantFrom(config: Config): Assistant | undefined {
  const settings = config.getOptionalConfig('architecture.assistant');
  return (
    settings &&
    createAssistant(
      ollamaChat(
        settings.getString('baseUrl').replace(/\/$/, ''),
        settings.getString('model'),
      ),
    )
  );
}
