import { Alert, Badge, Code, Group, Paper, SimpleGrid, Stack, Text } from '@mantine/core';

import type { ConfiguredServerCreatePreviewResponse, ConfiguredServerPreviewResponse } from '../../api/adminApi';
import { fieldKey, formatPreviewValue } from '../../configuredServerEdit/configuredServerEditDraft';
import { useI18n } from '../../i18n';
import { DetailRow } from '../AdminConsoleShared';
import { connectivityMeta, connectivitySummary, riskFlagColor, riskFlagLabel } from '../adminConsoleUtils';

export function PreviewResult({
  preview,
}: {
  preview: ConfiguredServerPreviewResponse['preview'] | ConfiguredServerCreatePreviewResponse['preview'];
}) {
  const { t } = useI18n();
  const connectivity = preview.connectivityCheck;
  const validationTone = preview.validation.status === 'valid' ? 'teal' : 'red';
  const connectivityTone =
    connectivity.status === 'passed' ? 'teal' : connectivity.status === 'failed' ? 'red' : 'yellow';
  const structuralTemplatePreview =
    connectivity.status === 'skipped' && connectivity.reason === 'template_structural_preview';

  return (
    <Paper className="preview-result" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={800}>{t('preview.title')}</Text>
            <Text c="dimmed" size="xs">
              {t('preview.domainFacts')}
            </Text>
          </div>
          <Code className="preview-fingerprint">{preview.previewFingerprint}</Code>
        </Group>
        <Alert color="blue" variant="light">
          {t('preview.noWrite')}
        </Alert>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          <DetailRow
            label={t('preview.target')}
            value={preview.targetName}
            meta={t('preview.proposed', { name: preview.proposedTargetName ?? preview.targetName })}
          />
          <DetailRow
            label={t('preview.validation')}
            value={preview.validation.status}
            meta={
              preview.validation.errors.length > 0
                ? t('preview.fieldIssues', { count: preview.validation.errors.length })
                : t('preview.readyToApply')
            }
          />
          <DetailRow
            label={t('preview.configChange')}
            value={preview.configChange.status}
            meta={`${preview.configChange.operation} / ${preview.configChange.changed ? t('preview.changed') : t('preview.unchanged')}`}
          />
          {'expectedReload' in preview ? (
            <DetailRow
              label={t('preview.expectedReload')}
              value={t('preview.checkedAfterCreation')}
              meta={t('preview.reloadReportedAfterWrite')}
            />
          ) : (
            <DetailRow
              label={t('preview.reload')}
              value={preview.configChange.reload.status}
              meta={preview.configChange.reload.error}
            />
          )}
          <DetailRow
            label={t('preview.backup')}
            value={preview.configChange.backup.created ? t('preview.backupCreated') : t('preview.backupNotCreated')}
            meta={preview.configChange.backup.path}
          />
          <Paper className={`connectivity-card connectivity-${connectivity.status}`} withBorder>
            <Stack gap={4}>
              <Group justify="space-between" gap="xs">
                <Text fw={700}>
                  {structuralTemplatePreview ? t('preview.runtimeContact') : t('preview.connectivity')}
                </Text>
                <Badge color={connectivityTone} variant="light">
                  {connectivity.status}
                </Badge>
              </Group>
              <Text size="sm">
                {structuralTemplatePreview ? t('preview.structuralSkipped') : connectivitySummary(connectivity)}
              </Text>
              {connectivityMeta(preview) ? (
                <Text c="dimmed" size="xs">
                  {connectivityMeta(preview)}
                </Text>
              ) : null}
            </Stack>
          </Paper>
        </SimpleGrid>
        {preview.templateAnalysis ? (
          <Stack gap="xs">
            <Group gap="xs">
              <Text fw={800}>{t('preview.templateStructure')}</Text>
              <Badge color={preview.templateAnalysis.syntax.valid ? 'teal' : 'red'} variant="light">
                {preview.templateAnalysis.syntax.valid ? t('preview.validSyntax') : t('preview.invalidSyntax')}
              </Badge>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
              <DetailRow
                label={t('preview.requestContextVars')}
                value={preview.templateAnalysis.variables.join(', ') || t('common.none')}
                meta={t('preview.namesOnly')}
              />
              <DetailRow
                label={t('preview.runtimeInstances')}
                value={t('preview.activeCount', { count: preview.runtimeImpact?.activeInstanceCount ?? 0 })}
                meta={
                  preview.runtimeImpact?.retirementRequired
                    ? t('preview.instancesRetire')
                    : t('preview.noInstanceCreated')
                }
              />
            </SimpleGrid>
          </Stack>
        ) : null}
        {preview.toolSelection ? (
          <Stack gap="xs">
            <Group gap="xs">
              <Text fw={800}>{t('preview.toolImpact')}</Text>
              <Badge variant="outline">{preview.toolSelection.model}</Badge>
            </Group>
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
              <DetailRow
                label={t('preview.selection')}
                value={t('preview.enabledDisabled', {
                  enabled: preview.toolSelection.counts.enabled,
                  disabled: preview.toolSelection.counts.disabled,
                })}
                meta={t('preview.unresolvedCount', { count: preview.toolSelection.counts.unresolved })}
              />
              <DetailRow
                label={t('preview.approxTokens')}
                value={`${preview.toolSelection.approximateTokens.before} → ${preview.toolSelection.approximateTokens.after}`}
                meta={t('preview.savings', { count: preview.toolSelection.approximateTokens.savings })}
              />
              <DetailRow
                label={t('preview.runtimeEffect')}
                value={preview.toolSelection.effect === 'immediate' ? t('preview.immediate') : t('preview.deferred')}
                meta={t('preview.changedTools', { count: preview.toolSelection.changedTools.length })}
              />
            </SimpleGrid>
            {preview.toolSelection.requiresZeroEnabledConfirmation ? (
              <Alert color="red" role="alert">
                {t('preview.disablesAllTools')}
              </Alert>
            ) : null}
          </Stack>
        ) : null}
        {preview.configChange.warnings?.map((warning) => (
          <DetailRow key={`warning:${warning}`} label={t('preview.warning')} value={warning} />
        ))}
        {preview.warnings?.map((warning) => (
          <DetailRow key={`preview-warning:${warning}`} label={t('preview.previewWarning')} value={warning} />
        ))}
        {preview.configChange.retentionCleanup.warnings.map((warning) => (
          <DetailRow key={`retention:${warning}`} label={t('preview.retentionWarning')} value={warning} />
        ))}
        {preview.validation.errors.length > 0 ? (
          <Stack gap="xs">
            <Group gap="xs">
              <Text fw={800}>{t('preview.validationIssues')}</Text>
              <Badge color={validationTone} variant="light">
                {preview.validation.errors.length}
              </Badge>
            </Group>
            {preview.validation.errors.map((error) => (
              <DetailRow
                key={`${fieldKey(error.fieldPath)}:${error.code}`}
                label={error.fieldPath.join('.') || 'form'}
                value={error.code}
                meta={error.message}
              />
            ))}
          </Stack>
        ) : null}
        {preview.diff.length > 0 ? (
          <Stack gap="xs">
            <Group gap="xs">
              <Text fw={800}>{t('preview.redactedDiff')}</Text>
              <Badge variant="outline">{t('preview.changeCount', { count: preview.diff.length })}</Badge>
            </Group>
            {preview.diff.map((entry) => (
              <Paper key={fieldKey(entry.fieldPath)} className="preview-diff-entry" withBorder>
                <Stack gap={6}>
                  <Group justify="space-between" align="flex-start" gap="xs">
                    <Text fw={700}>{entry.fieldPath.join('.')}</Text>
                    <Group gap={4}>
                      {entry.secretAction ? (
                        <Badge color="grape" variant="light">
                          secret: {entry.secretAction}
                        </Badge>
                      ) : null}
                      {entry.riskFlags.map((flag) => (
                        <Badge key={flag} color={riskFlagColor(flag)} variant="light">
                          {riskFlagLabel(flag)}
                        </Badge>
                      ))}
                    </Group>
                  </Group>
                  <Text size="sm">
                    <Text span c="dimmed">
                      {t('preview.from')}{' '}
                    </Text>
                    {formatPreviewValue(entry.oldValue)}
                    <Text span c="dimmed">
                      {' '}
                      {t('preview.to')}{' '}
                    </Text>
                    {formatPreviewValue(entry.newValue)}
                  </Text>
                </Stack>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Text c="dimmed" size="sm">
            {t('preview.noFieldChanges')}
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
