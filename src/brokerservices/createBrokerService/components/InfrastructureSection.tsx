import type { FC } from 'react';
import {
  FormGroup,
  FormHelperText,
  FormSection,
  HelperText,
  HelperTextItem,
  TextInput,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import {
  useBrokerServiceFormState,
  useBrokerServiceFormDispatch,
} from '../../../reducers/brokerservice/reducer';
import { validateMemoryValue } from '../../../validation/k8s';
import { MemoryInput } from './MemoryInput';

export const InfrastructureSection: FC = () => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');
  const { memoryValue, memoryUnit, cr } = useBrokerServiceFormState();
  const dispatch = useBrokerServiceFormDispatch();

  const memoryError = validateMemoryValue(memoryValue) ?? undefined;

  return (
    <FormSection title={t('Infrastructure & Capacity')}>
      <FormGroup label={t('Memory (RAM)')} isRequired fieldId="broker-service-memory">
        <MemoryInput
          value={memoryValue}
          unit={memoryUnit}
          onValueChange={(val) => {
            dispatch({ type: 'SET_MEMORY_VALUE', payload: val });
          }}
          onUnitChange={(unit) => {
            dispatch({ type: 'SET_MEMORY_UNIT', payload: unit });
          }}
          error={memoryError}
        />
      </FormGroup>

      <FormGroup label={t('Broker Image')} fieldId="broker-service-image">
        <TextInput
          id="broker-service-image"
          name="broker-service-image"
          type="text"
          value={cr.spec?.image ?? ''}
          onChange={(_event, val) => {
            dispatch({ type: 'SET_IMAGE', payload: val });
          }}
          data-test="broker-service-image-input"
        />
        <FormHelperText>
          <HelperText>
            <HelperTextItem>
              {t(
                'Optional. Overrides the default broker container image provided by the operator.',
              )}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    </FormSection>
  );
};
