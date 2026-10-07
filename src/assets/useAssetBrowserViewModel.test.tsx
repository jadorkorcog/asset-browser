import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ComponentType, ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HostSyncContext, type HostSync } from '../host/hostSync';

import { serializeBrowserState } from './assetBrowserState';
import { AssetBrowserStateProvider } from './AssetBrowserStateProvider';
import type { AssetService } from './AssetService';
import type { Asset, AssetPage, AssetType, InstanceRef } from './assetTypes';
import {
  AssetBrowserViewModelContext,
  useAssetBrowserViewModel,
} from './useAssetBrowserViewModel';

const SPACE = 'sp.test';
const PLATFORM_TYPE: InstanceRef = { space: SPACE, externalId: 'TYPE-PLTF' };

describe(useAssetBrowserViewModel.name, () => {
  let service: AssetService;
  let sync: HostSync;
  let initialState: string | undefined;

  beforeEach(() => {
    initialState = undefined;
    sync = { syncInternalState: vi.fn(() => Promise.resolve(true)) };
    service = {
      listAssets: vi.fn(() => Promise.resolve(page([makeAsset('A'), makeAsset('B')]))),
      listChildren: vi.fn(() => Promise.resolve(page([makeAsset('C1')]))),
      getAssets: vi.fn((refs: InstanceRef[]) => Promise.resolve(refs.map((ref) => makeAsset(ref.externalId)))),
      listAssetTypes: vi.fn(() => Promise.resolve([makeType('TYPE-PLTF', 'Platform')])),
    };
  });

  describe('asset list', () => {
    it('starts in the loading state', () => {
      const { result } = renderViewModel();

      expect(result.current.assets.status).toBe('loading');
    });

    it('exposes the loaded assets', async () => {
      const { result } = renderViewModel();

      await waitFor(() => expect(result.current.assets.status).toBe('ready'));

      expect(readyItems(result.current.assets).map((a) => a.externalId)).toEqual(['A', 'B']);
    });

    it('reports an error when the request fails', async () => {
      vi.mocked(service.listAssets).mockRejectedValue(new Error('boom'));
      const { result } = renderViewModel();

      await waitFor(() => expect(result.current.assets.status).toBe('error'));

      expect(result.current.assets).toEqual({ status: 'error', message: 'boom' });
    });

    it('reports an empty ready list when nothing matches', async () => {
      vi.mocked(service.listAssets).mockResolvedValue(page([]));
      const { result } = renderViewModel();

      await waitFor(() => expect(result.current.assets.status).toBe('ready'));

      expect(readyItems(result.current.assets)).toEqual([]);
    });

    it('loads the next page with the returned cursor', async () => {
      vi.mocked(service.listAssets)
        .mockResolvedValueOnce(page([makeAsset('A')], 'cur1'))
        .mockResolvedValueOnce(page([makeAsset('B')]));
      const { result } = renderViewModel();
      await waitFor(() => expect(result.current.assets.status).toBe('ready'));

      await act(async () => {
        result.current.loadMoreAssets();
      });

      await waitFor(() => expect(readyItems(result.current.assets)).toHaveLength(2));
      expect(service.listAssets).toHaveBeenLastCalledWith({ query: '', type: undefined, cursor: 'cur1' });
      expect(result.current.assets).toMatchObject({ status: 'ready', data: { hasMore: false } });
    });
  });

  describe('asset types', () => {
    it('exposes the available types', async () => {
      const { result } = renderViewModel();

      await waitFor(() => expect(result.current.assetTypes.status).toBe('ready'));

      expect(result.current.assetTypes).toMatchObject({
        status: 'ready',
        data: [{ externalId: 'TYPE-PLTF', name: 'Platform' }],
      });
    });

    it('reports an error when types fail to load', async () => {
      vi.mocked(service.listAssetTypes).mockRejectedValue(new Error('no types'));
      const { result } = renderViewModel();

      await waitFor(() => expect(result.current.assetTypes.status).toBe('error'));
    });
  });

  describe('search and filter', () => {
    it('queries the service with the new search text', async () => {
      const { result } = renderViewModel();
      await waitFor(() => expect(result.current.assets.status).toBe('ready'));

      act(() => result.current.setQuery('tequila'));

      await waitFor(() =>
        expect(service.listAssets).toHaveBeenLastCalledWith({ query: 'tequila', type: undefined, cursor: undefined }),
      );
      expect(result.current.query).toBe('tequila');
    });

    it('queries the service with the selected type', async () => {
      const { result } = renderViewModel();
      await waitFor(() => expect(result.current.assets.status).toBe('ready'));

      act(() => result.current.setType(PLATFORM_TYPE));

      await waitFor(() =>
        expect(service.listAssets).toHaveBeenLastCalledWith({ query: '', type: PLATFORM_TYPE, cursor: undefined }),
      );
      expect(result.current.selectedType).toEqual(PLATFORM_TYPE);
    });
  });

  describe('selected asset', () => {
    it('has no detail when nothing is selected', async () => {
      const { result } = renderViewModel();

      await waitFor(() => expect(result.current.assets.status).toBe('ready'));

      expect(result.current.detail).toBeUndefined();
    });

    it('loads the asset with its ancestors', async () => {
      vi.mocked(service.getAssets).mockImplementation((refs) =>
        Promise.resolve(
          refs.map((requested) =>
            requested.externalId === 'PLTF-1'
              ? { ...makeAsset('PLTF-1'), path: [ref('ROOT'), ref('FLD'), ref('PLTF-1')] }
              : makeAsset(requested.externalId),
          ),
        ),
      );
      const { result } = renderViewModel();

      act(() => result.current.selectAsset(ref('PLTF-1')));

      await waitFor(() => expect(result.current.detail?.asset.status).toBe('ready'));
      expect(result.current.detail?.asset).toMatchObject({
        status: 'ready',
        data: { asset: { externalId: 'PLTF-1' }, ancestors: [{ externalId: 'ROOT' }, { externalId: 'FLD' }] },
      });
    });

    it('reports an error when the asset cannot be found', async () => {
      vi.mocked(service.getAssets).mockResolvedValue([]);
      const { result } = renderViewModel();

      act(() => result.current.selectAsset(ref('MISSING')));

      await waitFor(() => expect(result.current.detail?.asset.status).toBe('error'));
    });

    it('loads the children of the selected asset', async () => {
      const { result } = renderViewModel();

      act(() => result.current.selectAsset(ref('PLTF-1')));

      await waitFor(() => expect(result.current.detail?.children.status).toBe('ready'));
      expect(service.listChildren).toHaveBeenCalledWith(ref('PLTF-1'), undefined);
      expect(result.current.detail?.children).toMatchObject({
        status: 'ready',
        data: { items: [{ externalId: 'C1' }] },
      });
    });

    it('reports an error when children fail to load', async () => {
      vi.mocked(service.listChildren).mockRejectedValue(new Error('children failed'));
      const { result } = renderViewModel();

      act(() => result.current.selectAsset(ref('PLTF-1')));

      await waitFor(() => expect(result.current.detail?.children.status).toBe('error'));
    });

    it('clears the selection', async () => {
      const { result } = renderViewModel();
      act(() => result.current.selectAsset(ref('PLTF-1')));

      act(() => result.current.clearSelection());

      expect(result.current.selectedRef).toBeUndefined();
      expect(result.current.detail).toBeUndefined();
    });
  });

  describe('host state', () => {
    it('restores query, type, and selection from the initial state', async () => {
      initialState = serializeBrowserState({ query: 'x', type: PLATFORM_TYPE, selected: ref('PLTF-1') });

      const { result } = renderViewModel();

      expect(result.current.query).toBe('x');
      expect(result.current.selectedType).toEqual(PLATFORM_TYPE);
      expect(result.current.selectedRef).toEqual(ref('PLTF-1'));
      await waitFor(() => expect(result.current.assets.status).toBe('ready'));
    });

    it('falls back to defaults for malformed initial state', async () => {
      initialState = '{broken';

      const { result } = renderViewModel();

      expect(result.current.query).toBe('');
      await waitFor(() => expect(result.current.assets.status).toBe('ready'));
    });

    it('syncs the new state to the host when the query changes', async () => {
      const { result } = renderViewModel();
      await waitFor(() => expect(result.current.assets.status).toBe('ready'));

      act(() => result.current.setQuery('tequila'));

      expect(sync.syncInternalState).toHaveBeenCalledWith(serializeBrowserState({ query: 'tequila' }));
    });

    it('syncs the selection and keeps the existing query', async () => {
      initialState = serializeBrowserState({ query: 'abc' });
      const { result } = renderViewModel();

      act(() => result.current.selectAsset(ref('PLTF-1')));

      expect(sync.syncInternalState).toHaveBeenCalledWith(
        serializeBrowserState({ query: 'abc', selected: ref('PLTF-1') }),
      );
    });

    it('does not fail when the host is not connected', async () => {
      const { result } = renderViewModel({ withHost: false });

      expect(() => act(() => result.current.setQuery('x'))).not.toThrow();
    });
  });

  function renderViewModel({ withHost = true }: { withHost?: boolean } = {}) {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper: ComponentType<{ children: ReactNode }> = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <HostSyncContext.Provider value={{ sync: withHost ? sync : null }}>
          <AssetBrowserViewModelContext.Provider value={{ useAssetService: () => service }}>
            <AssetBrowserStateProvider initialState={initialState}>{children}</AssetBrowserStateProvider>
          </AssetBrowserViewModelContext.Provider>
        </HostSyncContext.Provider>
      </QueryClientProvider>
    );
    return renderHook(() => useAssetBrowserViewModel(), { wrapper });
  }
});

function ref(externalId: string): InstanceRef {
  return { space: SPACE, externalId };
}

function makeAsset(externalId: string): Asset {
  return { space: SPACE, externalId, name: externalId, path: [], tags: [], aliases: [] };
}

function makeType(externalId: string, name: string): AssetType {
  return { space: SPACE, externalId, name };
}

function page(items: Asset[], nextCursor?: string): AssetPage {
  return { items, nextCursor };
}

function readyItems(loadable: { status: string }): Asset[] {
  return 'data' in loadable && isPagedData(loadable.data) ? loadable.data.items : [];
}

function isPagedData(value: unknown): value is { items: Asset[] } {
  return typeof value === 'object' && value !== null && 'items' in value;
}
