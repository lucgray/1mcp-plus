import { Alert, Text } from '@mantine/core';

import { CircleCheck, TriangleAlert } from 'lucide-react';

import type { ConfiguredServerDeleteResponse } from '../api/adminApi';
import { useI18n } from '../i18n';
import { configuredServerDeleteRecoveryRequired } from './configuredServerDeleteState';

export function ConfiguredServerDeletionNotice({
  result,
  dismiss,
}: {
  result: ConfiguredServerDeleteResponse['result'];
  dismiss(): void;
}) {
  const { t } = useI18n();
  const templateImpact = result.target.source === 'mcpTemplates' ? result.runtimeImpact : undefined;
  const recoveryRequired = configuredServerDeleteRecoveryRequired(result);

  return (
    <Alert
      color={recoveryRequired ? 'yellow' : 'teal'}
      icon={recoveryRequired ? <TriangleAlert size={16} /> : <CircleCheck size={16} />}
      title={
        recoveryRequired
          ? t('delete.noticeRecovery', { id: result.qualifiedId })
          : t('delete.noticeDeleted', { id: result.qualifiedId })
      }
      withCloseButton
      closeButtonLabel={t('delete.dismiss')}
      onClose={dismiss}
      role="status"
    >
      <Text size="sm">
        {recoveryRequired
          ? t('delete.noticeRecoveryBody', { status: result.configChange.reload.status })
          : t('delete.reloadObserved')}
      </Text>
      {recoveryRequired ? (
        <Text size="sm">{result.configChange.backup.created ? t('delete.backupExists') : t('delete.noBackup')}</Text>
      ) : null}
      {templateImpact ? (
        <Text size="sm">
          {t('delete.instancesLine', {
            before: templateImpact.activeInstancesBefore,
            retired: templateImpact.retiredInstances,
            after: templateImpact.activeInstancesAfter,
            observed: templateImpact.retirementObserved ? t('common.yes') : t('common.no'),
          })}
        </Text>
      ) : !recoveryRequired ? (
        <Text size="sm">{t('delete.backendRemoved')}</Text>
      ) : null}
    </Alert>
  );
}
