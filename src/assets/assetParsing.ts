import type { Asset, AssetType, InstanceRef } from './assetTypes';

export type RawInstance = {
  space: string;
  externalId: string;
  instanceType: string;
  properties?: unknown;
};

const CORE_SPACE = 'cdf_cdm';
const ASSET_VIEW_KEY = 'CogniteAsset/v1';
const ASSET_TYPE_VIEW_KEY = 'CogniteAssetType/v1';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRef(value: unknown): InstanceRef | undefined {
  if (!isRecord(value)) return undefined;
  const { space, externalId } = value;
  if (typeof space !== 'string' || typeof externalId !== 'string') return undefined;
  return { space, externalId };
}

function toRefs(value: unknown): InstanceRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const ref = toRef(entry);
    return ref ? [ref] : [];
  });
}

function toStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === 'string');
}

function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function viewProperties(item: RawInstance, viewKey: string): Record<string, unknown> | undefined {
  if (!isRecord(item.properties)) return undefined;
  const space = item.properties[CORE_SPACE];
  if (!isRecord(space)) return undefined;
  const view = space[viewKey];
  return isRecord(view) ? view : undefined;
}

export function parseAsset(item: RawInstance): Asset | undefined {
  const props = viewProperties(item, ASSET_VIEW_KEY);
  if (!props) return undefined;
  return {
    space: item.space,
    externalId: item.externalId,
    name: toOptionalString(props.name) ?? item.externalId,
    description: toOptionalString(props.description),
    type: toRef(props.type),
    parent: toRef(props.parent),
    root: toRef(props.root),
    path: toRefs(props.path),
    tags: toStrings(props.tags),
    aliases: toStrings(props.aliases),
    source: toRef(props.source),
    sourceContext: toOptionalString(props.sourceContext),
  };
}

export function parseAssetType(item: RawInstance): AssetType | undefined {
  const props = viewProperties(item, ASSET_TYPE_VIEW_KEY);
  if (!props) return undefined;
  return {
    space: item.space,
    externalId: item.externalId,
    name: toOptionalString(props.name) ?? item.externalId,
  };
}
