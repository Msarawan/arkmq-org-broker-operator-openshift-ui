import { renderHook } from '@testing-library/react';
import type { BrokerService } from '../../k8s/types';
import {
  brokerServiceReducer,
  createEmptyBrokerService,
  createInitialBrokerServiceState,
  useBrokerServiceFormDispatch,
  useBrokerServiceFormState,
} from './reducer';

const TEST_NAMESPACE = 'test-namespace';

const createState = () => createInitialBrokerServiceState(createEmptyBrokerService(TEST_NAMESPACE));

describe('brokerServiceReducer', () => {
  it('creates a BrokerService with the given namespace and default memory', () => {
    const cr = createEmptyBrokerService(TEST_NAMESPACE);

    expect(cr).toEqual({
      apiVersion: 'broker.arkmq.org/v1beta2',
      kind: 'BrokerService',
      metadata: { name: 'my-messaging-service', namespace: TEST_NAMESPACE },
      spec: { resources: { limits: { memory: '2Gi' } } },
    });
  });

  it('initializes form state from the CR', () => {
    const cr = createEmptyBrokerService(TEST_NAMESPACE);
    const state = createInitialBrokerServiceState(cr);

    expect(state.cr).toBe(cr);
    expect(state.labels).toEqual([]);
    expect(state.memoryValue).toBe('2');
    expect(state.memoryUnit).toBe('Gi');
  });

  it('parses existing labels and memory from the CR', () => {
    const cr: BrokerService = {
      ...createEmptyBrokerService(TEST_NAMESPACE),
      metadata: {
        name: 'my-broker',
        namespace: TEST_NAMESPACE,
        labels: { forWorkQueue: 'true', app: 'messaging' },
      },
      spec: { resources: { limits: { memory: '512Mi' } } },
    };

    const state = createInitialBrokerServiceState(cr);

    expect(state.labels).toEqual([
      { key: 'forWorkQueue', value: 'true' },
      { key: 'app', value: 'messaging' },
    ]);
    expect(state.memoryValue).toBe('512');
    expect(state.memoryUnit).toBe('Mi');
  });

  it('updates the broker service name', () => {
    const state = createState();
    const next = brokerServiceReducer(state, { type: 'SET_NAME', payload: 'my-broker' });

    expect(next.cr.metadata?.name).toBe('my-broker');
  });

  it('adds, updates, and removes a label on the CR', () => {
    let state = createState();

    state = brokerServiceReducer(state, { type: 'ADD_LABEL' });
    expect(state.labels).toHaveLength(1);

    state = brokerServiceReducer(state, {
      type: 'UPDATE_LABEL_KEY',
      payload: { index: 0, key: 'forWorkQueue' },
    });
    state = brokerServiceReducer(state, {
      type: 'UPDATE_LABEL_VALUE',
      payload: { index: 0, value: 'true' },
    });

    expect(state.labels[0]).toEqual({ key: 'forWorkQueue', value: 'true' });
    expect(state.cr.metadata?.labels).toEqual({ forWorkQueue: 'true' });

    state = brokerServiceReducer(state, { type: 'REMOVE_LABEL', payload: 0 });

    expect(state.labels).toEqual([]);
    expect(state.cr.metadata?.labels).toBeUndefined();
  });

  it('adds and removes multiple labels and keeps remaining labels on the CR', () => {
    let state = createState();

    state = brokerServiceReducer(state, { type: 'ADD_LABEL' });
    state = brokerServiceReducer(state, {
      type: 'UPDATE_LABEL_KEY',
      payload: { index: 0, key: 'forWorkQueue' },
    });
    state = brokerServiceReducer(state, {
      type: 'UPDATE_LABEL_VALUE',
      payload: { index: 0, value: 'true' },
    });

    state = brokerServiceReducer(state, { type: 'ADD_LABEL' });
    state = brokerServiceReducer(state, {
      type: 'UPDATE_LABEL_KEY',
      payload: { index: 1, key: 'app' },
    });
    state = brokerServiceReducer(state, {
      type: 'UPDATE_LABEL_VALUE',
      payload: { index: 1, value: 'messaging' },
    });

    expect(state.labels).toEqual([
      { key: 'forWorkQueue', value: 'true' },
      { key: 'app', value: 'messaging' },
    ]);
    expect(state.cr.metadata?.labels).toEqual({
      forWorkQueue: 'true',
      app: 'messaging',
    });

    state = brokerServiceReducer(state, { type: 'REMOVE_LABEL', payload: 0 });

    expect(state.labels).toEqual([{ key: 'app', value: 'messaging' }]);
    expect(state.cr.metadata?.labels).toEqual({ app: 'messaging' });
  });

  it('updates memory value and syncs the CR limit string', () => {
    const state = createState();
    const next = brokerServiceReducer(state, { type: 'SET_MEMORY_VALUE', payload: '4' });

    expect(next.memoryValue).toBe('4');
    expect(next.cr.spec?.resources?.limits?.memory).toBe('4Gi');
  });

  it('updates memory unit between Mi and Gi and syncs the CR limit string', () => {
    const state = createState();
    const next = brokerServiceReducer(state, { type: 'SET_MEMORY_UNIT', payload: 'Mi' });

    expect(next.memoryUnit).toBe('Mi');
    expect(next.cr.spec?.resources?.limits?.memory).toBe('2Mi');
  });

  it('replaces the CR and re-derives labels and memory from SET_MODEL', () => {
    const state = createState();
    const newCr: BrokerService = {
      apiVersion: 'broker.arkmq.org/v1beta2',
      kind: 'BrokerService',
      metadata: {
        name: 'updated-broker',
        namespace: TEST_NAMESPACE,
        labels: { forWorkQueue: 'true' },
      },
      spec: { resources: { limits: { memory: '8Gi' } } },
    };

    const next = brokerServiceReducer(state, { type: 'SET_MODEL', payload: newCr });

    expect(next.cr).toBe(newCr);
    expect(next.labels).toEqual([{ key: 'forWorkQueue', value: 'true' }]);
    expect(next.memoryValue).toBe('8');
    expect(next.memoryUnit).toBe('Gi');
  });
});

describe('broker service hooks', () => {
  it('useBrokerServiceFormState throws when used outside its Provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useBrokerServiceFormState())).toThrow(
      'useBrokerServiceFormState must be used inside BrokerServiceCreatePage',
    );

    jest.restoreAllMocks();
  });

  it('useBrokerServiceFormDispatch throws when used outside its Provider', () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    expect(() => renderHook(() => useBrokerServiceFormDispatch())).toThrow(
      'useBrokerServiceFormDispatch must be used inside BrokerServiceCreatePage',
    );

    jest.restoreAllMocks();
  });
});
