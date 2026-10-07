import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { parseBrowserState } from './assetBrowserState';
import { AssetBrowserStorageContext } from './assetBrowserStorage';

type Props = {
  /** Raw state string restored by the Fusion host from the URL. */
  initialState?: string;
  children: ReactNode;
};

/**
 * Shared storage for the asset browser's host-synced state. Rendered once near the root so every
 * view model consumer observes the same value. Synchronising changes to the host is the view
 * model's job.
 */
export function AssetBrowserStateProvider({ initialState, children }: Props) {
  const [state, setState] = useState(() => parseBrowserState(initialState));
  const value = useMemo(() => ({ state, setState }), [state]);

  return <AssetBrowserStorageContext.Provider value={value}>{children}</AssetBrowserStorageContext.Provider>;
}
