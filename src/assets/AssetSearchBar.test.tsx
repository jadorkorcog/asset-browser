import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AssetSearchBar } from './AssetSearchBar';
import type { AssetType, InstanceRef } from './assetTypes';
import type { Loadable } from './useAssetBrowserViewModel';

const SPACE = 'sp.test';

describe(AssetSearchBar.name, () => {
  it('shows the current query in the search box', () => {
    renderBar({ query: 'tequila' });

    expect(screen.getByRole('searchbox', { name: 'Search assets' })).toHaveValue('tequila');
  });

  it('submits the trimmed query on enter', async () => {
    const onSearch = vi.fn();
    renderBar({ onSearch });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search assets' }), '  cerveza {enter}');

    expect(onSearch).toHaveBeenCalledWith('cerveza');
  });

  it('submits when the search button is clicked', async () => {
    const onSearch = vi.fn();
    renderBar({ onSearch });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search assets' }), 'tequila');
    await userEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(onSearch).toHaveBeenCalledWith('tequila');
  });

  it('does not search on every keystroke', async () => {
    const onSearch = vi.fn();
    renderBar({ onSearch });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search assets' }), 'abc');

    expect(onSearch).not.toHaveBeenCalled();
  });

  it('shows the selected type label', () => {
    renderBar({ selectedType: ref('T1') });

    expect(screen.getByRole('combobox', { name: 'Asset type' })).toHaveTextContent('Platform');
  });

  it('shows All types when no type is selected', () => {
    renderBar({});

    expect(screen.getByRole('combobox', { name: 'Asset type' })).toHaveTextContent('All types');
  });

  it('changes the type when an option is chosen', async () => {
    const onTypeChange = vi.fn();
    renderBar({ onTypeChange });

    await userEvent.click(screen.getByRole('combobox', { name: 'Asset type' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Platform' }));

    expect(onTypeChange).toHaveBeenCalledWith(ref('T1'));
  });

  it('clears the type when All types is chosen', async () => {
    const onTypeChange = vi.fn();
    renderBar({ selectedType: ref('T1'), onTypeChange });

    await userEvent.click(screen.getByRole('combobox', { name: 'Asset type' }));
    await userEvent.click(await screen.findByRole('option', { name: 'All types' }));

    expect(onTypeChange).toHaveBeenCalledWith(undefined);
  });

  it('disables the type filter while types load', () => {
    renderBar({ types: { status: 'loading' } });

    expect(screen.getByRole('combobox', { name: 'Asset type' })).toBeDisabled();
  });

  it('shows a message when types fail to load', () => {
    renderBar({ types: { status: 'error', message: 'nope' } });

    expect(screen.getByText('Could not load asset types')).toBeInTheDocument();
  });
});

type Overrides = Partial<{
  query: string;
  types: Loadable<AssetType[]>;
  selectedType: InstanceRef;
  onSearch: (query: string) => void;
  onTypeChange: (type: InstanceRef | undefined) => void;
}>;

function renderBar(overrides: Overrides) {
  return render(
    <AssetSearchBar
      query={overrides.query ?? ''}
      types={overrides.types ?? { status: 'ready', data: [{ ...ref('T1'), name: 'Platform' }] }}
      selectedType={overrides.selectedType}
      onSearch={overrides.onSearch ?? vi.fn()}
      onTypeChange={overrides.onTypeChange ?? vi.fn()}
    />,
  );
}

function ref(externalId: string): InstanceRef {
  return { space: SPACE, externalId };
}
