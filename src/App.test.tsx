import type { ConnectToHostAppResult, HostAppAPI } from '@cognite/app-sdk';
import { CogniteClient } from '@cognite/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App from './App';
import { serializeBrowserState } from './assets/assetBrowserState';

type AppDeps = NonNullable<ComponentProps<typeof App>['deps']>;
type AppApi = Pick<HostAppAPI, 'syncInternalState'>;

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the loading state while connecting to the host', () => {
    render(
      <App deps={makeLoadingDeps()} connectToHostApp={() => new Promise<never>(() => undefined)} />,
      { wrapper: Providers },
    );

    expect(screen.getByText('Loading project...')).toBeInTheDocument();
  });

  it('renders the asset browser once connected', async () => {
    render(<App deps={makeDeps()} connectToHostApp={() => Promise.resolve({ api: makeApi() })} />, {
      wrapper: Providers,
    });

    expect(await screen.findByRole('heading', { name: 'Asset browser' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Search assets' })).toBeInTheDocument();
  });

  it('restores the search query from the host initial state', async () => {
    const initialState = serializeBrowserState({ query: 'tequila' });
    render(<App deps={makeDeps()} connectToHostApp={() => Promise.resolve({ api: makeApi(), initialState })} />, {
      wrapper: Providers,
    });

    expect(await screen.findByRole('searchbox', { name: 'Search assets' })).toHaveValue('tequila');
  });
});

function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function makeApi(): AppApi {
  return {
    syncInternalState: vi.fn<HostAppAPI['syncInternalState']>(() => Promise.resolve(true)),
  };
}

function makeDeps(): AppDeps {
  return {
    connectToHostApp: vi.fn<AppDeps['connectToHostApp']>(() =>
      Promise.resolve({
        api: {
          getProject: vi.fn<HostAppAPI['getProject']>(() => Promise.resolve('test-project')),
          getBaseUrl: vi.fn<HostAppAPI['getBaseUrl']>(() => Promise.resolve('https://cognite.test')),
          getAccessToken: vi.fn<HostAppAPI['getAccessToken']>(() => Promise.resolve('test-token')),
          getAppId: vi.fn<HostAppAPI['getAppId']>(() => Promise.resolve('test-app-id')),
        } as Partial<HostAppAPI> as HostAppAPI,
      }),
    ),
    createClient: vi.fn<AppDeps['createClient']>((config) => new CogniteClient(config)),
  };
}

function makeLoadingDeps(): AppDeps {
  return {
    connectToHostApp: vi.fn<AppDeps['connectToHostApp']>(() => new Promise<ConnectToHostAppResult>(() => undefined)),
    createClient: vi.fn<AppDeps['createClient']>((config) => new CogniteClient(config)),
  };
}
