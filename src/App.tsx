import { connectToHostApp as connectToHostAppImpl } from '@cognite/app-sdk';
import { CogniteSdkProvider } from '@cognite/app-sdk/react';
import { Alert, AlertDescription } from '@cognite/aura/components/alert';
import { Card, CardContent } from '@cognite/aura/components/card';
import { Loader } from '@cognite/aura/components/loader';
import { useEffect, useMemo, useState } from 'react';
import type { ComponentProps } from 'react';

import { AssetBrowserStateProvider } from './assets/AssetBrowserStateProvider';
import { AssetBrowserView } from './assets/AssetBrowserView';
import { HostSyncContext, type HostSync } from './host/hostSync';

type AppConnectResult = { api: HostSync; initialState?: string };

const loadingFallback = (
  <main className="min-h-screen bg-muted/50 text-foreground">
    <section className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center p-4 sm:p-8">
      <div className="mx-auto w-full max-w-sm">
        <Card aria-label="Loading project" aria-live="polite">
          <CardContent>
            <div className="inline-flex items-center gap-3 text-muted-foreground">
              <Loader size={20} />
              <span>Loading project...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </main>
);

const errorFallback = (
  <main className="min-h-screen bg-muted/50 text-foreground">
    <section className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center p-4 sm:p-8">
      <div className="mx-auto w-full max-w-sm">
        <Alert variant="error">
          <AlertDescription>Failed to connect to Fusion host</AlertDescription>
        </Alert>
      </div>
    </section>
  </main>
);

type AppProps = {
  deps?: ComponentProps<typeof CogniteSdkProvider>['deps'];
  connectToHostApp?: () => Promise<AppConnectResult>;
};

function App({ deps, connectToHostApp = deps?.connectToHostApp ?? connectToHostAppImpl }: AppProps) {
  const [connection, setConnection] = useState<AppConnectResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    void connectToHostApp().then((result) => {
      if (!cancelled) setConnection(result);
    });
    return () => {
      cancelled = true;
    };
  }, [connectToHostApp]);

  const hostSync = useMemo(() => ({ sync: connection?.api ?? null }), [connection]);

  return (
    <CogniteSdkProvider loadingFallback={loadingFallback} errorFallback={errorFallback} deps={deps}>
      {connection ? (
        <HostSyncContext.Provider value={hostSync}>
          <AssetBrowserStateProvider initialState={connection.initialState}>
            <AssetBrowserView />
          </AssetBrowserStateProvider>
        </HostSyncContext.Provider>
      ) : (
        loadingFallback
      )}
    </CogniteSdkProvider>
  );
}

export default App;
