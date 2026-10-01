import { Alert, Button, Code, Group, Paper, Stack, Text, TextInput } from '@mantine/core';

import { Trash2 } from 'lucide-react';

import type { ConfiguredServerTargetIdentity } from '../api/adminApi';
import { useI18n } from '../i18n';
import { configuredServerDeleteEligible, configuredServerDeleteRecoveryRequired } from './configuredServerDeleteState';
import type { ConfiguredServerDeleteModel } from './useConfiguredServerDelete';

export function ConfiguredServerDelete({
  model,
  target,
}: {
  model: ConfiguredServerDeleteModel;
  target: ConfiguredServerTargetIdentity;
}) {
  const { t } = useI18n();
  const { state } = model;
  const preview = state.preview;
  const result = state.result;

  return (
    <Paper className="edit-section configured-server-delete" withBorder>
      <Stack gap="sm">
        <div>
          <Text fw={800} c="red">
            {t('delete.title')}
          </Text>
          <Text c="dimmed" size="sm">
            {t('delete.description')}
          </Text>
        </div>
        {result ? (
          <Alert color={configuredServerDeleteRecoveryRequired(result) ? 'yellow' : 'teal'} role="status">
            {configuredServerDeleteRecoveryRequired(result)
              ? result.configChange.reload.status === 'failed'
                ? t('delete.resultReloadFailed')
                : t('delete.resultRetirementUnconfirmed')
              : t('delete.resultOk')}{' '}
            {result.configChange.backup.created ? t('delete.backupExists') : t('delete.noBackup')}
          </Alert>
        ) : !preview ? (
          <Button
            color="red"
            variant="outline"
            leftSection={<Trash2 size={16} />}
            loading={state.previewBusy}
            disabled={state.previewBusy || state.applyBusy}
            onClick={() => void model.preview(target)}
          >
            {t('delete.previewDeletion')}
          </Button>
        ) : (
          <Stack gap="xs">
            <Alert color="red" title={t('delete.confirmTitle', { id: preview.qualifiedId })}>
              {preview.runtimeImpact.kind === 'template'
                ? t('delete.retireAfterReload', { count: preview.runtimeImpact.activeInstanceCount })
                : t('delete.removeBackend')}
              {preview.removal.preservesSameNamedOtherSource ? ` ${t('delete.sameNamedRemains')}` : ''}
            </Alert>
            <Stack gap={2} className="configured-server-delete-facts">
              <Text size="xs">
                {t('delete.identity')} {preview.qualifiedId}
              </Text>
              <Text size="xs">
                {t('delete.authority')} {preview.authority}
              </Text>
              <Text size="xs">
                {t('delete.fingerprint')} {preview.targetFingerprint}
              </Text>
              <Text size="xs">{t('delete.removalDiff')}</Text>
              <Text size="xs">{t('delete.backupLine')}</Text>
              <Text size="xs">{t('delete.reloadLine')}</Text>
              <Text size="xs">
                {t('delete.expectedReload')} {preview.expectedReload.possibleStatuses.join(', ')}
              </Text>
              <Text size="xs">
                {t('delete.runtimeImpact')}{' '}
                {preview.runtimeImpact.kind === 'template'
                  ? t('delete.retireInstances', { count: preview.runtimeImpact.activeInstanceCount })
                  : t('delete.removeBackend')}
              </Text>
            </Stack>
            <div>
              <Text size="xs" fw={700}>
                {t('delete.redactedDefinition')}
              </Text>
              <Code block>{JSON.stringify(preview.removal.definition, null, 2)}</Code>
            </div>
            {preview.warnings.map((warning) => (
              <Text key={warning} size="xs" c="dimmed">
                {warning}
              </Text>
            ))}
            <TextInput
              label={t('delete.typeToConfirm', { id: preview.qualifiedId })}
              value={state.confirmation}
              disabled={state.applyBusy}
              autoComplete="off"
              onChange={(event) => model.changeConfirmation(event.currentTarget.value)}
            />
            <Group justify="space-between">
              <Button variant="default" disabled={state.applyBusy} onClick={model.reset}>
                Cancel
              </Button>
              <Button
                color="red"
                leftSection={<Trash2 size={16} />}
                loading={state.applyBusy}
                disabled={!configuredServerDeleteEligible(state)}
                onClick={() => void model.apply(target)}
              >
                {t('delete.title')}
              </Button>
            </Group>
          </Stack>
        )}
        {state.error ? (
          <Alert color="red" role="alert">
            {state.error}
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  );
}
