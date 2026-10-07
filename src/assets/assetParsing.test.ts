import { describe, expect, it } from 'vitest';

import { makeRawNode, SPACE } from '../__mocks__/assetFixtures';

import { parseAsset, parseAssetType } from './assetParsing';

describe(parseAsset.name, () => {
  it('maps all supported properties', () => {
    // Arrange
    const node = makeRawNode({
      externalId: 'PLTF-1',
      properties: {
        name: 'Platform A',
        description: 'Fixed Leg platform',
        type: { space: SPACE, externalId: 'TYPE-PLTF' },
        parent: { space: SPACE, externalId: 'FLD-1' },
        root: { space: SPACE, externalId: 'ROOT' },
        path: [
          { space: SPACE, externalId: 'ROOT' },
          { space: SPACE, externalId: 'FLD-1' },
          { space: SPACE, externalId: 'PLTF-1' },
        ],
        tags: ['EB110', 'Water depth [ft]: 660'],
        aliases: ['10242'],
        source: { space: SPACE, externalId: 'SRC-BSEE' },
        sourceContext: 'BSEE-Platform',
      },
    });

    // Act
    const asset = parseAsset(node);

    // Assert
    expect(asset).toEqual({
      space: SPACE,
      externalId: 'PLTF-1',
      name: 'Platform A',
      description: 'Fixed Leg platform',
      type: { space: SPACE, externalId: 'TYPE-PLTF' },
      parent: { space: SPACE, externalId: 'FLD-1' },
      root: { space: SPACE, externalId: 'ROOT' },
      path: [
        { space: SPACE, externalId: 'ROOT' },
        { space: SPACE, externalId: 'FLD-1' },
        { space: SPACE, externalId: 'PLTF-1' },
      ],
      tags: ['EB110', 'Water depth [ft]: 660'],
      aliases: ['10242'],
      source: { space: SPACE, externalId: 'SRC-BSEE' },
      sourceContext: 'BSEE-Platform',
    });
  });

  it('falls back to the external id when name is missing', () => {
    const asset = parseAsset(makeRawNode({ externalId: 'NO-NAME', properties: {} }));

    expect(asset?.name).toBe('NO-NAME');
  });

  it('defaults list properties to empty arrays', () => {
    const asset = parseAsset(makeRawNode({ properties: { name: 'X' } }));

    expect(asset).toMatchObject({ path: [], tags: [], aliases: [] });
  });

  it('ignores malformed relation and list values', () => {
    const asset = parseAsset(
      makeRawNode({
        properties: {
          name: 'X',
          parent: 'not-a-ref',
          path: [{ space: SPACE }, { space: SPACE, externalId: 'OK' }],
          tags: ['a', 3, null],
        },
      }),
    );

    expect(asset?.parent).toBeUndefined();
    expect(asset?.path).toEqual([{ space: SPACE, externalId: 'OK' }]);
    expect(asset?.tags).toEqual(['a']);
  });

  it('returns undefined when the node has no CogniteAsset data', () => {
    const node = makeRawNode({ viewKey: 'Other/v1' });

    expect(parseAsset(node)).toBeUndefined();
  });
});

describe(parseAssetType.name, () => {
  it('maps name and identity', () => {
    const node = makeRawNode({
      externalId: 'TYPE-PLTF',
      viewKey: 'CogniteAssetType/v1',
      properties: { name: 'Platform' },
    });

    expect(parseAssetType(node)).toEqual({ space: SPACE, externalId: 'TYPE-PLTF', name: 'Platform' });
  });

  it('falls back to the external id when name is missing', () => {
    const node = makeRawNode({
      externalId: 'TYPE-X',
      viewKey: 'CogniteAssetType/v1',
      properties: {},
    });

    expect(parseAssetType(node)?.name).toBe('TYPE-X');
  });

  it('returns undefined when the node has no CogniteAssetType data', () => {
    expect(parseAssetType(makeRawNode())).toBeUndefined();
  });
});
