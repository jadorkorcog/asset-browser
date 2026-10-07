import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AssetDetailPanel } from './AssetDetailPanel';
import type { Asset, InstanceRef } from './assetTypes';
import type { AssetBrowserViewModel, AssetDetail, Loadable, PagedAssets } from './useAssetBrowserViewModel';

const SPACE = 'sp.test';

type Detail = NonNullable<AssetBrowserViewModel['detail']>;

describe(AssetDetailPanel.name, () => {
  it('prompts to select an asset when nothing is selected', () => {
    renderPanel({ detail: undefined });

    expect(screen.getByText('Select an asset')).toBeInTheDocument();
  });

  it('shows a loading state for the asset', () => {
    renderPanel({ detail: makeDetail({ asset: { status: 'loading' } }) });

    expect(screen.getByText('Loading asset...')).toBeInTheDocument();
  });

  it('shows an error state for the asset', () => {
    renderPanel({ detail: makeDetail({ asset: { status: 'error', message: 'asset failed' } }) });

    expect(screen.getByText('Could not load asset')).toBeInTheDocument();
    expect(screen.getByText('asset failed')).toBeInTheDocument();
  });

  it('shows the asset name, description, type, source and tags', () => {
    const asset: Asset = {
      ...makeAsset('PLTF-1', 'Platform 1'),
      description: 'Fixed Leg platform',
      type: ref('T'),
      sourceContext: 'BSEE-Platform',
      tags: ['EB110', 'Water depth [ft]: 660'],
      aliases: ['10242'],
    };

    renderPanel({ detail: makeDetail({ asset: readyAsset(asset, []) }), typeLabel: () => 'Platform' });

    expect(screen.getByRole('heading', { name: 'Platform 1' })).toBeInTheDocument();
    expect(screen.getByText('Fixed Leg platform')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('BSEE-Platform')).toBeInTheDocument();
    expect(screen.getByText('EB110')).toBeInTheDocument();
    expect(screen.getByText('Water depth [ft]: 660')).toBeInTheDocument();
    expect(screen.getByText('10242')).toBeInTheDocument();
  });

  it('renders ancestors as breadcrumbs and selects one when clicked', async () => {
    const onSelect = vi.fn();
    const asset = makeAsset('PLTF-1', 'Platform 1');
    const ancestors = [makeAsset('ROOT', 'Root'), makeAsset('FLD', 'Field')];
    renderPanel({ detail: makeDetail({ asset: readyAsset(asset, ancestors) }), onSelect });

    await userEvent.click(screen.getByRole('button', { name: 'Field' }));

    expect(onSelect).toHaveBeenCalledWith(ref('FLD'));
    expect(screen.getByRole('button', { name: 'Root' })).toBeInTheDocument();
  });

  it('clears the selection when close is clicked', async () => {
    const onClose = vi.fn();
    renderPanel({ detail: makeDetail({}), onClose });

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalled();
  });

  it('shows a loading state for children', () => {
    renderPanel({ detail: makeDetail({ children: { status: 'loading' } }) });

    expect(screen.getByText('Loading children...')).toBeInTheDocument();
  });

  it('shows an error state for children', () => {
    renderPanel({ detail: makeDetail({ children: { status: 'error', message: 'kids failed' } }) });

    expect(screen.getByText('Could not load children')).toBeInTheDocument();
  });

  it('shows an empty state when there are no children', () => {
    renderPanel({ detail: makeDetail({ children: readyChildren([]) }) });

    expect(screen.getByText('No child assets')).toBeInTheDocument();
  });

  it('lists children and selects one when clicked', async () => {
    const onSelect = vi.fn();
    renderPanel({ detail: makeDetail({ children: readyChildren([makeAsset('C1', 'Child 1')]) }), onSelect });

    await userEvent.click(screen.getByRole('button', { name: 'Child 1' }));

    expect(onSelect).toHaveBeenCalledWith(ref('C1'));
  });

  it('offers to load more children', async () => {
    const onLoadMoreChildren = vi.fn();
    renderPanel({
      detail: makeDetail({ children: readyChildren([makeAsset('C1', 'Child 1')], { hasMore: true }) }),
      onLoadMoreChildren,
    });

    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));

    expect(onLoadMoreChildren).toHaveBeenCalled();
  });
});

type Overrides = Partial<{
  detail: Detail | undefined;
  typeLabel: (ref?: InstanceRef) => string | undefined;
  onSelect: (ref: InstanceRef) => void;
  onClose: () => void;
  onLoadMoreChildren: () => void;
}>;

function renderPanel(overrides: Overrides) {
  return render(
    <AssetDetailPanel
      detail={'detail' in overrides ? overrides.detail : makeDetail({})}
      typeLabel={overrides.typeLabel ?? (() => undefined)}
      onSelect={overrides.onSelect ?? vi.fn()}
      onClose={overrides.onClose ?? vi.fn()}
      onLoadMoreChildren={overrides.onLoadMoreChildren ?? vi.fn()}
    />,
  );
}

function makeDetail(overrides: Partial<Detail>): Detail {
  return {
    asset: readyAsset(makeAsset('PLTF-1', 'Platform 1'), []),
    children: readyChildren([]),
    ...overrides,
  };
}

function readyAsset(asset: Asset, ancestors: Asset[]): Loadable<AssetDetail> {
  return { status: 'ready', data: { asset, ancestors } };
}

function readyChildren(items: Asset[], extra: Partial<PagedAssets> = {}): Loadable<PagedAssets> {
  return { status: 'ready', data: { items, hasMore: false, isLoadingMore: false, ...extra } };
}

function ref(externalId: string): InstanceRef {
  return { space: SPACE, externalId };
}

function makeAsset(externalId: string, name: string): Asset {
  return { space: SPACE, externalId, name, path: [], tags: [], aliases: [] };
}
