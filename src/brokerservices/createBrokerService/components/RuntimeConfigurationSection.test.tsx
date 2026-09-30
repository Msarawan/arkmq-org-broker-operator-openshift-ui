import { type FC, useReducer } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  brokerServiceReducer,
  BrokerServiceFormDispatchContext,
  BrokerServiceFormStateContext,
  createInitialBrokerServiceState,
  createBrokerServiceStateFromCr,
  type BrokerServiceFormState,
} from '../../../reducers/brokerservice/reducer';
import { RuntimeConfigurationSection } from './RuntimeConfigurationSection';

const TEST_NAMESPACE = 'test-namespace';

const RuntimeConfigurationSectionWrapper: FC<{ initialState?: BrokerServiceFormState }> = ({
  initialState,
}) => {
  const [state, dispatch] = useReducer(
    brokerServiceReducer,
    initialState ?? createInitialBrokerServiceState(TEST_NAMESPACE),
  );

  return (
    <BrokerServiceFormStateContext.Provider value={state}>
      <BrokerServiceFormDispatchContext.Provider value={dispatch}>
        <RuntimeConfigurationSection />
      </BrokerServiceFormDispatchContext.Provider>
    </BrokerServiceFormStateContext.Provider>
  );
};

const makeStateWithEnvVars = (): BrokerServiceFormState =>
  createBrokerServiceStateFromCr({
    apiVersion: 'broker.arkmq.org/v1beta2',
    kind: 'BrokerService',
    metadata: { name: 'my-messaging-service', namespace: TEST_NAMESPACE },
    spec: {
      resources: { limits: { memory: '2Gi' } },
      env: [{ name: 'BROKER_MAX_CONNECTIONS', value: '1000' }],
    },
  });

describe('RuntimeConfigurationSection', () => {
  it('renders the section title and helper text with no rows by default', () => {
    render(<RuntimeConfigurationSectionWrapper />);

    expect(screen.getByText('Runtime Configuration')).toBeInTheDocument();
    expect(screen.getByText('Environment Variables')).toBeInTheDocument();
    expect(screen.queryByLabelText('Environment variable name')).not.toBeInTheDocument();
  });

  it('adds an env var row when Add Environment Variable is clicked', async () => {
    const user = userEvent.setup();
    render(<RuntimeConfigurationSectionWrapper />);

    await user.click(screen.getByTestId('add-env-var-button'));

    expect(screen.getByLabelText('Environment variable name')).toBeInTheDocument();
    expect(screen.getByLabelText('Environment variable value')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove environment variable')).toBeInTheDocument();
  });

  it('updates env var name and value when the user types', async () => {
    const user = userEvent.setup();
    render(<RuntimeConfigurationSectionWrapper />);

    await user.click(screen.getByTestId('add-env-var-button'));

    const nameInput = screen.getByLabelText('Environment variable name');
    const valueInput = screen.getByLabelText('Environment variable value');

    await user.type(nameInput, 'BROKER_MAX_CONNECTIONS');
    await user.type(valueInput, '1000');

    expect(nameInput).toHaveValue('BROKER_MAX_CONNECTIONS');
    expect(valueInput).toHaveValue('1000');
  });

  it('removes an env var row when the remove button is clicked', async () => {
    const user = userEvent.setup();
    render(<RuntimeConfigurationSectionWrapper />);

    await user.click(screen.getByTestId('add-env-var-button'));
    expect(screen.getByLabelText('Environment variable name')).toBeInTheDocument();

    await user.click(screen.getByLabelText('Remove environment variable'));

    expect(screen.queryByLabelText('Environment variable name')).not.toBeInTheDocument();
  });

  it('renders existing env vars from the initial form state', () => {
    render(<RuntimeConfigurationSectionWrapper initialState={makeStateWithEnvVars()} />);

    const nameInput = screen.getByLabelText('Environment variable name');
    const valueInput = screen.getByLabelText('Environment variable value');

    expect(nameInput).toHaveValue('BROKER_MAX_CONNECTIONS');
    expect(valueInput).toHaveValue('1000');
  });

  it('allows adding multiple env vars', async () => {
    const user = userEvent.setup();
    render(<RuntimeConfigurationSectionWrapper />);

    await user.click(screen.getByTestId('add-env-var-button'));
    await user.click(screen.getByTestId('add-env-var-button'));

    expect(screen.getAllByLabelText('Environment variable name')).toHaveLength(2);
    expect(screen.getAllByLabelText('Environment variable value')).toHaveLength(2);
  });

  it('shows a validation error when duplicate env var names are entered', async () => {
    const user = userEvent.setup();
    render(<RuntimeConfigurationSectionWrapper />);

    await user.click(screen.getByTestId('add-env-var-button'));
    await user.click(screen.getByTestId('add-env-var-button'));

    const nameInputs = screen.getAllByLabelText('Environment variable name');
    await user.type(nameInputs[0], 'BROKER_LOG_LEVEL');
    await user.type(nameInputs[1], 'BROKER_LOG_LEVEL');

    expect(
      screen.getByText('Duplicate environment variable name "BROKER_LOG_LEVEL"'),
    ).toBeInTheDocument();
  });
});
