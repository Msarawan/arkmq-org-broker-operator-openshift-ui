import type { FC } from 'react';
import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  FormSection,
  Split,
  SplitItem,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { PlusCircleIcon, TimesIcon } from '@patternfly/react-icons';
import { useTranslation } from 'react-i18next';
import {
  useBrokerServiceFormState,
  useBrokerServiceFormDispatch,
} from '../../../reducers/brokerservice/reducer';
import { validateEnvVarEntries } from '../../../validation/k8s';

/**
 * Lets users add, edit, and remove environment variables (spec.env) for a BrokerService.
 * Supports plain name/value pairs only — valueFrom (secret/configMap refs) is not supported yet.
 */
export const RuntimeConfigurationSection: FC = () => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');
  const { envVars } = useBrokerServiceFormState();
  const dispatch = useBrokerServiceFormDispatch();

  const envVarsError = validateEnvVarEntries(envVars) ?? undefined;

  return (
    <FormSection title={t('Runtime Configuration')}>
      <FormGroup label={t('Environment Variables')} fieldId="broker-service-env-vars">
        <Stack hasGutter>
          <StackItem>
            <FormHelperText>
              <HelperText>
                <HelperTextItem>
                  {t('Environment variables injected into the broker pods at runtime.')}
                </HelperTextItem>
              </HelperText>
            </FormHelperText>
          </StackItem>

          {envVars.map((envVar, index) => (
            <StackItem key={envVar.id}>
              <Split hasGutter>
                <SplitItem isFilled>
                  <TextInput
                    type="text"
                    id={`env-var-name-${String(index)}`}
                    value={envVar.name}
                    onChange={(_event, val) => {
                      dispatch({ type: 'UPDATE_ENV_VAR_NAME', payload: { index, name: val } });
                    }}
                    placeholder={t('e.g., BROKER_MAX_CONNECTIONS')}
                    aria-label={t('Environment variable name')}
                    data-test={`env-var-name-input-${String(index)}`}
                  />
                </SplitItem>
                <SplitItem className="pf-v6-u-color-200 pf-v6-u-flex-shrink-0">=</SplitItem>
                <SplitItem isFilled>
                  <TextInput
                    type="text"
                    id={`env-var-value-${String(index)}`}
                    value={envVar.value}
                    onChange={(_event, val) => {
                      dispatch({ type: 'UPDATE_ENV_VAR_VALUE', payload: { index, value: val } });
                    }}
                    placeholder={t('value')}
                    aria-label={t('Environment variable value')}
                    data-test={`env-var-value-input-${String(index)}`}
                  />
                </SplitItem>
                <SplitItem>
                  <Button
                    variant="plain"
                    onClick={() => {
                      dispatch({ type: 'REMOVE_ENV_VAR', payload: index });
                    }}
                    aria-label={t('Remove environment variable')}
                    icon={<TimesIcon />}
                    data-test={`remove-env-var-${String(index)}`}
                  />
                </SplitItem>
              </Split>
            </StackItem>
          ))}

          {envVarsError && (
            <StackItem>
              <FormHelperText>
                <HelperText>
                  <HelperTextItem variant="error">{envVarsError}</HelperTextItem>
                </HelperText>
              </FormHelperText>
            </StackItem>
          )}

          <StackItem>
            <Button
              variant="secondary"
              icon={<PlusCircleIcon />}
              onClick={() => {
                dispatch({ type: 'ADD_ENV_VAR' });
              }}
              data-test="add-env-var-button"
            >
              {t('Add Environment Variable')}
            </Button>
          </StackItem>
        </Stack>
      </FormGroup>
    </FormSection>
  );
};
