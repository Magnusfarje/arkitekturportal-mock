// An app with only the plugin's pages and the catalog they link to, signed in
// as a guest, for developing the plugin on its own against the backend in
// plugins/architecture-backend/dev. Start it with `yarn start` in this directory.
import { createApp } from '@backstage/frontend-defaults';
import { createFrontendModule } from '@backstage/frontend-plugin-api';
import { SignInPageBlueprint } from '@backstage/plugin-app-react';
import { SignInPage } from '@backstage/core-components';
import catalogPlugin from '@backstage/plugin-catalog/alpha';
import architecturePlugin from '../src';

const guestSignIn = SignInPageBlueprint.make({
  params: {
    loader: async () => props =>
      <SignInPage {...props} providers={['guest']} />,
  },
});

export default createApp({
  features: [
    catalogPlugin,
    architecturePlugin,
    createFrontendModule({ pluginId: 'app', extensions: [guestSignIn] }),
  ],
});
