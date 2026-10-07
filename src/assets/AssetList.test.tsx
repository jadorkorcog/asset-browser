import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AssetList } from './AssetList';
import type { Asset, InstanceRef } from './assetTypes';
import type { Loadable, PagedAssets } from './useAssetBrowserViewModel';

const SPACE = 'sp.test';

describe(AssetList.name, () => {
  it('shows a loading state', () => {
    renderList({ assets: { status: 'loading' } });

    expect(screen.getByText('Loading assets...')).toBeInTheDocument();
  });

  it('shows an error state', () => {
    renderList({ assets: { status: 'error', message: 'request failed' } });

    expect(screen.getByText('Could not load assets')).toBeInTheDocument();
    expect(screen.getByText('request failed')).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', () => {
    renderList({ assets: ready([]) });

    expect(screen.getByText('No assets found')).toBeInTheDocument();
  });

  it('renders each asset name, description and type label', () => {
    const asset = { ...makeAsset('A', 'Platform A'), description: 'Fixed Leg platform', type: ref('T') };

    renderList({ assets: ready([asset]), typeLabel: () => 'Platform' });

    expect(screen.getByText('Platform A')).toBeInTheDocument();
    expect(screen.getByText('Fixed Leg platform')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('selects an asset when its row is clicked', async () => {
    const onSelect = vi.fn();
    renderList({ assets: ready([makeAsset('A', 'Platform A')]), onSelect });

    await userEvent.click(screen.getByRole('button', { name: /Platform A/ }));

    expect(onSelect).toHaveBeenCalledWith(ref('A'));
  });

  it('marks the selected asset as current', () => {
    renderList({ assets: ready([makeAsset('A', 'Platform A')]), selectedRef: ref('A') });

    expect(screen.getByRole('button', { name: /Platform A/ })).toHaveAttribute('aria-current', 'true');
  });

  it('offers to load more when there are more results', async () => {
    const onLoadMore = vi.fn();
    renderList({ assets: ready([makeAsset('A', 'A')], { hasMore: true }), onLoadMore });

    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(onLoadMore).toHaveBeenCalled();
  });

  it('hides load more when there are no more results', () => {
    renderList({ assets: ready([makeAsset('A', 'A')]) });

    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
  });

  it('disables load more while the next page loads', () => {
    renderList({ assets: ready([makeAsset('A', 'A')], { hasMore: true, isLoadingMore: true }) });

    expect(screen.getByRole('button', { name: 'Loading...' })).toBeDisabled();
  });
});

type Overrides = Partial<{
  assets: Loadable<PagedAssets>;
  selectedRef: InstanceRef;
  typeLabel: (ref?: InstanceRef) => string | undefined;
  onSelect: (ref: InstanceRef) => void;
  onLoadMore: () => void;
}>;

function renderList(overrides: Overrides) {
  return render(
    <AssetList
      assets={overrides.assets ?? ready([])}
      selectedRef={overrides.selectedRef}
      typeLabel={overrides.typeLabel ?? (() => undefined)}
      onSelect={overrides.onSelect ?? vi.fn()}
      onLoadMore={overrides.onLoadMore ?? vi.fn()}
    />,
  );
}

function ready(items: Asset[], extra: Partial<PagedAssets> = {}): Loadable<PagedAssets> {
  return { status: 'ready', data: { items, hasMore: false, isLoadingMore: false, ...extra } };
}

function ref(externalId: string): InstanceRef {
  return { space: SPACE, externalId };
}

function makeAsset(externalId: string, name: string): Asset {
  return { space: SPACE, externalId, name, path: [], tags: [], aliases: [] };
}
