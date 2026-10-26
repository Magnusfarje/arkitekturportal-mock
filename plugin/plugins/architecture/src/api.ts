import {
  useApi,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/core-plugin-api';
import { useCallback } from 'react';

export function useRequest() {
  const discovery = useApi(discoveryApiRef);
  const fetchApi = useApi(fetchApiRef);
  return useCallback(
    async <T>(path: string, init?: RequestInit): Promise<T> => {
      const base = await discovery.getBaseUrl('architecture');
      const response = await fetchApi.fetch(`${base}/v1${path}`, {
        ...init,
        headers: { 'Content-Type': 'application/json', ...init?.headers },
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error?.message ?? `Begäran misslyckades (${response.status})`,
        );
      return data;
    },
    [discovery, fetchApi],
  );
}
