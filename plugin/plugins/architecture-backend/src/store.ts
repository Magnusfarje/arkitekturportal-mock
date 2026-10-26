import { LoggerService } from '@backstage/backend-plugin-api';
import { NotFoundError, ServiceUnavailableError } from '@backstage/errors';
import {
  ArtifactView,
  completionNeeds,
  Described,
} from '@myndigheten/backstage-plugin-architecture-common';
import { ContentReader, loadContent, Snapshot } from './content';

/**
 * The registry: the content repository as it was last read, held in memory.
 * The portal changes nothing in it; a change is made in the repository and
 * arrives with the next reading.
 */
export class ContentStore {
  private snapshot?: Snapshot;
  constructor(
    private readonly read: ContentReader,
    private readonly options: {
      browseUrl?: string;
      logger?: LoggerService;
    } = {},
  ) {}
  /** Reads the repository anew. Says whether anything changed. */
  async refresh(): Promise<boolean> {
    const content = await this.read(this.snapshot?.etag);
    if (!content) return false;
    this.snapshot = loadContent(content, this.options.browseUrl);
    this.options.logger?.info(
      `Architecture content read: ${this.snapshot.artifacts.length} artifacts at ${this.snapshot.etag}`,
    );
    return true;
  }
  /** Reads the repository, and keeps what it had when the reading fails. */
  async tryRefresh(): Promise<void> {
    try {
      await this.refresh();
    } catch (e) {
      this.options.logger?.error(
        `Architecture content could not be read: ${(e as Error).message}`,
      );
      if (!this.snapshot) throw e;
    }
  }
  get current(): Snapshot {
    if (!this.snapshot)
      throw new ServiceUnavailableError('Innehållet har inte lästs in än');
    return this.snapshot;
  }
  list(): ArtifactView[] {
    const all = this.current.artifacts;
    return all.map(a => ({ ...a, completionNeeds: completionNeeds(a, all) }));
  }
  get(id: string): ArtifactView {
    const found = this.list().find(a => a.id === id);
    if (!found) throw new NotFoundError('Artefakten finns inte');
    return found;
  }
  described(): Described {
    return this.current.described;
  }
}
