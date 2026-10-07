import { Alert, AlertDescription, AlertTitle } from '@cognite/aura/components/alert';
import { Loader } from '@cognite/aura/components/loader';
import type { ReactNode } from 'react';

import type { Loadable } from '../assets/useAssetBrowserViewModel';

type Props<T> = {
  loadable: Loadable<T>;
  loadingLabel: string;
  errorTitle: string;
  children: (data: T) => ReactNode;
};

export function LoadableContent<T>({ loadable, loadingLabel, errorTitle, children }: Props<T>) {
  if (loadable.status === 'loading') {
    return (
      <div role="status" className="inline-flex items-center gap-3 p-2 text-muted-foreground">
        <Loader size={20} />
        <span>{loadingLabel}</span>
      </div>
    );
  }

  if (loadable.status === 'error') {
    return (
      <Alert variant="error">
        <AlertTitle>{errorTitle}</AlertTitle>
        <AlertDescription>{loadable.message}</AlertDescription>
      </Alert>
    );
  }

  return <>{children(loadable.data)}</>;
}
