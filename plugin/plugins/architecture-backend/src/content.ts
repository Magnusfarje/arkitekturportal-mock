import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve, sep } from 'node:path';
import { UrlReaderService } from '@backstage/backend-plugin-api';
import { InputError, NotModifiedError } from '@backstage/errors';
import {
  Artifact,
  checkContent,
  ContentFile,
  Described,
} from '@myndigheten/backstage-plugin-architecture-common';

// The content repository as it was read: every file the portal may need.
export type ContentFiles = { etag: string; files: ContentFile[] };
// Reads the repository. Given the etag of the last reading, says nothing when it is unchanged.
export type ContentReader = (
  etag?: string,
) => Promise<ContentFiles | undefined>;

const wanted = /\.ya?ml$/;
const skipped = new Set(['node_modules', '.git', '.github']);

/** A checkout of the content repository on disk, for local development, tests and the check. */
export function directoryReader(dir: string): ContentReader {
  const root = resolve(dir);
  const walk = async (at: string): Promise<string[]> => {
    const entries = await readdir(at, { withFileTypes: true });
    const found: string[] = [];
    for (const entry of entries) {
      if (skipped.has(entry.name)) continue;
      const path = join(at, entry.name);
      if (entry.isDirectory()) found.push(...(await walk(path)));
      else if (wanted.test(entry.name)) found.push(path);
    }
    return found;
  };
  return async etag => {
    const files: ContentFile[] = [];
    const hash = createHash('sha256');
    for (const path of (await walk(root)).sort()) {
      const text = await readFile(path, 'utf8');
      const key = relative(root, path).split(sep).join('/');
      files.push({ path: key, text });
      hash.update(key).update('\0').update(text).update('\0');
    }
    const current = hash.digest('hex');
    return current === etag ? undefined : { etag: current, files };
  };
}

/** The content repository at a URL, read through Backstage's UrlReader. */
export function urlReader(
  reader: UrlReaderService,
  url: string,
): ContentReader {
  return async etag => {
    let response;
    try {
      response = await reader.readTree(url, etag ? { etag } : undefined);
    } catch (e) {
      if (e instanceof NotModifiedError) return undefined;
      throw e;
    }
    const files: ContentFile[] = [];
    for (const file of await response.files())
      if (wanted.test(file.path))
        files.push({
          path: file.path,
          text: (await file.content()).toString('utf8'),
        });
    return { etag: response.etag, files };
  };
}

// The content as the portal holds it in memory between readings.
export type Snapshot = {
  etag: string;
  readAt: string;
  artifacts: Artifact[];
  described: Described;
};

/**
 * Reads the snapshot out of the files with the rules the content is checked
 * against. Refuses the whole reading when anything breaks them, so that the
 * portal never shows a half-read repository.
 */
export function loadContent(
  content: ContentFiles,
  browseUrl?: string,
): Snapshot {
  const { artifacts, described, problems } = checkContent(content.files, {
    etag: content.etag,
    browseUrl,
  });
  if (problems.length || !described)
    throw new InputError(
      `Innehållet följer inte artefaktdefinitionen:\n${problems.join('\n')}`,
    );
  return {
    etag: content.etag,
    readAt: new Date().toISOString(),
    artifacts,
    described,
  };
}
