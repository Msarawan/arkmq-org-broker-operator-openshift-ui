import { render, screen } from '@testing-library/react';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import type { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import type { BrokerService, K8sResourceCondition } from '../../../../k8s/types';
import { K8sResourceConditionStatus } from '../../../../k8s/types';
import { BrokerServiceResourcesTab, isOwnedByBrokerService } from './BrokerServiceResourcesTab';

const mockUseK8sWatchResource = useK8sWatchResource as jest.Mock;

const brokerService: BrokerService = {
  apiVersion: 'broker.arkmq.org/v1beta2',
  kind: 'BrokerService',
  metadata: { name: 'my-messaging-service', namespace: 'default', uid: 'svc-uid-1' },
};

const brokerServiceOwnerRef = {
  apiVersion: 'broker.arkmq.org/v1beta2',
  kind: 'BrokerService',
  name: 'my-messaging-service',
  uid: 'svc-uid-1',
};

const makeResource = (
  kind: string,
  name: string,
  apiVersion: string,
  refs: NonNullable<K8sResourceCommon['metadata']>['ownerReferences'],
  uid = `${name}-uid`,
  status?: { conditions?: K8sResourceCondition[] },
): K8sResourceCommon => ({
  apiVersion,
  kind,
  metadata: {
    name,
    namespace: 'default',
    uid,
    ownerReferences: refs,
    creationTimestamp: '2026-03-30T16:24:00Z',
  },
  ...(status !== undefined ? { status } : {}),
});

const ownedBroker = makeResource(
  'Broker',
  'my-messaging-service',
  'broker.arkmq.org/v1beta2',
  [brokerServiceOwnerRef],
  'broker-uid-1',
);
const ownedSecret = makeResource('Secret', 'broker-cert', 'v1', [brokerServiceOwnerRef]);
const ownedService = makeResource('Service', 'my-messaging-service-hdls-svc', 'v1', [
  brokerServiceOwnerRef,
]);

const mockWatches = (data: {
  brokers?: K8sResourceCommon[];
  secrets?: K8sResourceCommon[];
  services?: K8sResourceCommon[];
  loaded?: boolean;
  brokersLoaded?: boolean;
  secretsLoaded?: boolean;
  servicesLoaded?: boolean;
  loadError?: unknown;
}) => {
  const defaultLoaded = data.loaded ?? true;
  mockUseK8sWatchResource.mockImplementation((query: { groupVersionKind?: { kind?: string } }) => {
    const kind = query.groupVersionKind?.kind;
    if (kind === 'Broker') {
      return [data.brokers ?? [], data.brokersLoaded ?? defaultLoaded, data.loadError];
    }
    if (kind === 'Secret') {
      return [data.secrets ?? [], data.secretsLoaded ?? defaultLoaded, undefined];
    }
    if (kind === 'Service') {
      return [data.services ?? [], data.servicesLoaded ?? defaultLoaded, undefined];
    }
    return [[], defaultLoaded, undefined];
  });
};

describe('isOwnedByBrokerService', () => {
  const makeOwnerRef = (kind: string, name: string, uid: string) => ({
    kind,
    name,
    uid,
    apiVersion: 'v1',
  });

  it('returns true when ownerReference matches kind, name, and uid', () => {
    const resource: K8sResourceCommon = {
      metadata: { ownerReferences: [makeOwnerRef('BrokerService', 'my-svc', 'uid-1')] },
    };
    expect(isOwnedByBrokerService(resource, 'my-svc', 'uid-1')).toBe(true);
  });

  it('returns false when uid does not match', () => {
    const resource: K8sResourceCommon = {
      metadata: { ownerReferences: [makeOwnerRef('BrokerService', 'my-svc', 'uid-other')] },
    };
    expect(isOwnedByBrokerService(resource, 'my-svc', 'uid-1')).toBe(false);
  });

  it('returns false when kind is not BrokerService', () => {
    const resource: K8sResourceCommon = {
      metadata: { ownerReferences: [makeOwnerRef('BrokerApp', 'my-svc', 'uid-1')] },
    };
    expect(isOwnedByBrokerService(resource, 'my-svc', 'uid-1')).toBe(false);
  });

  it('returns false when name does not match', () => {
    const resource: K8sResourceCommon = {
      metadata: { ownerReferences: [makeOwnerRef('BrokerService', 'other-svc', 'uid-1')] },
    };
    expect(isOwnedByBrokerService(resource, 'my-svc', 'uid-1')).toBe(false);
  });

  it('returns false when ownerReferences is absent', () => {
    const resource: K8sResourceCommon = { metadata: {} };
    expect(isOwnedByBrokerService(resource, 'my-svc', 'uid-1')).toBe(false);
  });

  it('returns true when one of multiple ownerReferences matches', () => {
    const resource: K8sResourceCommon = {
      metadata: {
        ownerReferences: [
          makeOwnerRef('BrokerApp', 'my-svc', 'uid-1'),
          makeOwnerRef('BrokerService', 'my-svc', 'uid-1'),
        ],
      },
    };
    expect(isOwnedByBrokerService(resource, 'my-svc', 'uid-1')).toBe(true);
  });
});

describe('BrokerServiceResourcesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows a spinner while resources are loading', () => {
    mockWatches({ loaded: false });
    render(<BrokerServiceResourcesTab obj={brokerService} />);
    expect(screen.getByTestId('list-page-header')).toHaveTextContent('Resources');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows a spinner when brokers are still loading but secrets and services are loaded', () => {
    mockWatches({ brokersLoaded: false, secretsLoaded: true, servicesLoaded: true });
    render(<BrokerServiceResourcesTab obj={brokerService} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it("shows 'No Resources found' when nothing is owned by this BrokerService", () => {
    mockWatches({
      secrets: [
        makeResource('Secret', 'other-secret', 'v1', [
          { ...brokerServiceOwnerRef, uid: 'other-uid' },
        ]),
      ],
    });
    render(<BrokerServiceResourcesTab obj={brokerService} />);
    expect(screen.getByTestId('ResourcesTable-empty')).toHaveTextContent('No resources');
  });

  it('shows an error when a watch fails', () => {
    mockWatches({ loadError: new Error('forbidden') });
    render(<BrokerServiceResourcesTab obj={brokerService} />);
    expect(screen.getByText('An error occurred')).toBeInTheDocument();
  });

  it('shows owned Broker, Secrets, and Services but not StatefulSets', () => {
    mockWatches({
      brokers: [ownedBroker],
      secrets: [ownedSecret],
      services: [ownedService],
    });
    render(<BrokerServiceResourcesTab obj={brokerService} />);

    expect(screen.getByTestId('broker-service-resources-tab')).toBeInTheDocument();
    expect(screen.getByTestId('resource-link-my-messaging-service')).toHaveTextContent(
      'my-messaging-service',
    );
    expect(screen.getByTestId('resource-link-broker-cert')).toHaveTextContent('broker-cert');
    expect(screen.getByTestId('resource-link-my-messaging-service-hdls-svc')).toHaveTextContent(
      'my-messaging-service-hdls-svc',
    );
    expect(screen.queryByTestId('resource-link-my-messaging-service-ss')).not.toBeInTheDocument();
    expect(screen.getByText('Broker cluster for this service')).toBeInTheDocument();
    expect(screen.getByText('Certificates and credentials')).toBeInTheDocument();
    expect(screen.getByText('Headless service for broker pods')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: 'Created' })).toHaveLength(2);
    expect(screen.getByPlaceholderText('Search by name...')).toBeInTheDocument();
    expect(screen.getByLabelText('Resources pagination')).toBeInTheDocument();
  });

  it('shows Running for a Broker with Ready=True and Created for Secret and Service', () => {
    const readyBroker = makeResource(
      'Broker',
      'my-messaging-service',
      'broker.arkmq.org/v1beta2',
      [brokerServiceOwnerRef],
      'broker-uid-1',
      { conditions: [{ type: 'Ready', status: K8sResourceConditionStatus.True }] },
    );
    mockWatches({
      brokers: [readyBroker],
      secrets: [ownedSecret],
      services: [ownedService],
    });
    render(<BrokerServiceResourcesTab obj={brokerService} />);

    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getAllByRole('cell', { name: 'Created' })).toHaveLength(2);
  });

  it('shows Warning for a Broker with Ready=False', () => {
    const notReadyBroker = makeResource(
      'Broker',
      'my-messaging-service',
      'broker.arkmq.org/v1beta2',
      [brokerServiceOwnerRef],
      'broker-uid-1',
      {
        conditions: [
          {
            type: 'Ready',
            status: K8sResourceConditionStatus.False,
            reason: 'WaitingForBroker',
          },
        ],
      },
    );
    mockWatches({ brokers: [notReadyBroker] });
    render(<BrokerServiceResourcesTab obj={brokerService} />);

    expect(screen.getByText('Warning')).toBeInTheDocument();
  });

  it('shows Failed for a Broker with Ready=False and an error reason', () => {
    const failedBroker = makeResource(
      'Broker',
      'my-messaging-service',
      'broker.arkmq.org/v1beta2',
      [brokerServiceOwnerRef],
      'broker-uid-1',
      {
        conditions: [
          {
            type: 'Ready',
            status: K8sResourceConditionStatus.False,
            reason: 'DeploymentFailed',
          },
        ],
      },
    );
    mockWatches({ brokers: [failedBroker] });
    render(<BrokerServiceResourcesTab obj={brokerService} />);

    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});
