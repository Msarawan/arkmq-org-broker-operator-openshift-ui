import type { FC } from 'react';
import { useMemo } from 'react';
import {
  Alert,
  Bullseye,
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
  Spinner,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { useK8sWatchResource } from '@openshift-console/dynamic-plugin-sdk';
import { useTranslation } from 'react-i18next';
import { BrokerServiceModel } from '../../k8s/models';
import type { BrokerService } from '../../k8s/types';

export interface BrokerServiceLabelCardsProps {
  /** Namespace to list BrokerServices from. */
  namespace: string;
  /** Service name to omit (e.g. the service being edited). */
  excludeServiceName?: string;
  /** Highlights the selected card when the parent keeps selection. */
  selectedServiceName?: string;
  /** Called when the user activates a service card. */
  onSelectService: (service: BrokerService) => void;
}

/** Shared BrokerService card list (name + label chips) for copy-labels modals. */
export const BrokerServiceLabelCards: FC<BrokerServiceLabelCardsProps> = ({
  namespace,
  excludeServiceName,
  selectedServiceName,
  onSelectService,
}) => {
  const { t } = useTranslation('plugin__arkmq-org-broker-operator-openshift-ui');

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

  const errorMessage =
    loadError instanceof Error
      ? loadError.message
      : typeof loadError === 'string'
        ? loadError
        : loadError
          ? ''
          : undefined;

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner aria-label={t('Loading BrokerServices')} />
      </Bullseye>
    );
  }

  if (errorMessage) {
    return (
      <Alert variant="danger" isInline title={t('An error occurred')}>
        {errorMessage}
      </Alert>
    );
  }

  if (selectableServices.length === 0) {
    return (
      <EmptyState headingLevel="h2" titleText={t('No BrokerServices found')}>
        <EmptyStateBody>
          {t('There are no other BrokerServices in this namespace to copy labels from.')}
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Stack hasGutter data-test="copy-labels-service-list">
      {selectableServices.map((service) => {
        const name = service.metadata?.name ?? '';
        const titleId = `copy-labels-service-title-${name}`;
        const labelEntries = Object.entries(service.metadata?.labels ?? {});
        const isSelected = selectedServiceName === name;

        return (
          <StackItem key={name}>
            <Card
              isClickable
              isCompact
              // Clickable-only cards highlight via isClicked; isSelected alone has no visual effect.
              isClicked={isSelected}
              data-test={`copy-labels-service-card-${name}`}
            >
              <CardHeader
                selectableActions={{
                  selectableActionId: `copy-labels-select-${name}`,
                  selectableActionAriaLabelledby: titleId,
                  name: 'copy-labels-service-selection',
                  onClickAction: () => {
                    onSelectService(service);
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
  );
};
