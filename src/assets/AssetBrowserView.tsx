import { AssetDetailPanel } from './AssetDetailPanel';
import { AssetList } from './AssetList';
import { AssetSearchBar } from './AssetSearchBar';
import { refKey, type InstanceRef } from './assetTypes';
import { useAssetBrowserViewModel } from './useAssetBrowserViewModel';

export function AssetBrowserView() {
  const vm = useAssetBrowserViewModel();

  const typeNames = new Map(
    vm.assetTypes.status === 'ready' ? vm.assetTypes.data.map((type) => [refKey(type), type.name]) : [],
  );
  const typeLabel = (ref?: InstanceRef) => (ref ? typeNames.get(refKey(ref)) : undefined);

  return (
    <main className="min-h-screen bg-muted/50 text-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 sm:p-8">
        <header className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold">Asset browser</h1>
          <p className="text-muted-foreground">
            Search the asset hierarchy, open an asset, and explore where it sits.
          </p>
        </header>

        <AssetSearchBar
          query={vm.query}
          types={vm.assetTypes}
          selectedType={vm.selectedType}
          onSearch={vm.setQuery}
          onTypeChange={vm.setType}
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section aria-label="Assets">
            <AssetList
              assets={vm.assets}
              selectedRef={vm.selectedRef}
              typeLabel={typeLabel}
              onSelect={vm.selectAsset}
              onLoadMore={vm.loadMoreAssets}
            />
          </section>
          <section aria-label="Asset details">
            <AssetDetailPanel
              detail={vm.detail}
              typeLabel={typeLabel}
              onSelect={vm.selectAsset}
              onClose={vm.clearSelection}
              onLoadMoreChildren={vm.loadMoreChildren}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
