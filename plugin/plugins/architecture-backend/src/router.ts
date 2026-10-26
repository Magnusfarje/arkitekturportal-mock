import { openApi } from './contract';
import express from 'express';
import Router from 'express-promise-router';
import { InputError, ServiceUnavailableError } from '@backstage/errors';
import { Environment } from '@myndigheten/backstage-plugin-architecture-common';
import { ContentStore } from './store';
import { Authorize } from './access';
import { Assistant } from './assistant';

export function createRouter(options: {
  store: ContentStore;
  authorize: Authorize;
  // The IT environment as the catalog describes it now.
  environment: () => Promise<Environment>;
  // Left out, the assistant is off.
  assistant?: Assistant;
}) {
  const { store, authorize, assistant, environment } = options;
  const router = Router();
  router.use(express.json({ limit: '1mb' }));
  router.get('/v1/access', async (req, res) => {
    const access = await authorize(req);
    res.json(assistant ? { ...access, canAsk: true } : access);
  });
  router.post('/v1/assistant', async (req, res) => {
    await authorize(req);
    if (!assistant)
      throw new ServiceUnavailableError('Assistenten är inte konfigurerad');
    const question =
      typeof req.body?.question === 'string' ? req.body.question.trim() : '';
    if (!question || question.length > 2000)
      throw new InputError('Frågan ska vara en text på högst 2 000 tecken');
    res.json(
      await assistant(question, store.list(), (await environment()).blocks),
    );
  });
  router.get('/v1/openapi.json', async (req, res) => {
    await authorize(req);
    res.json(openApi);
  });
  router.get('/v1/environment', async (req, res) => {
    await authorize(req);
    res.json(await environment());
  });
  router.get('/v1/artifacts', async (req, res) => {
    await authorize(req);
    let items = store.list();
    const { q, kind, binding, owner, needsCompletion } = req.query;
    if (typeof q === 'string')
      items = items.filter(a =>
        JSON.stringify(a)
          .toLocaleLowerCase('sv')
          .includes(q.toLocaleLowerCase('sv')),
      );
    for (const [key, value] of Object.entries({ kind, binding, owner }))
      if (typeof value === 'string')
        items = items.filter(
          a => a[key as 'kind' | 'binding' | 'owner'] === value,
        );
    if (needsCompletion === 'true')
      items = items.filter(a => a.completionNeeds.length);
    res.json({ items });
  });
  router.get('/v1/artifacts/:id', async (req, res) => {
    await authorize(req);
    res.json(store.get(req.params.id));
  });
  return router;
}
