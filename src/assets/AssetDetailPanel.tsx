import { Badge } from '@cognite/aura/components/badge';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbPageButton,
  BreadcrumbSeparator,
} from '@cognite/aura/components/breadcrumb';
import { Button } from '@cognite/aura/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@cognite/aura/components/card';
import { EmptyState, EmptyStateDescription, EmptyStateTitle } from '@cognite/aura/components/empty-state';
import { Fragment } from 'react';
import type { ReactNode } from 'react';

import { LoadableContent } from '../components/LoadableContent';

import type { Asset, InstanceRef } from './assetTypes';
import type { AssetBrowserViewModel } from './useAssetBrowserViewModel';

type Props = {
  detail: AssetBrowserViewModel['detail'];
  typeLabel: (ref?: InstanceRef) => string | undefined;
  onSelect: (ref: InstanceRef) => void;
  onClose: () => void;
  onLoadMoreChildren: () => void;
};

function toRef(asset: Asset): InstanceRef {
  return { space: asset.space, externalId: asset.externalId };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="flex flex-wrap gap-2">{children}</dd>
    </div>
  );
}

export function AssetDetailPanel({ detail, typeLabel, onSelect, onClose, onLoadMoreChildren }: Props) {
  if (!detail) {
    return (
      <EmptyState>
        <EmptyStateTitle>Select an asset</EmptyStateTitle>
        <EmptyStateDescription>Choose an asset from the list to see its details.</EmptyStateDescription>
      </EmptyState>
    );
  }

  return (
    <Card>
      <LoadableContent loadable={detail.asset} loadingLabel="Loading asset..." errorTitle="Could not load asset">
        {({ asset, ancestors }) => {
          const type = typeLabel(asset.type);
          return (
            <>
              <CardHeader>
                <div className="flex w-full items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-2">
                    <CardTitle as="h2">{asset.name}</CardTitle>
                    {ancestors.length > 0 ? (
                      <Breadcrumb aria-label="Asset hierarchy">
                        <BreadcrumbList>
                          {ancestors.map((ancestor) => (
                            <Fragment key={`${ancestor.space}/${ancestor.externalId}`}>
                              <BreadcrumbItem>
                                <BreadcrumbPageButton onClick={() => onSelect(toRef(ancestor))}>
                                  {ancestor.name}
                                </BreadcrumbPageButton>
                              </BreadcrumbItem>
                              <BreadcrumbSeparator />
                            </Fragment>
                          ))}
                          <BreadcrumbItem>
                            <BreadcrumbPage>{asset.name}</BreadcrumbPage>
                          </BreadcrumbItem>
                        </BreadcrumbList>
                      </Breadcrumb>
                    ) : null}
                  </div>
                  <Button variant="ghost" size="sm" onClick={onClose}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="flex flex-col gap-4">
                  {asset.description ? <Field label="Description">{asset.description}</Field> : null}
                  {type ? (
                    <Field label="Type">
                      <Badge variant="mountain">{type}</Badge>
                    </Field>
                  ) : null}
                  {asset.sourceContext ? <Field label="Source">{asset.sourceContext}</Field> : null}
                  {asset.aliases.length > 0 ? (
                    <Field label="Aliases">
                      {asset.aliases.map((alias) => (
                        <Badge key={alias} variant="gray">
                          {alias}
                        </Badge>
                      ))}
                    </Field>
                  ) : null}
                  {asset.tags.length > 0 ? (
                    <Field label="Tags">
                      {asset.tags.map((tag) => (
                        <Badge key={tag} variant="nordic">
                          {tag}
                        </Badge>
                      ))}
                    </Field>
                  ) : null}
                </dl>
              </CardContent>
            </>
          );
        }}
      </LoadableContent>

      <CardContent>
        <h3 className="mb-2 text-lg font-medium">Children</h3>
        <LoadableContent loadable={detail.children} loadingLabel="Loading children..." errorTitle="Could not load children">
          {({ items, hasMore, isLoadingMore }) =>
            items.length === 0 ? (
              <EmptyState>
                <EmptyStateTitle>No child assets</EmptyStateTitle>
              </EmptyState>
            ) : (
              <div className="flex flex-col gap-2">
                <ul className="flex flex-col gap-1">
                  {items.map((child) => (
                    <li key={`${child.space}/${child.externalId}`}>
                      <Button
                        variant="ghost"
                        className="w-full justify-start text-left"
                        onClick={() => onSelect(toRef(child))}
                      >
                        {child.name}
                      </Button>
                    </li>
                  ))}
                </ul>
                {hasMore ? (
                  <Button variant="outline" onClick={onLoadMoreChildren} disabled={isLoadingMore}>
                    {isLoadingMore ? 'Loading...' : 'Load more'}
                  </Button>
                ) : null}
              </div>
            )
          }
        </LoadableContent>
      </CardContent>
    </Card>
  );
}
