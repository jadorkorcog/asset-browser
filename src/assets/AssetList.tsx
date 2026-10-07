import { Badge } from '@cognite/aura/components/badge';
import { Button } from '@cognite/aura/components/button';
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from '@cognite/aura/components/empty-state';

import { LoadableContent } from '../components/LoadableContent';

import { isSameRef, type InstanceRef } from './assetTypes';
import type { Loadable, PagedAssets } from './useAssetBrowserViewModel';

type Props = {
  assets: Loadable<PagedAssets>;
  selectedRef?: InstanceRef;
  typeLabel: (ref?: InstanceRef) => string | undefined;
  onSelect: (ref: InstanceRef) => void;
  onLoadMore: () => void;
};

export function AssetList({ assets, selectedRef, typeLabel, onSelect, onLoadMore }: Props) {
  return (
    <LoadableContent loadable={assets} loadingLabel="Loading assets..." errorTitle="Could not load assets">
      {({ items, hasMore, isLoadingMore }) =>
        items.length === 0 ? (
          <EmptyState>
            <EmptyStateTitle>No assets found</EmptyStateTitle>
            <EmptyStateDescription>Try a different search or filter.</EmptyStateDescription>
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            <ul className="flex flex-col gap-1">
              {items.map((asset) => {
                const isSelected = selectedRef !== undefined && isSameRef(asset, selectedRef);
                const label = typeLabel(asset.type);
                return (
                  <li key={`${asset.space}/${asset.externalId}`}>
                    <Button
                      variant={isSelected ? 'secondary' : 'ghost'}
                      className="h-auto w-full justify-between gap-3 py-2 text-left"
                      aria-current={isSelected ? 'true' : undefined}
                      onClick={() => onSelect({ space: asset.space, externalId: asset.externalId })}
                    >
                      <span className="flex min-w-0 flex-col items-start">
                        <span className="truncate font-medium">{asset.name}</span>
                        {asset.description ? (
                          <span className="truncate text-sm text-muted-foreground">{asset.description}</span>
                        ) : null}
                      </span>
                      {label ? <Badge variant="mountain">{label}</Badge> : null}
                    </Button>
                  </li>
                );
              })}
            </ul>
            {hasMore ? (
              <Button variant="outline" onClick={onLoadMore} disabled={isLoadingMore}>
                {isLoadingMore ? 'Loading...' : 'Load more'}
              </Button>
            ) : null}
          </div>
        )
      }
    </LoadableContent>
  );
}
