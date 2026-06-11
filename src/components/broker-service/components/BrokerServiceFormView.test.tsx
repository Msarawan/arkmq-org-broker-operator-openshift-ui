import { render, screen } from '@testing-library/react';
import { BrokerServiceFormView } from './BrokerServiceFormView';

jest.mock('./GeneralDetailsSection', () => ({
  GeneralDetailsSection: () => <div data-test="general-details-section" />,
}));

jest.mock('./InfrastructureSection', () => ({
  InfrastructureSection: () => <div data-test="infrastructure-section" />,
}));

describe('BrokerServiceFormView', () => {
  it('renders form sections', () => {
    render(<BrokerServiceFormView namespace="test-ns" />);

    expect(screen.getByTestId('general-details-section')).toBeInTheDocument();
    expect(screen.getByTestId('infrastructure-section')).toBeInTheDocument();
  });
});
