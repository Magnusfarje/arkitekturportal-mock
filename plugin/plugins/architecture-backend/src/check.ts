import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseAllDocuments } from 'yaml';
import {
  CatalogEntity,
  checkContent,
  contentLayout,
} from '@myndigheten/backstage-plugin-architecture-common';
import { directoryReader } from './content';

/** The entities of a catalog file, as the catalog would read them. */
export async function catalogFile(path: string): Promise<CatalogEntity[]> {
  return parseAllDocuments(await readFile(path, 'utf8'))
    .map(document => document.toJS())
    .filter(Boolean);
}

/**
 * Checks a checkout of the content repository with the rules the portal reads
 * it with, and the environment's catalog file. Returns the problems, one line
 * each; none means the content may be shown.
 */
export async function checkDirectory(
  dir: string,
  options: { catalogFiles?: string[] } = {},
): Promise<{ artifacts: number; problems: string[] }> {
  const content = (await directoryReader(dir)())!;
  const catalogPaths = [
    resolve(dir, contentLayout.catalog),
    ...(options.catalogFiles ?? []).map(f => resolve(f)),
  ];
  const catalog: CatalogEntity[] = [];
  for (const path of catalogPaths) {
    try {
      catalog.push(...(await catalogFile(path)));
    } catch (e) {
      return {
        artifacts: 0,
        problems: [`${path}: går inte att läsa: ${(e as Error).message}`],
      };
    }
  }
  const { artifacts, problems } = checkContent(content.files, { catalog });
  return { artifacts: artifacts.length, problems };
}
