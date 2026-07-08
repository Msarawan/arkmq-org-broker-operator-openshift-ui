import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { DataViewTr } from '@patternfly/react-data-view';
import { ResourceListDataView } from './ResourceListDataView';

interface TestResource {
  metadata?: { name?: string };
}

const resource1 = 'my-resource-1';
const resource2 = 'my-resource-2';

const makeResource = (name: string): TestResource => ({ metadata: { name } });

const renderNameRow = (item: TestResource): DataViewTr => [{ cell: item.metadata?.name ?? '-' }];

const defaultProps = {
  columns: ['Name'],
  renderRow: renderNameRow,
  ariaLabel: 'Test resources',
  ouiaId: 'TestResourceList',
  dataViewOuiaId: 'TestResourceListDataView',
  toolbarOuiaId: 'TestResourceListToolbar',
  emptyTitle: 'No resources found',
  paginationAriaLabel: 'Test resources pagination',
};

describe('ResourceListDataView', () => {
  it('shows a loading spinner while data is still loading', () => {
    render(
      <ResourceListDataView {...defaultProps} data={[]} loaded={false} loadError={undefined} />,
    );
    expect(screen.getByRole('progressbar', { name: 'Loading' })).toBeInTheDocument();
  });

  it('shows an empty state when loaded with an empty list', () => {
    render(
      <ResourceListDataView {...defaultProps} data={[]} loaded={true} loadError={undefined} />,
    );
    expect(screen.getByText('No resources found')).toBeInTheDocument();
  });

  it('shows an error message with details when loadError is an Error', () => {
    render(
      <ResourceListDataView
        {...defaultProps}
        data={[]}
        loaded={false}
        loadError={new Error('Connection refused')}
      />,
    );
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    expect(
      screen.getByText('Unable to load resources: Connection refused. Try refreshing the page.'),
    ).toBeInTheDocument();
  });

  it('shows an error message with details when loadError is a string', () => {
    render(
      <ResourceListDataView
        {...defaultProps}
        data={[]}
        loaded={false}
        loadError="Failed to fetch"
      />,
    );
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    expect(
      screen.getByText('Unable to load resources: Failed to fetch. Try refreshing the page.'),
    ).toBeInTheDocument();
  });

  it('shows a generic error message when loadError has no readable details', () => {
    render(
      <ResourceListDataView
        {...defaultProps}
        data={[]}
        loaded={false}
        loadError={{ status: 500 }}
      />,
    );
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    expect(
      screen.getByText('Unable to load resources. Try refreshing the page.'),
    ).toBeInTheDocument();
  });

  it('renders a row for each resource in the data', () => {
    const data = [makeResource(resource1), makeResource(resource2)];
    render(
      <ResourceListDataView {...defaultProps} data={data} loaded={true} loadError={undefined} />,
    );
    expect(screen.getByText(resource1)).toBeInTheDocument();
    expect(screen.getByText(resource2)).toBeInTheDocument();
  });

  it('renders the name filter input when data is loaded', () => {
    render(
      <ResourceListDataView
        {...defaultProps}
        data={[makeResource(resource1)]}
        loaded={true}
        loadError={undefined}
      />,
    );
    expect(screen.getByPlaceholderText('Search by name...')).toBeInTheDocument();
  });

  it('filters rows by name when the user types in the name filter', async () => {
    const user = userEvent.setup();
    const data = [makeResource(resource1), makeResource(resource2)];
    render(
      <ResourceListDataView {...defaultProps} data={data} loaded={true} loadError={undefined} />,
    );

    const filterInput = screen.getByPlaceholderText('Search by name...');
    await user.clear(filterInput);
    await user.type(filterInput, '-1');

    await waitFor(() => {
      expect(screen.getByText(resource1)).toBeInTheDocument();
      expect(screen.queryByText(resource2)).not.toBeInTheDocument();
    });
  });

  it('shows an empty table message when the filter matches no resources', async () => {
    const user = userEvent.setup();
    const data = [makeResource(resource1), makeResource(resource2)];
    render(
      <ResourceListDataView {...defaultProps} data={data} loaded={true} loadError={undefined} />,
    );

    const filterInput = screen.getByPlaceholderText('Search by name...');
    await user.clear(filterInput);
    await user.type(filterInput, 'no-matching-resource');

    await waitFor(() => {
      expect(screen.queryByText(resource1)).not.toBeInTheDocument();
      expect(screen.queryByText(resource2)).not.toBeInTheDocument();
      expect(screen.getByText('No resources found')).toBeInTheDocument();
    });
  });
});
