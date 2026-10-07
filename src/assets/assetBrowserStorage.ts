import { createContext, useContext } from 'react';

import { DEFAULT_BROWSER_STATE, type AssetBrowserState } from './assetBrowserState';

export type AssetBrowserStorage = {
  state: AssetBrowserState;
  setState: (next: AssetBrowserState) => void;
};

export const AssetBrowserStorageContext = createContext<AssetBrowserStorage>({
  state: DEFAULT_BROWSER_STATE,
  setState: () => undefined,
});

export function useAssetBrowserStorage(): AssetBrowserStorage {
  return useContext(AssetBrowserStorageContext);
}
