export interface Config {
  architecture?: {
    /** The content repository the registry reads: the governance and the environment description. */
    content: {
      /**
       * The repository as a URL that Backstage's UrlReader can read as a tree, for example
       * https://github.com/<org>/arkitekturstyrning/tree/main. The host needs an
       * entry under `integrations`.
       * @visibility backend
       */
      url?: string;
      /** A checkout of the repository on disk, for local development. @visibility backend */
      dir?: string;
      /**
       * Where a file of the repository is browsed, with {path} for the file, for example
       * https://github.com/<org>/arkitekturstyrning/blob/main/{path}. Given, every
       * artifact links to its file.
       * @visibility backend
       */
      browseUrl?: string;
      /** How often the repository is read. Default every five minutes. */
      schedule?: {
        /** @visibility backend */
        frequency?:
          | string
          | {
              seconds?: number;
              minutes?: number;
              hours?: number;
              days?: number;
            };
        /** @visibility backend */
        timeout?:
          | string
          | {
              seconds?: number;
              minutes?: number;
              hours?: number;
              days?: number;
            };
        /** @visibility backend */
        initialDelay?:
          | string
          | {
              seconds?: number;
              minutes?: number;
              hours?: number;
              days?: number;
            };
      };
    };
    /** A language model that helps a reader find the governance that applies. Left out, the assistant is off. */
    assistant?: {
      /** Base URL of an Ollama-compatible API, for example http://localhost:11434. @visibility backend */
      baseUrl: string;
      /** The model to ask, for example gemma4:latest. @visibility backend */
      model: string;
    };
  };
}
