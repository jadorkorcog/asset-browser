import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HostSyncContext, type HostSync } from '../host/hostSync';

import { serializeBrowserState } from './assetBrowserState';
import { AssetBrowserStateProvider } from './AssetBrowserStateProvider';
import { AssetBrowserView } from './AssetBrowserView';
import type { AssetService } from './AssetService';
import type { Asset, AssetPage, InstanceRef } from './assetTypes';
import { AssetBrowserViewModelContext } from './useAssetBrowserViewModel';

const SPACE = 'sp.test';

describe(AssetBrowserView.name, () => {
  let service: AssetService;
  let sync: HostSync;
  let initialState: string | undefined;

  beforeEach(() => {
    initialState = undefined;
    sync = { syncInternalState: vi.fn(() => Promise.resolve(true)) };
    service = {
      listAssets: vi.fn(({ query }) =>
        Promise.resolve(
          query ? page([makeAsset('TEQ', 'Tequila')]) : page([makeAsset('PLTF-1', 'Platform 1'), makeAsset('TEQ', 'Tequila')]),
        ),
      ),
      listChildren: vi.fn(() => Promise.resolve(page([makeAsset('C1', 'Child 1')]))),
      getAssets: vi.fn((refs: InstanceRef[]) =>
        Promise.resolve(
          refs.map((requested) =>
            requested.externalId === 'PLTF-1'
              ? { ...makeAsset('PLTF-1', 'Platform 1'), path: [ref('ROOT'), ref('PLTF-1')], description: 'Fixed Leg platform' }
              : makeAsset(requested.externalId, requested.externalId === 'ROOT' ? 'Root' : requested.externalId),
          ),
        ),
      ),
      listAssetTypes: vi.fn(() => Promise.resolve([{ ...ref('T1'), name: 'Platform' }])),
    };
  });

  it('lists assets once loaded', async () => {
    renderView();

    expect(await screen.findByRole('button', { name: /Platform 1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tequila/ })).toBeInTheDocument();
  });

  it('shows an error when the asset list fails', async () => {
    vi.mocked(service.listAssets).mockRejectedValue(new Error('list failed'));
    renderView();

    expect(await screen.findByText('Could not load assets')).toBeInTheDocument();
    expect(screen.getByText('list failed')).toBeInTheDocument();
  });

  it('shows the empty detail prompt before anything is selected', async () => {
    renderView();

    expect(await screen.findByText('Select an asset')).toBeInTheDocument();
  });

  it('filters the list after searching and syncs the query to the host', async () => {
    renderView();
    await screen.findByRole('button', { name: /Platform 1/ });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search assets' }), 'tequila{enter}');

    await waitFor(() => expect(screen.queryByRole('button', { name: /Platform 1/ })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Tequila/ })).toBeInTheDocument();
    expect(sync.syncInternalState).toHaveBeenCalledWith(serializeBrowserState({ query: 'tequila' }));
  });

  it('opens the details with hierarchy and children when an asset is selected', async () => {
    renderView();

    await userEvent.click(await screen.findByRole('button', { name: /Platform 1/ }));

    const details = screen.getByRole('region', { name: 'Asset details' });
    expect(await within(details).findByRole('heading', { name: 'Platform 1' })).toBeInTheDocument();
    expect(within(details).getByText('Fixed Leg platform')).toBeInTheDocument();
    expect(within(details).getByRole('button', { name: 'Root' })).toBeInTheDocument();
    expect(await within(details).findByRole('button', { name: 'Child 1' })).toBeInTheDocument();
    expect(sync.syncInternalState).toHaveBeenCalledWith(serializeBrowserState({ query: '', selected: ref('PLTF-1') }));
  });

  it('navigates to an ancestor from the breadcrumbs', async () => {
    renderView();
    await userEvent.click(await screen.findByRole('button', { name: /Platform 1/ }));
    const details = screen.getByRole('region', { name: 'Asset details' });

    await userEvent.click(await within(details).findByRole('button', { name: 'Root' }));

    await waitFor(() => expect(service.getAssets).toHaveBeenCalledWith([ref('ROOT')]));
  });

  it('restores the selected asset from the initial host state', async () => {
    initialState = serializeBrowserState({ query: '', selected: ref('PLTF-1') });
    renderView();

    const details = screen.getByRole('region', { name: 'Asset details' });

    expect(await within(details).findByRole('heading', { name: 'Platform 1' })).toBeInTheDocument();
  });

  it('closes the details panel', async () => {
    renderView();
    await userEvent.click(await screen.findByRole('button', { name: /Platform 1/ }));
    const details = screen.getByRole('region', { name: 'Asset details' });

    await userEvent.click(await within(details).findByRole('button', { name: 'Close' }));

    expect(await screen.findByText('Select an asset')).toBeInTheDocument();
  });

  function renderView() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={queryClient}>
        <HostSyncContext.Provider value={{ sync }}>
          <AssetBrowserViewModelContext.Provider value={{ useAssetService: () => service }}>
            <AssetBrowserStateProvider initialState={initialState}>
              <AssetBrowserView />
            </AssetBrowserStateProvider>
          </AssetBrowserViewModelContext.Provider>
        </HostSyncContext.Provider>
      </QueryClientProvider>,
    );
  }
});

function ref(externalId: string): InstanceRef {
  return { space: SPACE, externalId };
}

function makeAsset(externalId: string, name: string): Asset {
  return { space: SPACE, externalId, name, path: [], tags: [], aliases: [] };
}

function page(items: Asset[]): AssetPage {
  return { items };
}
