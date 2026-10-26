import { Request } from 'express';
import {
  HttpAuthService,
  PermissionsService,
} from '@backstage/backend-plugin-api';
import { NotAllowedError } from '@backstage/errors';
import { AuthorizeResult } from '@backstage/plugin-permission-common';
import {
  Access,
  architectureReadPermission,
} from '@myndigheten/backstage-plugin-architecture-common';

export type Authorize = (req: Request) => Promise<Access>;
/**
 * Every call reads the governance, and the permission policy of the Backstage
 * instance decides who may. Nothing is written through the portal.
 */
export function createAuthorization(
  httpAuth: HttpAuthService,
  permissions: PermissionsService,
): Authorize {
  return async req => {
    const credentials = await httpAuth.credentials(req, {
      allow: ['user', 'service'],
    });
    const [decision] = await permissions.authorize(
      [{ permission: architectureReadPermission }],
      { credentials },
    );
    if (decision.result !== AuthorizeResult.ALLOW)
      throw new NotAllowedError(
        'Din identitet får inte läsa arkitekturstyrningen',
      );
    return {
      actor:
        credentials.principal.type === 'user'
          ? credentials.principal.userEntityRef
          : 'service',
    };
  };
}
