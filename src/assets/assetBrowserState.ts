import type { InstanceRef } from './assetTypes';

/** UI state that must survive reloads and shared links (synced to the host URL). */
export type AssetBrowserState = {
  query: string;
  type?: InstanceRef;
  selected?: InstanceRef;
};

export const DEFAULT_BROWSER_STATE: AssetBrowserState = { query: '' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRef(value: unknown): InstanceRef | undefined {
  if (!isRecord(value)) return undefined;
  const { space, externalId } = value;
  if (typeof space !== 'string' || typeof externalId !== 'string') return undefined;
  return { space, externalId };
}

export function parseBrowserState(raw: string | undefined): AssetBrowserState {
  if (!raw) return DEFAULT_BROWSER_STATE;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return DEFAULT_BROWSER_STATE;
    return {
      query: typeof parsed.query === 'string' ? parsed.query : '',
      type: toRef(parsed.type),
      selected: toRef(parsed.selected),
    };
  } catch {
    return DEFAULT_BROWSER_STATE;
  }
}

export function serializeBrowserState(state: AssetBrowserState): string {
  return JSON.stringify(state);
}
