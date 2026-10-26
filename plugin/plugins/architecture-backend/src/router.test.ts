import express, { ErrorRequestHandler } from 'express';
import { Server } from 'node:http';
import { AddressInfo } from 'node:net';
import {
  HttpAuthService,
  PermissionsService,
} from '@backstage/backend-plugin-api';
import { AuthenticationError, NotAllowedError } from '@backstage/errors';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { ContentStore } from './store';
import { directoryReader } from './content';
import { createRouter } from './router';
import { createAuthorization } from './access';
import { catalogEnvironment, contentDir } from './__testUtils__/content';

let server: Server;
let asking: Server;
let base: string;
let askBase: string;
beforeAll(async () => {
  const store = new ContentStore(directoryReader(contentDir));
  await store.refresh();
  const httpAuth = {
    credentials: async (req: any, options: any) => {
      const token = req.headers.authorization;
      if (!token) throw new AuthenticationError('Missing credentials');
      if (token === 'service' && !options?.allow?.includes('service'))
        throw new NotAllowedError('User required');
      return {
        principal:
          token === 'service'
            ? { type: 'service', subject: 'test' }
            : { type: 'user', userEntityRef: `user:default/${token}` },
      };
    },
  } as unknown as HttpAuthService;
  // The permission policy of the instance decides; here it denies one reader.
  const permissions = {
    authorize: async (_requests: unknown, options: any) => [
      {
        result:
          options.credentials.principal.userEntityRef === 'user:default/denied'
            ? AuthorizeResult.DENY
            : AuthorizeResult.ALLOW,
      },
    ],
  } as unknown as PermissionsService;
  const environment = await catalogEnvironment();
  const options = {
    store,
    authorize: createAuthorization(httpAuth, permissions),
    environment: async () => environment,
  };
  const app = express();
  app.use(createRouter(options));
  // The same registry with an assistant that answers with what it was asked.
  const withAssistant = express();
  withAssistant.use(
    createRouter({
      ...options,
      assistant: async (question, artifacts, blocks) => ({
        inScope: true,
        summary: `${question} (${artifacts.length} artefakter, ${blocks.length} tjänster)`,
        items: [],
        others: [],
        alternatives: [],
        blocks: [],
        basis: [],
      }),
    }),
  );
  const errors: ErrorRequestHandler = (err, _req, res, _next) => {
    res
      .status(
        (
          {
            InputError: 400,
            AuthenticationError: 401,
            NotAllowedError: 403,
            NotFoundError: 404,
            ServiceUnavailableError: 503,
          } as Record<string, number>
        )[err.name] ?? 500,
      )
      .json({ error: { message: err.message } });
  };
  app.use(errors);
  withAssistant.use(errors);
  server = app.listen(0, '127.0.0.1');
  asking = withAssistant.listen(0, '127.0.0.1');
  await Promise.all(
    [server, asking].map(
      s => new Promise<void>(resolve => s.once('listening', resolve)),
    ),
  );
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
  askBase = `http://127.0.0.1:${(asking.address() as AddressInfo).port}/v1`;
});
afterAll(async () => {
  for (const s of [server, asking])
    if (s)
      await new Promise<void>((resolve, reject) =>
        s.close(e => (e ? reject(e) : resolve())),
      );
});
function call(
  path: string,
  method = 'GET',
  body?: unknown,
  token: string | undefined = 'reader',
) {
  return fetch(`${base}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
it('requires authentication, lets the permission policy decide, and lets a service read', async () => {
  for (const path of [
    '/artifacts',
    '/artifacts?q=åtkomst',
    '/artifacts/TP-ÅTK-01',
    '/environment',
    '/access',
    '/openapi.json',
  ]) {
    expect((await call(path, 'GET', undefined, '')).status).toBe(401);
    expect((await call(path, 'GET', undefined, 'denied')).status).toBe(403);
    expect((await call(path, 'GET', undefined, 'service')).status).toBe(200);
    expect((await call(path)).status).toBe(200);
  }
  expect(await (await call('/access')).json()).toEqual({
    actor: 'user:default/reader',
  });
  expect(
    await (await call('/access', 'GET', undefined, 'service')).json(),
  ).toEqual({ actor: 'service' });
});
it('serves the environment the guides build on, as the catalog describes it', async () => {
  const environment = await (await call('/environment')).json();
  const ids = (list: { id: string }[]) => list.map(entry => entry.id);
  expect(ids(environment.zones)).toContain('ot-dmz');
  expect(ids(environment.sites)).toContain('dh1');
  expect(ids(environment.stages)).toEqual(['prod', 'test', 'utv', 'utb']);
  expect(ids(environment.segments)).toContain('tjanst-container');
  expect(ids(environment.blocks)).toContain(
    'component:it-miljo/containerplattform',
  );
  // The example systems stand in the default namespace, as the organisation's systems do.
  expect(ids(environment.blocks)).toContain('component:default/tagplan');
  expect(ids(environment.externals)).toContain('sgsi');
  expect(environment.problems).toEqual([]);
  expect(environment.unplaced).toEqual([]);
  expect(
    ['sites', 'zones', 'segments', 'blocks', 'externals'].map(
      key => environment[key].length,
    ),
  ).toEqual([12, 15, 55, 82, 15]);
  // The owners are the environment's teams, named by their titles.
  expect(
    environment.blocks.find(
      (b: { id: string }) => b.id === 'component:default/tagplan',
    ).owner,
  ).not.toMatch(/^group:|^team-/);
  expect(environment).not.toHaveProperty('documents');
  expect(JSON.stringify(environment)).not.toMatch(
    /fikti|påhitt|kvar att göra/i,
  );
});
it('lists, filters and reads artifacts, and writes nothing', async () => {
  const all = await (await call('/artifacts')).json();
  expect(all.items).toHaveLength(86);
  const search = await (
    await call(
      '/artifacts?q=TP-DRI-14&kind=technical-principle&binding=binding',
    )
  ).json();
  expect(search.items.map((a: { id: string }) => a.id)).toContain('TP-DRI-14');
  expect(
    (await (await call('/artifacts?needsCompletion=true')).json()).items.length,
  ).toBeGreaterThan(0);
  const post = await (await call('/artifacts/TP-DRI-14')).json();
  expect(post.completionNeeds).toEqual(['Innehållsägare']);
  expect(post.provenance).toEqual({
    path: 'styrning/tekniska-principer/TP-DRI-14.yaml',
    etag: expect.any(String),
  });
  for (const removed of ['updatedAt', 'updatedBy', 'version', 'status'])
    expect(post).not.toHaveProperty(removed);
  expect((await call('/artifacts/TP-SAKNAS-01')).status).toBe(404);
  // The portal changes nothing: a change is made in the content repository.
  expect((await call('/artifacts', 'POST', { artifact: post })).status).toBe(
    404,
  );
  expect(
    (await call('/artifacts/TP-DRI-14', 'PUT', { artifact: post })).status,
  ).toBe(404);
  expect((await call('/artifacts/TP-DRI-14', 'DELETE')).status).toBe(404);
  for (const path of [
    '/artifacts/TP-DRI-14/versions',
    '/review-queue',
    '/sources',
  ])
    expect((await call(path)).status).toBe(404);
});
it('publishes the contract with reads only', async () => {
  const contract = await (await call('/openapi.json')).json();
  expect(contract.openapi).toBe('3.0.3');
  expect(contract.components.schemas.ArtifactInput.additionalProperties).toBe(
    false,
  );
  expect(Object.keys(contract.paths).sort()).toEqual([
    '/access',
    '/artifacts',
    '/artifacts/{id}',
    '/assistant',
    '/environment',
  ]);
  for (const path of Object.values(contract.paths) as object[])
    expect(Object.keys(path)).toEqual(
      path === contract.paths['/assistant'] ? ['post'] : ['get'],
    );
});
it('keeps the assistant off, and says so, until a language model is configured', async () => {
  expect(
    (await call('/assistant', 'POST', { question: 'Hur gör jag?' }, '')).status,
  ).toBe(401);
  const answer = await call('/assistant', 'POST', { question: 'Hur gör jag?' });
  expect(answer.status).toBe(503);
  expect((await answer.json()).error.message).toBe(
    'Assistenten är inte konfigurerad',
  );
  expect(await (await call('/access')).json()).not.toHaveProperty('canAsk');
});
it('answers a question from any signed-in reader when the assistant is configured', async () => {
  const ask = (question: unknown, token = 'reader') =>
    fetch(`${askBase}/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({ question }),
    });
  const answer = await ask('  Hur publicerar jag ett API?  ');
  expect(answer.status).toBe(200);
  expect((await answer.json()).summary).toMatch(
    /^Hur publicerar jag ett API\? \(86 artefakter, 82 tjänster\)$/,
  );
  for (const invalid of ['', '   ', 'x'.repeat(2001), 42])
    expect((await ask(invalid)).status).toBe(400);
  expect((await ask('Hur?', 'denied')).status).toBe(403);
  expect(
    await (
      await fetch(`${askBase}/access`, { headers: { Authorization: 'reader' } })
    ).json(),
  ).toEqual({ actor: 'user:default/reader', canAsk: true });
});
