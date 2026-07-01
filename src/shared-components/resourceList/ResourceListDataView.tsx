import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Pagination,
  Spinner,
} from '@patternfly/react-core';
import {
  DataView,
  DataViewFilters,
  DataViewState,
  DataViewTable,
  DataViewTextFilter,
  DataViewToolbar,
  useDataViewFilters,
  useDataViewPagination,
} from '@patternfly/react-data-view';
import type { DataViewTableBasicProps, DataViewTr } from '@patternfly/react-data-view';
import { Tbody, Td, Tr } from '@patternfly/react-table';
import { useTranslation } from 'react-i18next';

interface ResourceListNameFilter {
  name: string;
}

function filterByResourceName(
  resource: { metadata?: { name?: string } },
  filters: ResourceListNameFilter,
): boolean {
  const name = resource.metadata?.name?.toLowerCase() ?? '';
  const filterValue = filters.name.toLowerCase();
  return filterValue.length === 0 || name.includes(filterValue);
}

const PER_PAGE_OPTIONS = [
  { title: '10', value: 10 },
  { title: '20', value: 20 },
  { title: '50', value: 50 },
  { title: '100', value: 100 },
];

export interface ResourceListDataViewProps<T extends { metadata?: { name?: string } }> {
  data: T[];
  loaded: boolean;
  loadError: unknown;
  columns: DataViewTableBasicProps['columns'];
  renderRow: (item: T) => DataViewTr;
  ariaLabel: string;
  ouiaId: string;
  dataViewOuiaId: string;
  toolbarOuiaId: string;
  emptyTitle: string;
  paginationAriaLabel: string;
  nameFilterDataTest?: string;
  loadingDataTest?: string;
}

// Generic PatternFly DataView shell for ArkMQ resource list pages.
export function ResourceListDataView<T extends { metadata?: { name?: string } }>({
  data,
  loaded,
  loadError,
  columns,
  renderRow,
  ariaLabel,
  ouiaId,
  dataViewOuiaId,
  toolbarOuiaId,
  emptyTitle,
  paginationAriaLabel,
  nameFilterDataTest,
  loadingDataTest,
}: ResourceListDataViewProps<T>): ReactNode {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');
  const { filters, onSetFilters } = useDataViewFilters<ResourceListNameFilter>({
    initialFilters: { name: '' },
  });
  const pagination = useDataViewPagination({ perPage: 20 });
  const { page, perPage } = pagination;

  const clearAllFilters = useCallback(() => {
    onSetFilters({ name: '' });
  }, [onSetFilters]);

  const filteredData = useMemo(
    () => data.filter((item) => filterByResourceName(item, filters)),
    [data, filters],
  );

  const rows = useMemo(
    () => filteredData.slice((page - 1) * perPage, page * perPage).map((item) => renderRow(item)),
    [filteredData, page, perPage, renderRow],
  );

  const activeState = useMemo(() => {
    if (filteredData.length === 0) {
      return DataViewState.empty;
    }
    return undefined;
  }, [filteredData.length]);

  const errorDetails =
    loadError instanceof Error ? loadError.message : typeof loadError === 'string' ? loadError : '';
  const errorMessage =
    errorDetails !== ''
      ? `${t('Unable to load resources')}: ${errorDetails}. ${t('Try refreshing the page.')}`
      : t('Unable to load resources. Try refreshing the page.');

  if (loadError) {
    return (
      <div className="cos-status-box" data-test={`${ouiaId}-error`}>
        <EmptyState headingLevel="h2" titleText={t('An error occurred')} status="danger">
          <EmptyStateBody>{errorMessage}</EmptyStateBody>
        </EmptyState>
      </div>
    );
  }

  if (!loaded) {
    return (
      <div className="cos-status-box" data-test={loadingDataTest ?? `${ouiaId}-loading`}>
        <Spinner aria-label={t('Loading')} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="cos-status-box" data-test={`${ouiaId}-empty`}>
        <EmptyState variant={EmptyStateVariant.sm}>
          <EmptyStateBody>{emptyTitle}</EmptyStateBody>
        </EmptyState>
      </div>
    );
  }

  const bodyStates = {
    empty: (
      <Tbody>
        <Tr ouiaId={`${ouiaId}-empty`}>
          <Td
            colSpan={columns.length}
            className="pf-v6-u-text-align-center pf-v6-u-py-sm"
            data-test={`${ouiaId}-empty`}
          >
            {emptyTitle}
          </Td>
        </Tr>
      </Tbody>
    ),
  };

  return (
    <DataView activeState={activeState} ouiaId={dataViewOuiaId}>
      <DataViewToolbar
        ouiaId={toolbarOuiaId}
        clearAllFilters={clearAllFilters}
        filters={
          <DataViewFilters
            onChange={(_key, newValues) => {
              onSetFilters(newValues);
            }}
            values={filters}
          >
            <DataViewTextFilter
              filterId="name"
              title={t('Name')}
              placeholder={t('Search by name...')}
              data-test={nameFilterDataTest}
            />
          </DataViewFilters>
        }
        pagination={
          <Pagination
            itemCount={filteredData.length}
            perPageOptions={PER_PAGE_OPTIONS}
            titles={{ paginationAriaLabel }}
            isCompact
            {...pagination}
          />
        }
      />
      <DataViewTable
        aria-label={ariaLabel}
        ouiaId={ouiaId}
        columns={columns}
        rows={rows}
        bodyStates={bodyStates}
      />
    </DataView>
  );
}
