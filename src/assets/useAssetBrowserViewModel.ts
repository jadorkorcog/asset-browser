import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { createContext, useCallback, useContext } from 'react';

import { useHostSync } from '../host/hostSync';

import { serializeBrowserState, type AssetBrowserState } from './assetBrowserState';
import { useAssetBrowserStorage } from './assetBrowserStorage';
import type { AssetService } from './AssetService';
import { refKey, type Asset, type AssetPage, type AssetType, type InstanceRef } from './assetTypes';
import { useAssetService } from './useAssetService';

export type Loadable<T> = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: T };

export type PagedAssets = { items: Asset[]; hasMore: boolean; isLoadingMore: boolean };
export type AssetDetail = { asset: Asset; ancestors: Asset[] };

export type AssetBrowserViewModel = {
  query: string;
  selectedType?: InstanceRef;
  selectedRef?: InstanceRef;
  assetTypes: Loadable<AssetType[]>;
  assets: Loadable<PagedAssets>;
  /** Present only while an asset is selected. */
  detail?: { asset: Loadable<AssetDetail>; children: Loadable<PagedAssets> };
  setQuery: (query: string) => void;
  setType: (type: InstanceRef | undefined) => void;
  selectAsset: (ref: InstanceRef) => void;
  clearSelection: () => void;
  loadMoreAssets: () => void;
  loadMoreChildren: () => void;
};

const defaultDeps = { useAssetService };
export type AssetBrowserViewModelContextType = typeof defaultDeps;
export const AssetBrowserViewModelContext = createContext<AssetBrowserViewModelContextType>(defaultDeps);

const FIRST_PAGE: string | undefined = undefined;

type QueryLike<T> = {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  data: T | undefined;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function toLoadable<T>(query: QueryLike<T>): Loadable<T> {
  if (query.isError) return { status: 'error', message: errorMessage(query.error) };
  if (query.isPending || query.data === undefined) return { status: 'loading' };
  return { status: 'ready', data: query.data };
}

function toPaged(
  query: QueryLike<{ pages: AssetPage[] }> & { hasNextPage: boolean; isFetchingNextPage: boolean },
): Loadable<PagedAssets> {
  return toLoadable({
    isPending: query.isPending,
    isError: query.isError,
    error: query.error,
    data: query.data && {
      items: query.data.pages.flatMap((page) => page.items),
      hasMore: query.hasNextPage,
      isLoadingMore: query.isFetchingNextPage,
    },
  });
}

async function loadDetail(service: AssetService, ref: InstanceRef): Promise<AssetDetail> {
  const [asset] = await service.getAssets([ref]);
  if (!asset) throw new Error('Asset not found');
  const ancestorRefs = asset.path.filter((entry) => refKey(entry) !== refKey(ref));
  const ancestors = await service.getAssets(ancestorRefs);
  return { asset, ancestors };
}

export function useAssetBrowserViewModel(): AssetBrowserViewModel {
  const { useAssetService: useService } = useContext(AssetBrowserViewModelContext);
  const service = useService();
  const { sync } = useHostSync();
  const { state, setState } = useAssetBrowserStorage();
  const { query, type, selected } = state;

  const update = useCallback(
    (patch: Partial<AssetBrowserState>) => {
      const next = { ...state, ...patch };
      setState(next);
      void sync?.syncInternalState(serializeBrowserState(next));
    },
    [state, setState, sync],
  );

  const typesQuery = useQuery({
    queryKey: ['asset-types'],
    queryFn: () => service.listAssetTypes(),
  });

  const assetsQuery = useInfiniteQuery({
    queryKey: ['assets', query, type ? refKey(type) : null],
    queryFn: ({ pageParam }) => service.listAssets({ query, type, cursor: pageParam }),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const detailQuery = useQuery({
    queryKey: ['asset-detail', selected ? refKey(selected) : null],
    queryFn: () => (selected ? loadDetail(service, selected) : Promise.reject(new Error('No asset selected'))),
    enabled: selected !== undefined,
  });

  const childrenQuery = useInfiniteQuery({
    queryKey: ['asset-children', selected ? refKey(selected) : null],
    queryFn: ({ pageParam }) =>
      selected ? service.listChildren(selected, pageParam) : Promise.reject(new Error('No asset selected')),
    initialPageParam: FIRST_PAGE,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: selected !== undefined,
  });

  return {
    query,
    selectedType: type,
    selectedRef: selected,
    assetTypes: toLoadable(typesQuery),
    assets: toPaged(assetsQuery),
    detail: selected ? { asset: toLoadable(detailQuery), children: toPaged(childrenQuery) } : undefined,
    setQuery: (next) => update({ query: next }),
    setType: (next) => update({ type: next }),
    selectAsset: (ref) => update({ selected: ref }),
    clearSelection: () => update({ selected: undefined }),
    loadMoreAssets: () => void assetsQuery.fetchNextPage(),
    loadMoreChildren: () => void childrenQuery.fetchNextPage(),
  };
}
