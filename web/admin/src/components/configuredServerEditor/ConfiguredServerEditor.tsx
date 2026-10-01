import { Alert, Badge, Button, Group, Paper, SegmentedControl, Stack, Text, Textarea, Title } from '@mantine/core';

import { Pencil, ServerCog, ShieldCheck } from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { ConfiguredServerEditField } from '../../api/adminApi';
import { ConfiguredServerDelete } from '../../configuredServerDelete/ConfiguredServerDelete';
import type { ConfiguredServerDeleteModel } from '../../configuredServerDelete/useConfiguredServerDelete';
import {
  fieldAppliesToTransport,
  fieldKey,
  selectedTransportType,
} from '../../configuredServerEdit/configuredServerEditDraft';
import type { ConfiguredServerEditModel } from '../../configuredServerEdit/useConfiguredServerEdit';
import { configuredServerApplyEligibility } from '../../configuredServerEdit/useConfiguredServerEdit';
import { useI18n } from '../../i18n';
import { EmptyState, Panel } from '../AdminConsoleShared';
import { transportSummaryLabel } from '../adminConsoleUtils';
import { ConfiguredToolTable } from './ConfiguredToolTable';
import { ConfiguredServerFieldDraft, editGroupHelp, SecretFieldDraft } from './EditControls';
import { PreviewResult } from './PreviewResult';

