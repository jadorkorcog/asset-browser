import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadableContent } from './LoadableContent';

describe(LoadableContent.name, () => {
  it('shows the loading label while loading', () => {
    render(
      <LoadableContent loadable={{ status: 'loading' }} loadingLabel="Loading things..." errorTitle="Could not load">
        {() => <span>content</span>}
      </LoadableContent>,
    );

    expect(screen.getByText('Loading things...')).toBeInTheDocument();
    expect(screen.queryByText('content')).not.toBeInTheDocument();
  });

  it('shows the error title and message on error', () => {
    render(
      <LoadableContent
        loadable={{ status: 'error', message: 'boom' }}
        loadingLabel="Loading"
        errorTitle="Could not load things"
      >
        {() => <span>content</span>}
      </LoadableContent>,
    );

    expect(screen.getByText('Could not load things')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
  });

  it('renders children with the data when ready', () => {
    render(
      <LoadableContent loadable={{ status: 'ready', data: 'hello' }} loadingLabel="Loading" errorTitle="Error">
        {(data) => <span>{`data: ${data}`}</span>}
      </LoadableContent>,
    );

    expect(screen.getByText('data: hello')).toBeInTheDocument();
  });
});
