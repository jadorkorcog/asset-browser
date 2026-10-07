import { Button } from '@cognite/aura/components/button';
import { Search } from '@cognite/aura/components/search';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@cognite/aura/components/select';
import { useState } from 'react';
import type { FormEvent } from 'react';

import { refKey, type AssetType, type InstanceRef } from './assetTypes';
import type { Loadable } from './useAssetBrowserViewModel';

const ALL_TYPES = '__all__';

type Props = {
  query: string;
  types: Loadable<AssetType[]>;
  selectedType?: InstanceRef;
  onSearch: (query: string) => void;
  onTypeChange: (type: InstanceRef | undefined) => void;
};

export function AssetSearchBar({ query, types, selectedType, onSearch, onTypeChange }: Props) {
  const [draft, setDraft] = useState(query);
  const options = types.status === 'ready' ? types.data : [];
  const items = [
    { value: ALL_TYPES, label: 'All types' },
    ...options.map((type) => ({ value: refKey(type), label: type.name })),
  ];

  function submit(event: FormEvent) {
    event.preventDefault();
    onSearch(draft.trim());
  }

  function clear() {
    setDraft('');
    onSearch('');
  }

  function changeType(value: string) {
    const match = options.find((type) => refKey(type) === value);
    onTypeChange(match ? { space: match.space, externalId: match.externalId } : undefined);
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={submit} role="search" className="flex flex-wrap items-center gap-2">
        <div className="min-w-48 flex-1">
          <Search
            aria-label="Search assets"
            placeholder="Search assets by name or description"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onClear={clear}
          />
        </div>
        <Button type="submit">Search</Button>
        <Select
          items={items}
          value={selectedType ? refKey(selectedType) : ALL_TYPES}
          onValueChange={changeType}
          disabled={types.status !== 'ready'}
        >
          <SelectTrigger aria-label="Asset type" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </form>
      {types.status === 'error' ? (
        <p role="alert" className="text-sm text-muted-foreground">
          Could not load asset types
        </p>
      ) : null}
    </div>
  );
}
