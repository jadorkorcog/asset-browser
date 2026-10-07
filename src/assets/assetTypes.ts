export type InstanceRef = { space: string; externalId: string };

export type Asset = {
  space: string;
  externalId: string;
  name: string;
  description?: string;
  type?: InstanceRef;
  parent?: InstanceRef;
  root?: InstanceRef;
  path: InstanceRef[];
  tags: string[];
  aliases: string[];
  source?: InstanceRef;
  sourceContext?: string;
};

export type AssetType = InstanceRef & { name: string };

export type AssetPage = { items: Asset[]; nextCursor?: string };

export function refKey(ref: InstanceRef): string {
  return `${ref.space}/${ref.externalId}`;
}

export function isSameRef(a: InstanceRef, b: InstanceRef): boolean {
  return a.space === b.space && a.externalId === b.externalId;
}