export function ConfiguredServerEditor({
  model,
  deleteModel,
}: {
  model: ConfiguredServerEditModel;
  deleteModel: ConfiguredServerDeleteModel;
}) {
  const { t } = useI18n();
  const { state } = model;
  const advancedSettingsRef = useRef<HTMLDetailsElement>(null);
  const hasAdvancedPreviewErrors =
    state.status === 'loaded' &&
    Boolean(
      state.preview?.validation.errors.some((error) =>
        state.detail.editContract.fieldGroups
          .flatMap((group) => group.fields)
          .some((field) => fieldKey(field.fieldPath) === fieldKey(error.fieldPath) && !isPrimaryEditField(field)),
      ),
    );

  useEffect(() => {
    if (hasAdvancedPreviewErrors && advancedSettingsRef.current) advancedSettingsRef.current.open = true;
  }, [hasAdvancedPreviewErrors]);

  if (state.status === 'list') {
    return (
      <Panel title={t('edit.title')} utility={t('edit.selectTarget')} icon={<Pencil size={17} />}>
        <Stack className="edit-empty-state" gap="xs">
          <Text fw={700}>{t('edit.selectHint')}</Text>
          <Text c="dimmed" size="sm">
            {t('edit.flow')}
          </Text>
        </Stack>
      </Panel>
    );
  }

  if (state.status === 'loading') {
    return (
      <Panel title={t('edit.serverDetail')} utility={state.serverId} icon={<ServerCog size={17} />}>
        <EmptyState message={t('edit.loadingDetail')} />
      </Panel>
    );
  }

  if (state.status === 'committed' || state.status === 'committedRefreshFailed') {
    return (
      <Panel title={t('edit.serverDetail')} utility={state.serverId} icon={<ServerCog size={17} />}>
        <Stack gap="sm">
          <Alert color="teal" role="status">
            {state.success}
          </Alert>
          {state.warning ? (
            <Alert color="yellow" role="status">
              {state.warning}
            </Alert>
          ) : null}
          {state.status === 'committed' ? (
            <EmptyState message={t('edit.refreshingCommitted')} />
          ) : (
            <Alert color="yellow" role="status">
              {state.message}
            </Alert>
          )}
          <Text c="dimmed" size="sm">
            {t('edit.editingUnavailable')}
          </Text>
          <Group>
            {state.status === 'committedRefreshFailed' ? (
              <Button onClick={() => void model.open(state.serverId)}>{t('edit.retryDetail')}</Button>
            ) : null}
            <Button variant="default" onClick={() => void model.close('/admin/servers')}>
              {t('common.backToServers')}
            </Button>
          </Group>
        </Stack>
      </Panel>
    );
  }

  if (state.status === 'missing') {
    return (
      <Panel title={t('edit.serverDetail')} utility={state.serverId} icon={<ServerCog size={17} />}>
        <Stack gap="sm">
          <Title order={3}>{t('edit.notFound')}</Title>
          <Text c="dimmed">{t('edit.notFoundBody', { id: state.serverId })}</Text>
          <Alert color="yellow" variant="light">
            {t('edit.notFoundHint')}
          </Alert>
          <Button variant="default" onClick={() => model.close('/admin/servers')}>
            Back to servers
          </Button>
        </Stack>
      </Panel>
    );
  }

  if (state.status === 'failed') {
    return (
      <Panel title={t('edit.serverDetail')} utility={state.serverId} icon={<ServerCog size={17} />}>
        <Stack gap="sm">
          <Alert color="red" role="alert">
            {state.message}
          </Alert>
          <Text c="dimmed" size="sm">
            {t('edit.failedHint')}
          </Text>
          <Button variant="default" onClick={() => model.close('/admin/servers')}>
            Back to servers
          </Button>
        </Stack>
      </Panel>
    );
  }

  const transportType = selectedTransportType(state.fieldDraft, state.detail.server.transport.type);
  const templateTarget = state.detail.server.source === 'mcpTemplates';
  const fieldGroups = state.detail.editContract.fieldGroups
    .map((group) => ({
      ...group,
      fields: group.fields.filter((field) => fieldAppliesToTransport(field, transportType)),
    }))
    .filter((group) => group.fields.length > 0);
  const primaryGroups = fieldGroups
    .map((group) => ({ ...group, fields: group.fields.filter(isPrimaryEditField) }))
    .filter((group) => group.fields.length > 0);
  const advancedFields = fieldGroups.flatMap((group) => group.fields).filter((field) => !isPrimaryEditField(field));
  const applyEligibility = configuredServerApplyEligibility(state);

  const renderField = (field: ConfiguredServerEditField) => {
    const overrideKey = field.fieldPath[0] === 'transport' ? field.fieldPath[1] : field.fieldPath[0];
    const overrideCleared = Boolean(overrideKey && state.clearedTransportOverrides.includes(overrideKey));
    const timeout = ['timeout', 'connectionTimeout', 'requestTimeout'].includes(field.fieldPath[1] ?? '');
    const presentedField = timeout ? { ...field, label: `${field.label} (ms)` } : field;
    return (
      <Stack key={fieldKey(field.fieldPath)} gap={4}>
        {field.control === 'secret' ? (
          <SecretFieldDraft
            field={presentedField}
            draft={state.secretDraft[fieldKey(field.fieldPath)]}
            onChange={(draft) => model.changeSecret(field.fieldPath, draft)}
          />
        ) : (
          <ConfiguredServerFieldDraft
            field={presentedField}
            value={state.fieldDraft[fieldKey(field.fieldPath)]}
            onChange={(value) => model.changeField(field.fieldPath, value)}
          />
        )}
        {field.overrideSupported && overrideKey ? (
          <Group justify="space-between" gap="xs">
            <Badge variant="outline">
              {overrideCleared ? 'will inherit' : field.source === 'inherited' ? 'inherited' : field.source}
            </Badge>
            {field.clearOverrideSupported ? (
              <Button
                size="compact-xs"
                variant="subtle"
                onClick={() => model.changeTransportOverride(overrideKey, !overrideCleared)}
              >
                {overrideCleared ? t('edit.restoreOverride') : t('edit.clearOverride')}
              </Button>
            ) : null}
          </Group>
        ) : null}
      </Stack>
    );
  };

  return (
    <Panel
      title={t('edit.title')}
      utility={state.detail.server.enabled ? t('common.enabled') : t('common.disabled')}
      icon={<Pencil size={17} />}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text className="eyebrow" size="xs">
              {t('create.target')}
            </Text>
            <Group gap="xs" align="center">
              <Title order={2}>{state.detail.server.id}</Title>
              <Badge color={state.detail.server.enabled ? 'teal' : 'yellow'} variant="light">
                {state.detail.server.enabled ? t('servers.enabledBadge') : t('servers.disabledBadge')}
              </Badge>
              <Badge variant="outline">{templateTarget ? t('servers.template') : t('servers.static')}</Badge>
              {state.detail.server.definition?.authority && state.detail.server.definition.authority !== 'sole' ? (
                <Badge color={state.detail.server.definition.authority === 'authoritative' ? 'teal' : 'yellow'}>
                  {state.detail.server.definition.authority}
                </Badge>
              ) : null}
            </Group>
            <Text c="dimmed" size="sm">
              {transportSummaryLabel(state.detail.server)}
            </Text>
            <Text c="dimmed" size="xs">
              {state.detail.server.definition?.qualifiedId ?? `${state.detail.server.source}/${state.detail.server.id}`}{' '}
              · {t('edit.draftLocal')}
            </Text>
          </div>
          <Button variant="default" onClick={() => model.close('/admin/servers')}>
            {t('common.back')}
          </Button>
        </Group>
        {templateTarget ? (
          <Paper className="edit-section" withBorder>
            <Stack gap="xs">
              <Group justify="space-between">
                <Text fw={800}>{t('edit.templateDefinition')}</Text>
                <Badge variant="outline">
                  {t('edit.activeInstances', { count: state.detail.server.runtime?.activeInstanceCount ?? 0 })}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed">
                {t('edit.templateDefinitionHint')}
              </Text>
              <Text size="sm">
                {t('edit.requestContextVars')}{' '}
                {state.detail.server.templateAnalysis?.unresolvedVariables.join(', ') || t('common.none')}
              </Text>
              {state.detail.server.templateAnalysis?.syntax.valid === false ? (
                <Alert color="red">{t('edit.templateSyntaxInvalid')}</Alert>
              ) : null}
            </Stack>
          </Paper>
        ) : null}
        {primaryGroups.map((group) => (
          <Paper key={group.id} className="edit-section" withBorder>
            <Stack gap="xs">
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text fw={800}>{group.label}</Text>
                  <Text c="dimmed" size="xs">
                    {editGroupHelp(group.id, t)}
                  </Text>
                </div>
                <Badge variant="outline">{t('common.fieldCount', { count: group.fields.length })}</Badge>
              </Group>
              {group.fields.map(renderField)}
            </Stack>
          </Paper>
        ))}
        {state.detail.toolInventory ? (
          <Paper className="edit-section" withBorder>
            <ConfiguredToolTable
              inventory={state.detail.toolInventory}
              draft={state.toolDraft}
              disabled={state.applyBusy}
              refreshBusy={state.toolInventoryBusy}
              refreshError={state.toolInventoryError}
              onToolChange={model.changeTool}
              onBulkChange={model.changeVisibleTools}
              onModelChange={model.changeToolModel}
              onRefresh={() => model.refreshToolInventory?.()}
            />
          </Paper>
        ) : null}
        {advancedFields.length > 0 ? (
          <details ref={advancedSettingsRef} className="advanced-settings">
            <summary>{t('common.advancedSettings')}</summary>
            <Stack gap="sm" mt="sm">
              <Text c="dimmed" size="xs">
                {t('common.timeoutHint')}
              </Text>
              {advancedFields.map(renderField)}
            </Stack>
          </details>
        ) : null}
        <Paper className="edit-section instruction-override-editor" withBorder>
          <Stack gap="xs">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text fw={800}>{t('edit.serverInstructions')}</Text>
                <Text c="dimmed" size="xs">
                  {t('edit.serverInstructionsHint')}
                </Text>
              </div>
              <Badge variant="outline">
                {t('edit.effective')}{' '}
                {state.instructionOverride.mode === 'replace'
                  ? t('edit.effectiveReplacement')
                  : state.instructionOverride.mode}
              </Badge>
            </Group>
            <SegmentedControl
              fullWidth
              aria-label={t('edit.instructionOverrideAria')}
              value={state.instructionOverride.mode}
              onChange={(value) => model.changeInstructionOverride(value as 'upstream' | 'replace' | 'suppress')}
              data={[
                { value: 'upstream', label: t('edit.useUpstream') },
                { value: 'replace', label: t('edit.replace') },
                { value: 'suppress', label: t('edit.suppress') },
              ]}
            />
            {state.instructionOverride.mode === 'replace' ? (
              <Textarea
                label={t('edit.replacementInstructions')}
                minRows={5}
                value={state.instructionOverride.value}
                onChange={(event) => model.changeInstructionOverride('replace', event.currentTarget.value)}
              />
            ) : (
              <Text size="sm" className="instruction-override-readonly">
                {state.instructionOverride.mode === 'upstream'
                  ? t('edit.upstreamPreserved')
                  : t('edit.suppressedEmpty')}
              </Text>
            )}
          </Stack>
        </Paper>
        <Group className="draft-action-bar" justify="space-between" gap="sm">
          <div>
            <Badge color={state.dirty ? 'yellow' : 'gray'} variant={state.dirty ? 'light' : 'outline'}>
              {state.dirty ? t('instr.unsaved') : t('edit.noChanges')}
            </Badge>
            <Text c="dimmed" size="xs">
              {t('edit.previewHint')}
            </Text>
          </div>
          <Group gap="xs">
            <Button
              loading={state.previewBusy}
              disabled={!state.dirty || state.previewBusy || state.applyBusy || state.toolInventoryBusy}
              onClick={() => void model.preview('auto')}
            >
              {t('edit.previewChange')}
            </Button>
            {state.preview && !templateTarget ? (
              <Button
                variant="default"
                loading={state.previewBusy}
                disabled={state.applyBusy || state.toolInventoryBusy}
                onClick={() => void model.preview('manual')}
              >
                {t('common.rerunConnectivity')}
              </Button>
            ) : null}
          </Group>
        </Group>
        {state.previewError ? (
          <Alert color="red" role="alert">
            {state.previewError}
          </Alert>
        ) : null}
        {state.applyError ? (
          <Alert color="red" role="alert">
            {state.applyError}
          </Alert>
        ) : null}
        {state.applyWarning ? (
          <Alert color="yellow" role="status">
            {state.applyWarning}
          </Alert>
        ) : null}
        {state.applySuccess ? (
          <Alert color="teal" role="status">
            {state.applySuccess}
          </Alert>
        ) : null}
        {state.preview ? (
          <>
            <Group justify="flex-end" align="center">
              {!applyEligibility.eligible ? (
                <Text c="dimmed" size="sm">
                  {applyEligibility.reason}
                </Text>
              ) : null}
              <Button
                leftSection={<ShieldCheck size={16} />}
                loading={state.applyBusy}
                disabled={!applyEligibility.eligible || state.applyBusy || state.toolInventoryBusy}
                onClick={() => void model.apply()}
              >
                {t('edit.applyChanges')}
              </Button>
            </Group>
            <PreviewResult preview={state.preview} />
          </>
        ) : null}
        {!state.dirty && state.detail.editContract.capabilities.delete.supported ? (
          <ConfiguredServerDelete model={deleteModel} target={state.detail.server.target} />
        ) : null}
      </Stack>
    </Panel>
  );
}

function isPrimaryEditField(field: ConfiguredServerEditField): boolean {
  if (field.control === 'secret') return false;
  return field.fieldPath[0] !== 'transport' || ['type', 'command', 'args', 'url'].includes(field.fieldPath[1] ?? '');
}
