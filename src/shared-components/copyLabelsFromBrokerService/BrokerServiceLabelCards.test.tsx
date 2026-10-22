import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import type { BrokerService } from '../../k8s/types';
import { BrokerServiceLabelCards } from './BrokerServiceLabelCards';

const mockUseK8sWatchResource = useK8sWatchResource as jest.Mock;

const TEST_NAMESPACE = 'test-namespace';

const makeService = (name: string, labels?: Record<string, string>): BrokerService => ({
  apiVersion: 'broker.arkmq.org/v1beta2',
  kind: 'BrokerService',
  metadata: { name, namespace: TEST_NAMESPACE, labels },
  spec: { resources: { limits: { memory: '2Gi' } } },
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUseK8sWatchResource.mockReturnValue([[], true, undefined]);
});

describe('BrokerServiceLabelCards', () => {
  it('shows a loading spinner while the watch is loading', () => {
    mockUseK8sWatchResource.mockReturnValue([[], false, undefined]);

    render(<BrokerServiceLabelCards namespace={TEST_NAMESPACE} onSelectService={jest.fn()} />);

    expect(screen.getByRole('progressbar', { name: 'Loading BrokerServices' })).toBeInTheDocument();
  });

  it('shows an empty state when no selectable BrokerServices exist', () => {
    render(<BrokerServiceLabelCards namespace={TEST_NAMESPACE} onSelectService={jest.fn()} />);

    expect(screen.getByText('No BrokerServices found')).toBeInTheDocument();
    expect(
      screen.getByText('There are no other BrokerServices in this namespace to copy labels from.'),
    ).toBeInTheDocument();
  });

  it('shows an error alert when the watch fails', () => {
    mockUseK8sWatchResource.mockReturnValue([[], true, new Error('forbidden')]);

    render(<BrokerServiceLabelCards namespace={TEST_NAMESPACE} onSelectService={jest.fn()} />);

    expect(screen.getByText('An error occurred')).toBeInTheDocument();
    expect(screen.getByText('forbidden')).toBeInTheDocument();
  });

  it('renders sorted service cards with label chips', () => {
    mockUseK8sWatchResource.mockReturnValue([
      [
        makeService('zeta-service', { env: 'test' }),
        makeService('alpha-service', { tier: 'production' }),
      ],
      true,
      undefined,
    ]);

    render(<BrokerServiceLabelCards namespace={TEST_NAMESPACE} onSelectService={jest.fn()} />);

    const cards = screen.getAllByTestId(/copy-labels-service-card-/);
    expect(cards.map((card) => card.getAttribute('data-test'))).toEqual([
      'copy-labels-service-card-alpha-service',
      'copy-labels-service-card-zeta-service',
    ]);
    expect(screen.getByText('tier=production')).toBeInTheDocument();
    expect(screen.getByText('env=test')).toBeInTheDocument();
  });

  it('shows No labels when a service has an empty label map', () => {
    mockUseK8sWatchResource.mockReturnValue([[makeService('bare-service')], true, undefined]);

    render(<BrokerServiceLabelCards namespace={TEST_NAMESPACE} onSelectService={jest.fn()} />);

    expect(screen.getByText('No labels')).toBeInTheDocument();
  });

  it('excludes the named service from the list', () => {
    mockUseK8sWatchResource.mockReturnValue([
      [makeService('messaging-service', { tier: 'production' }), makeService('other-service')],
      true,
      undefined,
    ]);

    render(
      <BrokerServiceLabelCards
        namespace={TEST_NAMESPACE}
        excludeServiceName="messaging-service"
        onSelectService={jest.fn()}
      />,
    );

    expect(
      screen.queryByTestId('copy-labels-service-card-messaging-service'),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('copy-labels-service-card-other-service')).toBeInTheDocument();
  });

  it('omits services that have no metadata name', () => {
    mockUseK8sWatchResource.mockReturnValue([
      [
        { ...makeService('named-service'), metadata: { namespace: TEST_NAMESPACE } },
        makeService('valid-service'),
      ],
      true,
      undefined,
    ]);

    render(<BrokerServiceLabelCards namespace={TEST_NAMESPACE} onSelectService={jest.fn()} />);

    expect(screen.getByTestId('copy-labels-service-card-valid-service')).toBeInTheDocument();
    expect(screen.queryByTestId('copy-labels-service-card-named-service')).not.toBeInTheDocument();
    expect(screen.getAllByTestId(/copy-labels-service-card-/)).toHaveLength(1);
  });

  it('calls onSelectService with the chosen BrokerService', async () => {
    const user = userEvent.setup();
    const onSelectService = jest.fn();
    const source = makeService('source-service', { tier: 'production' });
    mockUseK8sWatchResource.mockReturnValue([[source], true, undefined]);

    render(
      <BrokerServiceLabelCards namespace={TEST_NAMESPACE} onSelectService={onSelectService} />,
    );

    await user.click(screen.getByRole('button', { name: 'source-service' }));

    expect(onSelectService).toHaveBeenCalledTimes(1);
    expect(onSelectService).toHaveBeenCalledWith(source);
  });

  it('marks the selected service card when selectedServiceName is set', () => {
    mockUseK8sWatchResource.mockReturnValue([
      [makeService('alpha-service'), makeService('beta-service')],
      true,
      undefined,
    ]);

    render(
      <BrokerServiceLabelCards
        namespace={TEST_NAMESPACE}
        selectedServiceName="beta-service"
        onSelectService={jest.fn()}
      />,
    );

    // Clickable PatternFly cards use pf-m-current (not pf-m-selected) when isSelected.
    expect(screen.getByTestId('copy-labels-service-card-beta-service')).toHaveClass('pf-m-current');
    expect(screen.getByTestId('copy-labels-service-card-alpha-service')).not.toHaveClass(
      'pf-m-current',
    );
  });
});
