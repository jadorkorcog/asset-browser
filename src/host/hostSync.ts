import type { HostAppAPI } from '@cognite/app-sdk';
import { createContext, useContext } from 'react';

/** The slice of the Fusion host API needed to persist UI state in the URL. */
export type HostSync = Pick<HostAppAPI, 'syncInternalState'>;

export type HostSyncContextValue = { sync: HostSync | null };

export const HostSyncContext = createContext<HostSyncContextValue>({ sync: null });

export function useHostSync(): HostSyncContextValue {
  return useContext(HostSyncContext);
}
