import type { CogniteClient } from '@cognite/sdk';

type InstancesApi = CogniteClient['instances'];
export type RawItem = Awaited<ReturnType<InstancesApi['list']>>['items'][number];
export type RawListResponse = Awaited<ReturnType<InstancesApi['list']>>;
export type RawSearchResponse = Awaited<ReturnType<InstancesApi['search']>>;
export type RawRetrieveResponse = Awaited<ReturnType<InstancesApi['retrieve']>>;

export const SPACE = 'ecdm_instances.test';

type NodeOverrides = {
  externalId?: string;
  properties?: Record<string, unknown>;
  viewKey?: string;
  viewSpace?: string;
};

export function makeRawNode(overrides: NodeOverrides = {}): RawItem {
  const {
    externalId = 'PLTF-1',
    properties = { name: 'Platform 1' },
    viewKey = 'CogniteAsset/v1',
    viewSpace = 'cdf_cdm',
  } = overrides;
  return {
    instanceType: 'node',
    space: SPACE,
    externalId,
    properties: { [viewSpace]: { [viewKey]: properties } },
  } as Partial<RawItem> as RawItem;
}

export function makeListResponse(items: RawItem[], nextCursor?: string): RawListResponse {
  return { items, nextCursor } as Partial<RawListResponse> as RawListResponse;
}

export function makeSearchResponse(items: RawItem[]): RawSearchResponse {
  return { items } as Partial<RawSearchResponse> as RawSearchResponse;
}

export function makeRetrieveResponse(items: RawItem[]): RawRetrieveResponse {
  return { items } as Partial<RawRetrieveResponse> as RawRetrieveResponse;
}
