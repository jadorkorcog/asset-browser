import { describe, expect, it } from 'vitest';

import {
  DEFAULT_BROWSER_STATE,
  parseBrowserState,
  serializeBrowserState,
  type AssetBrowserState,
} from './assetBrowserState';

describe(parseBrowserState.name, () => {
  it('returns the default state when there is no saved state', () => {
    expect(parseBrowserState(undefined)).toEqual(DEFAULT_BROWSER_STATE);
  });

  it('returns the default state for an empty string', () => {
    expect(parseBrowserState('')).toEqual(DEFAULT_BROWSER_STATE);
  });

  it('returns the default state for malformed JSON', () => {
    expect(parseBrowserState('{not json')).toEqual(DEFAULT_BROWSER_STATE);
  });

  it('returns the default state when the value is not an object', () => {
    expect(parseBrowserState('"hello"')).toEqual(DEFAULT_BROWSER_STATE);
    expect(parseBrowserState('null')).toEqual(DEFAULT_BROWSER_STATE);
  });

  it('restores a saved query, type, and selected asset', () => {
    const saved: AssetBrowserState = {
      query: 'tequila',
      type: { space: 'sp', externalId: 'TYPE-PLTF' },
      selected: { space: 'sp', externalId: 'PLTF-1' },
    };

    expect(parseBrowserState(JSON.stringify(saved))).toEqual(saved);
  });

  it('drops fields with the wrong shape but keeps valid ones', () => {
    const raw = JSON.stringify({ query: 42, type: { space: 'sp' }, selected: { space: 'sp', externalId: 'A' } });

    expect(parseBrowserState(raw)).toEqual({
      query: '',
      type: undefined,
      selected: { space: 'sp', externalId: 'A' },
    });
  });
});

describe(serializeBrowserState.name, () => {
  it('round-trips through parseBrowserState', () => {
    const state: AssetBrowserState = {
      query: 'x',
      type: { space: 'sp', externalId: 'T' },
      selected: { space: 'sp', externalId: 'A' },
    };

    expect(parseBrowserState(serializeBrowserState(state))).toEqual(state);
  });

  it('omits undefined fields', () => {
    expect(serializeBrowserState({ query: '' })).toBe(JSON.stringify({ query: '' }));
  });
});
