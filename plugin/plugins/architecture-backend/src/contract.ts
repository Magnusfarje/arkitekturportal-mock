import { zodToJsonSchema } from 'zod-to-json-schema';
import { artifactSchema } from '@myndigheten/backstage-plugin-architecture-common';

const convert = (schema: Parameters<typeof zodToJsonSchema>[0]) =>
  zodToJsonSchema(schema, { target: 'openApi3', $refStrategy: 'none' });
const artifact = convert(artifactSchema);
const readArtifact = { ...artifact, additionalProperties: true };
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema: unknown) => ({ 'application/json': { schema } });
const responses = (schema: unknown, code = '200') => ({
  [code]: { description: 'OK', content: json(schema) },
  '400': { description: 'Ogiltig indata' },
  '401': { description: 'Autentisering krävs' },
  '403': { description: 'Behörighetspolicyn tillåter inte läsning' },
  '404': { description: 'Finns inte' },
  '503': { description: 'Innehållet har inte lästs in än' },
});
const idParameter = {
  name: 'id',
  in: 'path',
  required: true,
  schema: { type: 'string' },
};
export const openApi = {
  openapi: '3.0.3',
  info: {
    title: 'Architecture governance registry',
    version: '3.0.0',
    description:
      'Alla anrop autentiseras av Backstage och prövas mot behörigheten architecture.read. Registret läser innehållsrepot och ändrar inget: en ändring görs i repot och syns vid nästa läsning. Registret håller ett innehåll per artefakt och allt i det är förslag: det finns inga versioner, ingen historik och inget fastställande. Typer, bindningsgrader och relationer valideras enligt det delade TypeScript-kontraktet.',
  },
  servers: [{ url: '/api/architecture/v1' }],
  security: [{ backstage: [] }],
  paths: {
    '/access': {
      get: {
        responses: responses({
          type: 'object',
          properties: {
            actor: { type: 'string' },
            canAsk: {
              type: 'boolean',
              description: 'Satt när assistenten är konfigurerad.',
            },
          },
        }),
      },
    },
    '/assistant': {
      post: {
        description:
          'En språkmodell väljer de vägledningar och mönster som frågan berör och skriver en kort sammanfattning. Alternativ, byggstenar och bindande regler läses ur registret.',
        requestBody: {
          required: true,
          content: json({
            type: 'object',
            required: ['question'],
            properties: { question: { type: 'string', maxLength: 2000 } },
          }),
        },
        responses: {
          ...responses({
            type: 'object',
            properties: {
              inScope: { type: 'boolean' },
              summary: { type: 'string' },
              items: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    why: { type: 'string' },
                  },
                },
              },
              others: {
                type: 'array',
                description:
                  'Poster som modellen valde ur förteckningen men strök när den läste dem.',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    why: { type: 'string' },
                  },
                },
              },
              alternatives: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    from: { type: 'string' },
                    when: { type: 'string' },
                  },
                },
              },
              blocks: { type: 'array', items: { type: 'string' } },
              basis: { type: 'array', items: { type: 'string' } },
            },
          }),
          '503': {
            description:
              'Assistenten är inte konfigurerad, eller språkmodellen svarar inte',
          },
        },
      },
    },
    '/environment': {
      get: {
        description:
          'Platser, miljöer, zoner, segment, tjänster, driftplattformar och begrepp i den IT-miljö som vägledningar och mönster utgår från. Zoner, segment, platser, tjänster och system läses ur katalogen, högst en minut gamla; problems säger vad där som inte går ihop, och unplaced vilka system som inte anger sitt segment.',
        responses: responses({ type: 'object' }),
      },
    },
    '/artifacts': {
      get: {
        parameters: ['q', 'kind', 'binding', 'owner', 'needsCompletion'].map(
          name => ({ name, in: 'query', schema: { type: 'string' } }),
        ),
        responses: responses({
          type: 'object',
          properties: { items: { type: 'array', items: ref('ArtifactView') } },
        }),
      },
    },
    '/artifacts/{id}': {
      get: {
        parameters: [idParameter],
        responses: responses(ref('ArtifactView')),
      },
    },
  },
  components: {
    securitySchemes: { backstage: { type: 'http', scheme: 'bearer' } },
    schemas: {
      ArtifactInput: artifact,
      Artifact: {
        allOf: [
          readArtifact,
          {
            type: 'object',
            properties: {
              provenance: {
                type: 'object',
                description:
                  'Varifrån artefakten lästes: filen i innehållsrepot, repots tillstånd (etag) och, när konfigurationen anger var repot bläddras, filens adress.',
                required: ['path', 'etag'],
                properties: {
                  path: { type: 'string' },
                  etag: { type: 'string' },
                  url: { type: 'string' },
                },
              },
            },
          },
        ],
      },
      ArtifactView: {
        allOf: [
          ref('Artifact'),
          {
            type: 'object',
            required: ['completionNeeds'],
            properties: {
              completionNeeds: { type: 'array', items: { type: 'string' } },
            },
          },
        ],
      },
    },
  },
};
