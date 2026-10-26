import { resolve } from 'node:path';
import {
  CatalogEntity,
  contentLayout,
  fromCatalog,
} from '@myndigheten/backstage-plugin-architecture-common';
import { catalogFile } from '../check';
import { directoryReader, loadContent, Snapshot } from '../content';

// The content the tests read: a copy of the content repository, or a checkout of it.
export const contentDir =
  process.env.ARCHITECTURE_CONTENT_DIR ??
  resolve(__dirname, '../__fixtures__/content');
// The example systems, which an organisation's catalog adds in the default namespace.
export const labCatalog = resolve(__dirname, '../__fixtures__/lab/system.yaml');
export const readContent = async (): Promise<Snapshot> =>
  loadContent((await directoryReader(contentDir)(undefined))!);

// The entities of the environment's catalog file and the example systems'.
export const catalogEntities = async (): Promise<CatalogEntity[]> => [
  ...(await catalogFile(resolve(contentDir, contentLayout.catalog))),
  ...(await catalogFile(labCatalog)),
];
export const catalogEnvironment = async () =>
  fromCatalog(await catalogEntities(), (await readContent()).described);
