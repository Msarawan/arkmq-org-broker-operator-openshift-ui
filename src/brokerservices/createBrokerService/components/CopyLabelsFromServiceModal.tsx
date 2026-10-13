import type { FC } from 'react';
import { useMemo } from 'react';
import {
  Alert,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  EmptyStateBody,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { BrokerServiceModel } from '../../../k8s/models';
import type { BrokerService } from '../../../k8s/types';
import { useBrokerServiceFormDispatch } from '../../../reducers/brokerservice/reducer';

export interface CopyLabelsFromServiceModalProps {
  /** Namespace whose BrokerServices are listed for label copying. */
  namespace: string;
  /**
   * Name of the BrokerService currently being edited.
   * Excluded from the list so users cannot copy a service onto itself.
   */
  excludeServiceName?: string;
  /** Closes the modal without changing form labels. */
  onClose: () => void;
}

/**
 * Modal for picking an existing BrokerService and copying its labels into the form.
 */
export const CopyLabelsFromServiceModal: FC<CopyLabelsFromServiceModalProps> = ({
  namespace,
  excludeServiceName,
  onClose,
}) => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');
  const dispatch = useBrokerServiceFormDispatch();

  const [brokerServices, loaded, loadError] = useK8sWatchResource<BrokerService[]>({
    namespace,
    groupVersionKind: {
      group: BrokerServiceModel.apiGroup,
      version: BrokerServiceModel.apiVersion,
      kind: BrokerServiceModel.kind,
    },
    isList: true,
  }) as [BrokerService[], boolean, unknown];

  const selectableServices = useMemo(() => {
    const list = Array.isArray(brokerServices) ? brokerServices : [];
    return list
      .filter((service) => {
        const name = service.metadata?.name;
        if (!name) {
          return false;
        }
        if (excludeServiceName && name === excludeServiceName) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (a.metadata?.name ?? '').localeCompare(b.metadata?.name ?? ''));
  }, [brokerServices, excludeServiceName]);

  const handleSelect = (service: BrokerService) => {
    dispatch({
      type: 'COPY_LABELS_FROM_SERVICE',
      payload: service.metadata?.labels,
    });
    onClose();
  };

  const errorMessage =
    loadError instanceof Error
      ? loadError.message
      : typeof loadError === 'string'
        ? loadError
        : loadError
          ? ''
          : undefined;

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant={ModalVariant.small}
      data-test="copy-labels-from-service-modal"
    >
      <ModalHeader
        title={t('Copy labels from existing service')}
        description={t(
          'Select a service to copy its labels. Apps already targeting that service will also discover yours.',
        )}
      />
      <ModalBody>
        {!loaded && (
          <Bullseye>
            <Spinner aria-label={t('Loading BrokerServices')} />
          </Bullseye>
        )}
        {loaded && errorMessage && (
          <Alert variant="danger" isInline title={t('An error occurred')}>
            {errorMessage}
          </Alert>
        )}
        {loaded && !errorMessage && selectableServices.length === 0 && (
          <EmptyState headingLevel="h2" titleText={t('No BrokerServices found')}>
            <EmptyStateBody>
              {t('There are no other BrokerServices in this namespace to copy labels from.')}
            </EmptyStateBody>
          </EmptyState>
        )}
        {loaded && !errorMessage && selectableServices.length > 0 && (
          <Stack hasGutter data-test="copy-labels-service-list">
            {selectableServices.map((service) => {
              const name = service.metadata?.name ?? '';
              const titleId = `copy-labels-service-title-${name}`;
              const labelEntries = Object.entries(service.metadata?.labels ?? {});

              return (
                <StackItem key={name}>
                  <Card isClickable isCompact data-test={`copy-labels-service-card-${name}`}>
                    <CardHeader
                      selectableActions={{
                        selectableActionId: `copy-labels-select-${name}`,
                        selectableActionAriaLabelledby: titleId,
                        onClickAction: () => {
                          handleSelect(service);
                        },
                      }}
                    >
                      <CardTitle id={titleId}>{name}</CardTitle>
                    </CardHeader>
                    <CardBody>
                      {labelEntries.length === 0 ? (
                        <HelperText>
                          <HelperTextItem>{t('No labels')}</HelperTextItem>
                        </HelperText>
                      ) : (
                        <LabelGroup numLabels={8}>
                          {labelEntries.map(([key, value]) => (
                            <Label key={`${key}=${value}`} color="grey" isCompact>
                              {`${key}=${value}`}
                            </Label>
                          ))}
                        </LabelGroup>
                      )}
                    </CardBody>
                  </Card>
                </StackItem>
              );
            })}
          </Stack>
        )}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="secondary"
          onClick={onClose}
          data-test="copy-labels-modal-cancel"
          style={{ marginInlineStart: 'auto' }}
        >
          {t('Cancel')}
        </Button>
      </ModalFooter>
    </Modal>
  );
};
