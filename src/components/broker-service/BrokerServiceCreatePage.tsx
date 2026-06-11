import type { FC } from 'react';
import { useReducer, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import * as jsYaml from 'js-yaml';
import { k8sCreate } from '@openshift-console/dynamic-plugin-sdk';
import { Content, PageSection, Stack, StackItem, Title } from '@patternfly/react-core';
import { BrokerServiceModel } from '../../k8s/models';
import type { BrokerService } from '../../k8s/types';
import { validateDNS1123, validateMemoryValue } from '../../validation/k8s';
import { ResourceFormEditor } from '../../shared-components/ResourceFormEditor';
import { BrokerServiceFormView } from './components/BrokerServiceFormView';
import {
  brokerServiceReducer,
  createInitialBrokerServiceState,
  createEmptyBrokerService,
  BrokerServiceFormStateContext,
  BrokerServiceFormDispatchContext,
} from '../../reducers/broker-service/reducer';

const BrokerServiceCreatePage: FC = () => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');
  const { ns: namespace = '' } = useParams<{ ns: string }>();
  const navigate = useNavigate();

  const initialCr = useMemo(() => createEmptyBrokerService(namespace), [namespace]);
  const [formState, dispatch] = useReducer(
    brokerServiceReducer,
    createInitialBrokerServiceState(initialCr),
  );

  const { cr, memoryValue } = formState;
  const name = cr.metadata?.name ?? '';
  const isFormValid = validateDNS1123(name) === null && validateMemoryValue(memoryValue) === null;

  const submit = async (crToSubmit: BrokerService) => {
    await k8sCreate({ model: BrokerServiceModel, data: crToSubmit });
    void navigate(-1);
  };

  return (
    <BrokerServiceFormStateContext.Provider value={formState}>
      <BrokerServiceFormDispatchContext.Provider value={dispatch}>
        <>
          <PageSection>
            <Stack hasGutter>
              <StackItem>
                <Title headingLevel="h1" size="2xl" data-test="create-brokerservice-title">
                  {t('Create BrokerService')}
                </Title>
              </StackItem>
              <StackItem>
                <Content>
                  {t(
                    'Provision a shared messaging infrastructure broker cluster. This resource defines the underlying broker deployment that applications will connect to via BrokerApp resources.',
                  )}
                </Content>
              </StackItem>
            </Stack>
          </PageSection>
          <PageSection>
            <ResourceFormEditor
              initialResource={cr}
              isFormValid={isFormValid}
              createButtonTestId="create-broker-service-button"
              cancelButtonTestId="cancel-broker-service-button"
              onFormSubmit={() => submit(cr)}
              onYamlSave={(yaml) => submit(jsYaml.load(yaml) as BrokerService)}
              onSwitchToForm={(yaml) => {
                try {
                  dispatch({ type: 'SET_MODEL', payload: jsYaml.load(yaml) as BrokerService });
                  return { ok: true };
                } catch {
                  return {
                    ok: false,
                    error: t('Cannot switch to Form view: YAML is not valid'),
                  };
                }
              }}
              onCancel={() => {
                void navigate(-1);
              }}
            >
              <BrokerServiceFormView namespace={namespace} />
            </ResourceFormEditor>
          </PageSection>
        </>
      </BrokerServiceFormDispatchContext.Provider>
    </BrokerServiceFormStateContext.Provider>
  );
};

export default BrokerServiceCreatePage;
