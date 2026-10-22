import type { FC } from 'react';
import {
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { useTranslation } from 'react-i18next';
import type { BrokerService } from '../../../k8s/types';
import { useBrokerServiceFormDispatch } from '../../../reducers/brokerservice/reducer';
import { BrokerServiceLabelCards } from '../../../shared-components/copyLabelsFromBrokerService/BrokerServiceLabelCards';

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

/** Copies all labels from a chosen BrokerService into the create/edit form. */
export const CopyLabelsFromServiceModal: FC<CopyLabelsFromServiceModalProps> = ({
  namespace,
  excludeServiceName,
  onClose,
}) => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');
  const dispatch = useBrokerServiceFormDispatch();

  const handleSelect = (service: BrokerService) => {
    dispatch({
      type: 'COPY_LABELS_FROM_SERVICE',
      payload: service.metadata?.labels,
    });
    onClose();
  };

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
        <BrokerServiceLabelCards
          namespace={namespace}
          excludeServiceName={excludeServiceName}
          onSelectService={handleSelect}
        />
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
