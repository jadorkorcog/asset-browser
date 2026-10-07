import { useCogniteSdk } from '@cognite/app-sdk/react';
import { useMemo } from 'react';

import { createAssetService, type AssetService } from './AssetService';

export function useAssetService(): AssetService {
  const client = useCogniteSdk();
  return useMemo(() => createAssetService(client.instances), [client]);
}
