import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  makeListResponse,
  makeRawNode,
  makeRetrieveResponse,
  makeSearchResponse,
  SPACE,
} from '../__mocks__/assetFixtures';

import { createAssetService, type AssetService, type InstancesApi } from './AssetService';

const ASSET_VIEW = { type: 'view', space: 'cdf_cdm', externalId: 'CogniteAsset', version: 'v1' };
const TYPE_VIEW = { type: 'view', space: 'cdf_cdm', externalId: 'CogniteAssetType', version: 'v1' };

describe('AssetService', () => {
  let instances: InstancesApi;
  let service: AssetService;

  beforeEach(() => {
    instances = {
      list: vi.fn(() => Promise.resolve(makeListResponse([]))),
      search: vi.fn(() => Promise.resolve(makeSearchResponse([]))),
      retrieve: vi.fn(() => Promise.resolve(makeRetrieveResponse([]))),
    };
    service = createAssetService(instances);
  });

  describe('listAssets without a search query', () => {
    it('lists asset nodes with the CogniteAsset view and default limit', async () => {
      await service.listAssets({});

      expect(instances.list).toHaveBeenCalledWith({
        instanceType: 'node',
        sources: [{ source: ASSET_VIEW }],
        limit: 50,
      });
      expect(instances.search).not.toHaveBeenCalled();
    });

    it('passes the cursor and filters by type server-side', async () => {
      await service.listAssets({
        type: { space: SPACE, externalId: 'TYPE-PLTF' },
        cursor: 'abc',
        limit: 10,
      });

      expect(instances.list).toHaveBeenCalledWith({
        instanceType: 'node',
        sources: [{ source: ASSET_VIEW }],
        limit: 10,
        cursor: 'abc',
        filter: {
          equals: {
            property: ['cdf_cdm', 'CogniteAsset/v1', 'type'],
            value: { space: SPACE, externalId: 'TYPE-PLTF' },
          },
        },
      });
    });

    it('parses items and returns the next cursor', async () => {
      vi.mocked(instances.list).mockResolvedValue(
        makeListResponse([makeRawNode({ externalId: 'A', properties: { name: 'Alpha' } })], 'next'),
      );

      const page = await service.listAssets({});

      expect(page.nextCursor).toBe('next');
      expect(page.items.map((a) => a.name)).toEqual(['Alpha']);
    });

    it('skips nodes that have no asset data', async () => {
      vi.mocked(instances.list).mockResolvedValue(
        makeListResponse([makeRawNode({ viewKey: 'Other/v1' }), makeRawNode({ externalId: 'B' })]),
      );

      const page = await service.listAssets({});

      expect(page.items.map((a) => a.externalId)).toEqual(['B']);
    });

    it('rejects when the request fails', async () => {
      vi.mocked(instances.list).mockRejectedValue(new Error('boom'));

      await expect(service.listAssets({})).rejects.toThrow('boom');
    });
  });

  describe('listAssets with a search query', () => {
    it('searches the CogniteAsset view with the trimmed query and type filter', async () => {
      await service.listAssets({
        query: '  tequila ',
        type: { space: SPACE, externalId: 'TYPE-PLTF' },
      });

      expect(instances.search).toHaveBeenCalledWith({
        view: ASSET_VIEW,
        instanceType: 'node',
        query: 'tequila',
        limit: 50,
        filter: {
          equals: {
            property: ['cdf_cdm', 'CogniteAsset/v1', 'type'],
            value: { space: SPACE, externalId: 'TYPE-PLTF' },
          },
        },
      });
      expect(instances.list).not.toHaveBeenCalled();
    });

    it('returns parsed items and no cursor, since search is not paginated', async () => {
      vi.mocked(instances.search).mockResolvedValue(
        makeSearchResponse([makeRawNode({ externalId: 'T', properties: { name: 'Tequila' } })]),
      );

      const page = await service.listAssets({ query: 'tequila' });

      expect(page.items.map((a) => a.name)).toEqual(['Tequila']);
      expect(page.nextCursor).toBeUndefined();
    });

    it('treats a blank query as a plain list', async () => {
      await service.listAssets({ query: '   ' });

      expect(instances.list).toHaveBeenCalled();
      expect(instances.search).not.toHaveBeenCalled();
    });

    it('rejects when the search fails', async () => {
      vi.mocked(instances.search).mockRejectedValue(new Error('search failed'));

      await expect(service.listAssets({ query: 'x' })).rejects.toThrow('search failed');
    });
  });

  describe('listChildren', () => {
    it('filters assets by parent', async () => {
      await service.listChildren({ space: SPACE, externalId: 'FLD-1' }, 'cur');

      expect(instances.list).toHaveBeenCalledWith({
        instanceType: 'node',
        sources: [{ source: ASSET_VIEW }],
        limit: 50,
        cursor: 'cur',
        filter: {
          equals: {
            property: ['cdf_cdm', 'CogniteAsset/v1', 'parent'],
            value: { space: SPACE, externalId: 'FLD-1' },
          },
        },
      });
    });

    it('parses children and returns the cursor', async () => {
      vi.mocked(instances.list).mockResolvedValue(
        makeListResponse([makeRawNode({ externalId: 'C1' })], 'more'),
      );

      const page = await service.listChildren({ space: SPACE, externalId: 'FLD-1' });

      expect(page.items.map((a) => a.externalId)).toEqual(['C1']);
      expect(page.nextCursor).toBe('more');
    });
  });

  describe('getAssets', () => {
    it('does not call the API for no refs', async () => {
      const result = await service.getAssets([]);

      expect(result).toEqual([]);
      expect(instances.retrieve).not.toHaveBeenCalled();
    });

    it('retrieves deduplicated refs with the asset view', async () => {
      await service.getAssets([
        { space: SPACE, externalId: 'A' },
        { space: SPACE, externalId: 'A' },
        { space: SPACE, externalId: 'B' },
      ]);

      expect(instances.retrieve).toHaveBeenCalledWith({
        sources: [{ source: ASSET_VIEW }],
        items: [
          { instanceType: 'node', space: SPACE, externalId: 'A' },
          { instanceType: 'node', space: SPACE, externalId: 'B' },
        ],
      });
    });

    it('returns assets in the order of the requested refs and drops missing ones', async () => {
      vi.mocked(instances.retrieve).mockResolvedValue(
        makeRetrieveResponse([makeRawNode({ externalId: 'B' }), makeRawNode({ externalId: 'A' })]),
      );

      const result = await service.getAssets([
        { space: SPACE, externalId: 'A' },
        { space: SPACE, externalId: 'MISSING' },
        { space: SPACE, externalId: 'B' },
      ]);

      expect(result.map((a) => a.externalId)).toEqual(['A', 'B']);
    });

    it('rejects when retrieval fails', async () => {
      vi.mocked(instances.retrieve).mockRejectedValue(new Error('nope'));

      await expect(service.getAssets([{ space: SPACE, externalId: 'A' }])).rejects.toThrow('nope');
    });
  });

  describe('listAssetTypes', () => {
    it('lists nodes of the CogniteAssetType view', async () => {
      await service.listAssetTypes();

      expect(instances.list).toHaveBeenCalledWith({
        instanceType: 'node',
        sources: [{ source: TYPE_VIEW }],
        limit: 1000,
      });
    });

    it('parses and sorts types by name', async () => {
      vi.mocked(instances.list).mockResolvedValue(
        makeListResponse([
          makeRawNode({ externalId: 'T2', viewKey: 'CogniteAssetType/v1', properties: { name: 'Zone' } }),
          makeRawNode({ externalId: 'T1', viewKey: 'CogniteAssetType/v1', properties: { name: 'Area' } }),
        ]),
      );

      const types = await service.listAssetTypes();

      expect(types.map((t) => t.name)).toEqual(['Area', 'Zone']);
    });
  });
});
