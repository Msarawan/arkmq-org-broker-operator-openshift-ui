import { type FC } from 'react';
import { Divider } from '@patternfly/react-core';
import { GeneralDetailsSection } from './GeneralDetailsSection';
import { InfrastructureSection } from './InfrastructureSection';

interface BrokerServiceFormViewProps {
  namespace: string;
}

export const BrokerServiceFormView: FC<BrokerServiceFormViewProps> = ({ namespace }) => (
  <>
    <Divider />

    <GeneralDetailsSection namespace={namespace} />

    <Divider />

    <InfrastructureSection />

    <Divider />
  </>
);
