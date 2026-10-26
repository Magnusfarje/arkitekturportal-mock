import { createElement } from 'react';
import AccountTreeIcon from '@material-ui/icons/AccountTree';
import DeviceHubIcon from '@material-ui/icons/DeviceHub';
import ExploreIcon from '@material-ui/icons/Explore';
import MapIcon from '@material-ui/icons/Map';
import {
  createFrontendPlugin,
  createRouteRef,
  PageBlueprint,
} from '@backstage/frontend-plugin-api';

const rootRouteRef = createRouteRef();
const guideRouteRef = createRouteRef();
const environmentRouteRef = createRouteRef();
const overviewRouteRef = createRouteRef();

export default createFrontendPlugin({
  pluginId: 'architecture',
  routes: {
    root: rootRouteRef,
    guide: guideRouteRef,
    environment: environmentRouteRef,
    overview: overviewRouteRef,
  },
  extensions: [
    PageBlueprint.make({
      params: {
        path: '/architecture',
        title: 'Arkitekturstyrning',
        icon: createElement(AccountTreeIcon),
        routeRef: rootRouteRef,
        loader: () =>
          import('./Page').then(m => createElement(m.ArchitecturePage)),
      },
    }),
    PageBlueprint.make({
      name: 'guide',
      params: {
        path: '/arkitekturguide',
        title: 'Arkitekturguide',
        icon: createElement(ExploreIcon),
        routeRef: guideRouteRef,
        loader: () => import('./Guide').then(m => createElement(m.GuidePage)),
      },
    }),
    PageBlueprint.make({
      name: 'environment',
      params: {
        path: '/it-miljo',
        title: 'IT-miljön',
        icon: createElement(MapIcon),
        routeRef: environmentRouteRef,
        loader: () =>
          import('./Environment').then(m => createElement(m.EnvironmentPage)),
      },
    }),
    PageBlueprint.make({
      name: 'overview',
      params: {
        path: '/om-arkitekturstyrning',
        title: 'Så hänger det ihop',
        icon: createElement(DeviceHubIcon),
        routeRef: overviewRouteRef,
        loader: () =>
          import('./Overview').then(m => createElement(m.OverviewPage)),
      },
    }),
  ],
});
