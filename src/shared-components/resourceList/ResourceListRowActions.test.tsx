import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useDeleteModal } from '@openshift-console/dynamic-plugin-sdk';
import { BrokerServiceModel } from '../../k8s/models';
import { ResourceListRowActions } from './ResourceListRowActions';

const mockUseDeleteModal = useDeleteModal as jest.Mock;

const myMessagingService1 = 'my-messaging-service-1';
const testNamespace = 'test-namespace';

const resource = {
  apiVersion: 'broker.arkmq.org/v1beta2',
  kind: 'BrokerService',
  metadata: { name: myMessagingService1, namespace: testNamespace },
};

const defaultProps = {
  resource,
  model: BrokerServiceModel,
  editActionLabel: 'Edit resource',
  deleteActionLabel: 'Delete resource',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockUseDeleteModal.mockReturnValue(jest.fn());
});

describe('ResourceListRowActions', () => {
  it('renders the actions menu toggle when name and namespace are present', () => {
    render(<ResourceListRowActions {...defaultProps} />);
    expect(screen.getByRole('button', { name: 'Actions' })).toBeInTheDocument();
  });

  it('does not render when metadata.name is missing', () => {
    render(
      <ResourceListRowActions
        {...defaultProps}
        resource={{ ...resource, metadata: { namespace: testNamespace } }}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument();
  });

  it('does not render when metadata.namespace is missing', () => {
    render(
      <ResourceListRowActions
        {...defaultProps}
        resource={{ ...resource, metadata: { name: myMessagingService1 } }}
      />,
    );
    expect(screen.queryByRole('button', { name: 'Actions' })).not.toBeInTheDocument();
  });

  it('shows edit and delete actions with the correct edit path when the menu is opened', async () => {
    const user = userEvent.setup();
    render(<ResourceListRowActions {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Actions' }));

    const editAction = screen.getByRole('menuitem', { name: 'Edit resource' });
    expect(editAction).toBeInTheDocument();
    expect(editAction).toHaveAttribute(
      'href',
      `/k8s/ns/${testNamespace}/broker.arkmq.org~v1beta2~BrokerService/${myMessagingService1}/yaml`,
    );
    expect(screen.getByRole('menuitem', { name: 'Delete resource' })).toBeInTheDocument();
  });

  it('launches the delete modal when delete is selected', async () => {
    const launchDeleteModal = jest.fn();
    mockUseDeleteModal.mockReturnValue(launchDeleteModal);
    const user = userEvent.setup();
    render(<ResourceListRowActions {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Actions' }));
    await user.click(screen.getByRole('menuitem', { name: 'Delete resource' }));
    expect(launchDeleteModal).toHaveBeenCalled();
  });
});
