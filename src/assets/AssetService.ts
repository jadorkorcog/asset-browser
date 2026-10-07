import type { CogniteClient } from '@cognite/sdk';

import { parseAsset, parseAssetType } from './assetParsing';
import { refKey, type Asset, type AssetPage, type AssetType, type InstanceRef } from './assetTypes';

export type InstancesApi = Pick<CogniteClient['instances'], 'list' | 'search' | 'retrieve'>;

export type AssetQuery = {
  query?: string;
  type?: InstanceRef;
  cursor?: string;
  limit?: number;
};

export interface AssetService {
  /** Search when a query is given (not paginated), otherwise a cursor-paginated list. */
  listAssets(params: AssetQuery): Promise<AssetPage>;
  listChildren(parent: InstanceRef, cursor?: string): Promise<AssetPage>;
  /** Returns found assets in the order of `refs`; missing ones are omitted. */
  getAssets(refs: InstanceRef[]): Promise<Asset[]>;
  listAssetTypes(): Promise<AssetType[]>;
}

const DEFAULT_PAGE_SIZE = 50;
const TYPE_PAGE_SIZE = 1000;

const ASSET_VIEW = { type: 'view', space: 'cdf_cdm', externalId: 'CogniteAsset', version: 'v1' } as const;
const ASSET_TYPE_VIEW = {
  type: 'view',
  space: 'cdf_cdm',
  externalId: 'CogniteAssetType',
  version: 'v1',
} as const;

function relationFilter(property: 'type' | 'parent', ref: InstanceRef) {
  return {
    equals: {
      property: [ASSET_VIEW.space, `${ASSET_VIEW.externalId}/${ASSET_VIEW.version}`, property],
      value: { space: ref.space, externalId: ref.externalId },
    },
  };
}

function toAssets(items: Parameters<typeof parseAsset>[0][]): Asset[] {
  return items.flatMap((item) => {
    const asset = parseAsset(item);
    return asset ? [asset] : [];
  });
}

class InstancesAssetService implements AssetService {
  constructor(private readonly instances: InstancesApi) {}

  async listAssets({ query, type, cursor, limit = DEFAULT_PAGE_SIZE }: AssetQuery): Promise<AssetPage> {
    const trimmed = query?.trim();
    const filter = type ? relationFilter('type', type) : undefined;

    if (trimmed) {
      const response = await this.instances.search({
        view: ASSET_VIEW,
        instanceType: 'node',
        query: trimmed,
        limit,
        ...(filter ? { filter } : {}),
      });
      return { items: toAssets(response.items) };
    }

    const response = await this.instances.list({
      instanceType: 'node',
      sources: [{ source: ASSET_VIEW }],
      limit,
      ...(cursor ? { cursor } : {}),
      ...(filter ? { filter } : {}),
    });
    return { items: toAssets(response.items), nextCursor: response.nextCursor };
  }

  async listChildren(parent: InstanceRef, cursor?: string): Promise<AssetPage> {
    const response = await this.instances.list({
      instanceType: 'node',
      sources: [{ source: ASSET_VIEW }],
      limit: DEFAULT_PAGE_SIZE,
      ...(cursor ? { cursor } : {}),
      filter: relationFilter('parent', parent),
    });
    return { items: toAssets(response.items), nextCursor: response.nextCursor };
  }

  async getAssets(refs: InstanceRef[]): Promise<Asset[]> {
    const unique = [...new Map(refs.map((ref) => [refKey(ref), ref])).values()];
    if (unique.length === 0) return [];

    const response = await this.instances.retrieve({
      sources: [{ source: ASSET_VIEW }],
      items: unique.map((ref) => ({ instanceType: 'node', space: ref.space, externalId: ref.externalId })),
    });

    const byKey = new Map(toAssets(response.items).map((asset) => [refKey(asset), asset]));
    return unique.flatMap((ref) => {
      const asset = byKey.get(refKey(ref));
      return asset ? [asset] : [];
    });
  }

  async listAssetTypes(): Promise<AssetType[]> {
    const response = await this.instances.list({
      instanceType: 'node',
      sources: [{ source: ASSET_TYPE_VIEW }],
      limit: TYPE_PAGE_SIZE,
    });
    return response.items
      .flatMap((item) => {
        const type = parseAssetType(item);
        return type ? [type] : [];
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function createAssetService(instances: InstancesApi): AssetService {
  return new InstancesAssetService(instances);
}
