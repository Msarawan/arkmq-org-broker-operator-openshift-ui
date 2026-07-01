import { K8sResourceConditionStatus, type K8sResourceCondition } from '../../k8s/types';

export type ReadyConditionLabelKey = 'Running' | 'Warning' | 'Failed' | 'Pending';

export type ReadyConditionLabelColor = 'green' | 'orange' | 'red' | 'grey';

export interface ReadyConditionDisplay {
  labelKey: ReadyConditionLabelKey;
  color: ReadyConditionLabelColor;
}

const FAILED_REASON_PATTERN = /fail/i;

export function getReadyConditionDisplay(
  conditions: K8sResourceCondition[] | undefined,
  conditionType = 'Ready',
): ReadyConditionDisplay {
  const condition = conditions?.find((entry) => entry.type === conditionType);

  if (!condition) {
    return { labelKey: 'Pending', color: 'grey' };
  }

  if (condition.status === K8sResourceConditionStatus.True) {
    return { labelKey: 'Running', color: 'green' };
  }

  if (condition.status === K8sResourceConditionStatus.False) {
    const reason = condition.reason ?? '';
    if (FAILED_REASON_PATTERN.test(reason)) {
      return { labelKey: 'Failed', color: 'red' };
    }
    return { labelKey: 'Warning', color: 'orange' };
  }

  return { labelKey: 'Warning', color: 'orange' };
}
