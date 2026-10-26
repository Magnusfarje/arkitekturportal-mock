// A backend with only what the plugin needs, for developing it on its own:
// guest sign-in, a catalog that reads the environment's file, a policy that
// allows everything, and an in-memory database. Start it with `yarn start` in
// this directory; the configuration is app-config.yaml at the repository root.
import { createBackend } from '@backstage/backend-defaults';

const backend = createBackend();
backend.add(import('@backstage/plugin-auth-backend'));
backend.add(import('@backstage/plugin-auth-backend-module-guest-provider'));
backend.add(import('@backstage/plugin-catalog-backend'));
backend.add(import('@backstage/plugin-permission-backend'));
backend.add(
  import('@backstage/plugin-permission-backend-module-allow-all-policy'),
);
backend.add(import('../src'));
backend.start();
