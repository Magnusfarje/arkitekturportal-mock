import {
  coreServices,
  createBackendPlugin,
  readSchedulerServiceTaskScheduleDefinitionFromConfig,
  SchedulerServiceTaskScheduleDefinition,
} from '@backstage/backend-plugin-api';
import {
  CatalogClient,
  CATALOG_FILTER_EXISTS,
} from '@backstage/catalog-client';
import {
  architecturePermissions,
  Environment,
  environmentAnnotation,
  environmentTypes,
  fromCatalog,
} from '@myndigheten/backstage-plugin-architecture-common';
import { ContentStore } from './store';
import { createRouter } from './router';
import { createAuthorization } from './access';
import { assistantFrom } from './assistant';
import { directoryReader, urlReader } from './content';

export { checkDirectory } from './check';

// How often the content repository is read when the configuration does not say.
const defaultSchedule: SchedulerServiceTaskScheduleDefinition = {
  frequency: { minutes: 5 },
  timeout: { minutes: 2 },
};
// How long the environment read from the catalog is kept before it is read anew.
const environmentTtl = 60_000;

/**
 * The architecture governance registry. It reads the content repository on a
 * schedule and the catalog on request, and changes neither.
 */
export default createBackendPlugin({
  pluginId: 'architecture',
  register(env) {
    env.registerInit({
      deps: {
        httpRouter: coreServices.httpRouter,
        httpAuth: coreServices.httpAuth,
        auth: coreServices.auth,
        discovery: coreServices.discovery,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        reader: coreServices.urlReader,
        scheduler: coreServices.scheduler,
        permissions: coreServices.permissions,
        permissionsRegistry: coreServices.permissionsRegistry,
      },
      async init({
        httpRouter,
        httpAuth,
        auth,
        discovery,
        logger,
        config,
        reader,
        scheduler,
        permissions,
        permissionsRegistry,
      }) {
        permissionsRegistry.addPermissions(architecturePermissions);
        const content = config.getConfig('architecture.content');
        const url = content.getOptionalString('url');
        const dir = content.getOptionalString('dir');
        if (!url === !dir)
          throw new Error(
            'Set one of architecture.content.url and architecture.content.dir',
          );
        const store = new ContentStore(
          url ? urlReader(reader, url) : directoryReader(dir!),
          { browseUrl: content.getOptionalString('browseUrl'), logger },
        );
        // The content is read before the first request, and then on schedule.
        await store.tryRefresh();
        const schedule = content.has('schedule')
          ? readSchedulerServiceTaskScheduleDefinitionFromConfig(
              content.getConfig('schedule'),
            )
          : defaultSchedule;
        await scheduler.scheduleTask({
          id: 'architecture-content',
          ...schedule,
          fn: () => store.tryRefresh(),
        });

        const catalog = new CatalogClient({ discoveryApi: discovery });
        const catalogToken = async () =>
          auth.getPluginRequestToken({
            onBehalfOf: await auth.getOwnServiceCredentials(),
            targetPluginId: 'catalog',
          });
        // The environment is what the catalog says, kept a short while so that a
        // large catalog is not read for every request.
        let cached: { at: number; value: Promise<Environment> } | undefined;
        const environment = () => {
          if (cached && Date.now() - cached.at < environmentTtl)
            return cached.value;
          const value = (async () => {
            const { items } = await catalog.getEntities(
              {
                filter: [
                  // Systems that place themselves on the map, and the environment's own services.
                  {
                    kind: 'Component',
                    [`metadata.annotations.${environmentAnnotation(
                      'segment',
                    )}`]: CATALOG_FILTER_EXISTS,
                  },
                  { kind: 'Group' },
                  {
                    kind: 'Resource',
                    'spec.type': Object.values(environmentTypes),
                  },
                ],
                fields: [
                  'kind',
                  'metadata.name',
                  'metadata.namespace',
                  'metadata.title',
                  'metadata.description',
                  'metadata.annotations',
                  'spec.type',
                  'spec.owner',
                  'spec.dependsOn',
                ],
              },
              await catalogToken(),
            );
            return fromCatalog(items, store.described());
          })();
          cached = { at: Date.now(), value };
          value.catch(() => {
            cached = undefined;
          });
          return value;
        };
        httpRouter.use(
          createRouter({
            store,
            authorize: createAuthorization(httpAuth, permissions),
            assistant: assistantFrom(config),
            environment,
          }),
        );
        logger.info('Architecture registry initialized');
      },
    });
  },
});
