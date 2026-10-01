import {
  Alert,
  Badge,
  Button,
  Group,
  NativeSelect,
  Paper,
  PasswordInput,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';

import { Pencil, Plus, ServerCog, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { ConfiguredServerEditField } from '../../api/adminApi';
import type { ConfiguredServerCreateSecretDraft } from '../../configuredServerCreate/configuredServerCreateState';
import {
  configuredServerCreateApplyEligibility,
  type ConfiguredServerCreateModel,
} from '../../configuredServerCreate/useConfiguredServerCreate';
import { fieldAppliesToTransport, fieldKey } from '../../configuredServerEdit/configuredServerEditDraft';
import { useI18n } from '../../i18n';
import { EmptyState, Panel } from '../AdminConsoleShared';
import { ConfiguredServerFieldDraft, editGroupHelp } from '../configuredServerEditor/EditControls';
import { PreviewResult } from '../configuredServerEditor/PreviewResult';

export function ConfiguredServerCreator({ model }: { model: ConfiguredServerCreateModel }) {
  const { t } = useI18n();
  const { state } = model;
  const advancedSettingsRef = useRef<HTMLDetailsElement>(null);
  const hasAdvancedPreviewErrors =
    state.status === 'editing' &&
    Boolean(state.preview?.validation.errors.some((error) => !isPrimaryCreateField(error.fieldPath)));

  useEffect(() => {
    if (hasAdvancedPreviewErrors && advancedSettingsRef.current) advancedSettingsRef.current.open = true;
  }, [hasAdvancedPreviewErrors]);

  if (state.status === 'idle') return null;
  if (state.status === 'loading') {
    return (
      <Panel title={t('create.title')} utility={t('common.loading')} icon={<ServerCog size={17} />}>
        <EmptyState message={t('create.loadingControls')} />
      </Panel>
    );
  }
  if (state.status === 'failed') {
    return (
      <Panel title={t('create.title')} utility={t('common.unavailable')} icon={<ServerCog size={17} />}>
        <Stack gap="sm">
          <Alert color="red" role="alert">
            {state.message}
          </Alert>
          <Group>
            <Button onClick={() => void model.open()}>{t('create.retryLoading')}</Button>
            <Button variant="default" onClick={() => void model.close()}>
              {t('common.backToServers')}
            </Button>
          </Group>
        </Stack>
      </Panel>
    );
  }
  if (state.status === 'committed') {
    return (
      <Panel title={t('create.created')} utility={state.serverId} icon={<ShieldCheck size={17} />}>
        <Stack gap="sm">
          <Alert color="teal" role="status">
            {t('create.createdId', { id: state.serverId })}
          </Alert>
          {state.warning ? <Alert color="yellow">{state.warning}</Alert> : null}
          <Text c="dimmed" size="sm">
            {t('create.refreshing')}
          </Text>
          <Button
            onClick={() =>
              void model.close(
                `/admin/servers/${state.result.targetSource ?? state.result.configChange.target.source ?? 'mcpServers'}/${encodeURIComponent(state.serverId)}`,
              )
            }
          >
            {t('create.openDetail')}
          </Button>
        </Stack>
      </Panel>
    );
  }

  const transportType = state.fieldDraft[fieldKey(['transport', 'type'])];
  const source = state.fieldDraft[fieldKey(['source'])] === 'mcpTemplates' ? 'mcpTemplates' : 'mcpServers';
  const selectedTransport = transportType === 'http' || transportType === 'sse' ? transportType : 'stdio';
  const groups = state.contract.createContract.fieldGroups
    .map((group) => ({
      ...group,
      fields: group.fields.filter(
        (field) =>
          field.fieldPath[0] !== 'source' &&
          (!field.applicableSources || field.applicableSources.includes(source)) &&
          fieldAppliesToTransport(field, selectedTransport),
      ),
    }))
    .filter((group) => group.fields.length > 0);
  const primaryGroups = groups
    .map((group) => ({
      ...group,
      fields: group.fields.filter((field) => isPrimaryCreateField(field.fieldPath)),
    }))
    .filter((group) => group.fields.length > 0);
  const advancedFields = groups
    .flatMap((group) => group.fields)
    .filter((field) => !isPrimaryCreateField(field.fieldPath));
  const eligibility = configuredServerCreateApplyEligibility(state);
  const staticNameConflict =
    state.preview?.configChange.target.source === 'mcpServers' &&
    state.preview.validation.errors.some((error) =>
      ['configured_server_name_conflict', 'configured_server_destination_conflict'].includes(error.code),
    );

  return (
    <Panel
      title={t('create.title')}
      utility={source === 'mcpTemplates' ? t('create.newTemplate') : t('create.newStatic')}
      icon={<Plus size={17} />}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text className="eyebrow" size="xs">
              {t('create.target')}
            </Text>
            <Title order={2}>{source === 'mcpTemplates' ? t('create.newTemplate') : t('create.newServer')}</Title>
            <Text c="dimmed" size="sm">
              {t('create.flow')}
            </Text>
          </div>
          <Button variant="default" onClick={() => void model.close()}>
            {t('common.back')}
          </Button>
        </Group>
        <SegmentedControl
          fullWidth
          aria-label={t('create.defTypeAria')}
          value={source}
          onChange={(value) => model.changeField(['source'], value)}
          data={[
            { value: 'mcpServers', label: t('servers.static') },
            { value: 'mcpTemplates', label: t('servers.template') },
          ]}
        />
        {source === 'mcpTemplates' ? (
          <Alert color="blue" variant="light">
            {t('create.templatePreviewHint')}
          </Alert>
        ) : null}
        {selectedTransport === 'sse' ? (
          <Alert color="yellow" title={t('create.legacyTransport')}>
            {t('create.sseDeprecated')}
          </Alert>
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
              {group.fields.map((field) => renderCreateField(field, state.fieldDraft, model.changeField))}
            </Stack>
          </Paper>
        ))}
        <details ref={advancedSettingsRef} className="advanced-settings">
          <summary>{t('common.advancedSettings')}</summary>
          <Stack gap="sm" mt="sm">
            {advancedFields.length > 0 ? (
              <Paper className="edit-section" withBorder>
                <Stack gap="xs">
                  <Text fw={800}>{t('create.optionalTransport')}</Text>
                  <Text c="dimmed" size="xs">
                    {t('common.timeoutHint')}
                  </Text>
                  {advancedFields.map((field) => renderCreateField(field, state.fieldDraft, model.changeField))}
                </Stack>
              </Paper>
            ) : null}
            <DynamicSecrets
              transport={selectedTransport}
              secrets={state.secrets}
              inlineSupported={
                Boolean(state.contract.createContract.secretPolicy.inlineReplacement) &&
                state.contract.createContract.secretPolicy.allowedActions.includes('replace')
              }
              onAdd={model.addSecret}
              onChange={model.changeSecret}
              onRemove={model.removeSecret}
            />
          </Stack>
        </details>
        <Group className="draft-action-bar" justify="space-between" gap="sm">
          <div>
            <Badge color={state.dirty ? 'yellow' : 'gray'} variant={state.dirty ? 'light' : 'outline'}>
              {state.dirty ? t('create.unpreviewedDraft') : t('create.completeDetails')}
            </Badge>
            <Text c="dimmed" size="xs">
              {t('create.previewHint')}
            </Text>
          </div>
          <Group gap="xs">
            <Button
              loading={state.previewBusy}
              disabled={!state.dirty || state.previewBusy || state.applyBusy}
              onClick={() => void model.preview('auto')}
            >
              {t('create.previewServer')}
            </Button>
            {state.preview ? (
              <Button variant="default" disabled={state.applyBusy} onClick={() => void model.preview('manual')}>
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
        {state.preview ? (
          <>
            <Group justify="flex-end" align="center">
              {staticNameConflict ? (
                <Button
                  leftSection={<Pencil size={16} />}
                  variant="default"
                  onClick={() => void model.editExisting(state.preview?.targetName ?? '')}
                >
                  {t('create.editExisting')}
                </Button>
              ) : null}
              {!eligibility.eligible ? (
                <Text c="dimmed" size="sm">
                  {eligibility.reason}
                </Text>
              ) : null}
              <Button
                leftSection={<ShieldCheck size={16} />}
                loading={state.applyBusy}
                disabled={!eligibility.eligible || state.applyBusy}
                onClick={() => void model.apply()}
              >
                {source === 'mcpTemplates' ? t('create.createTemplate') : t('create.createServer')}
              </Button>
            </Group>
            <PreviewResult preview={state.preview} />
          </>
        ) : null}
      </Stack>
    </Panel>
  );
}

function isPrimaryCreateField(fieldPath: string[]): boolean {
  if (fieldPath[0] === 'secrets') return false;
  return fieldPath[0] !== 'transport' || ['type', 'command', 'args', 'url'].includes(fieldPath[1] ?? '');
}

function renderCreateField(
  field: ConfiguredServerEditField,
  fieldDraft: Record<string, unknown>,
  changeField: ConfiguredServerCreateModel['changeField'],
) {
  const key = fieldKey(field.fieldPath);
  const timeout = ['timeout', 'connectionTimeout', 'requestTimeout'].includes(field.fieldPath[1] ?? '');
  const presentedField = timeout ? { ...field, label: `${field.label} (ms)` } : field;
  return (
    <ConfiguredServerFieldDraft
      key={key}
      field={presentedField}
      value={fieldDraft[key]}
      onChange={(value) => changeField(field.fieldPath, value)}
    />
  );
}

function DynamicSecrets({
  transport,
  secrets,
  inlineSupported,
  onAdd,
  onChange,
  onRemove,
}: {
  transport: 'stdio' | 'http' | 'sse';
  secrets: ConfiguredServerCreateSecretDraft[];
  inlineSupported: boolean;
  onAdd(secret: ConfiguredServerCreateSecretDraft): void;
  onChange(secret: ConfiguredServerCreateSecretDraft): void;
  onRemove(id: string): void;
}) {
  const { t } = useI18n();
  const container = transport === 'stdio' ? 'env' : 'headers';
  const visible = secrets.filter((secret) => secret.container === container);
  const label = container === 'env' ? t('create.envSecrets') : t('create.headerSecrets');
  return (
    <Paper className="edit-section" withBorder>
      <Stack gap="xs">
        <Group justify="space-between">
          <div>
            <Text fw={800}>{label}</Text>
            <Text c="dimmed" size="xs">
              {t('create.envRefRecommended')}
            </Text>
          </div>
          <Button
            size="compact-sm"
            variant="default"
            leftSection={<Plus size={14} />}
            onClick={() =>
              onAdd({
                id: createSecretId(),
                container,
                key: '',
                replacementKind: 'environmentReference',
                replacementValue: '',
              })
            }
          >
            {t('create.addSecret')}
          </Button>
        </Group>
        {visible.length === 0 ? (
          <Text c="dimmed" size="sm">
            {t('create.noSecrets')}
          </Text>
        ) : (
          visible.map((secret) => (
            <Paper key={secret.id} className="secret-editor" withBorder>
              <Stack gap="xs">
                <Group align="flex-end" wrap="nowrap">
                  <TextInput
                    label={container === 'env' ? t('create.envVar') : t('create.headerName')}
                    value={secret.key}
                    onChange={(event) => onChange({ ...secret, key: event.currentTarget.value })}
                  />
                  <NativeSelect
                    label={t('create.secretSource')}
                    value={secret.replacementKind}
                    data={[
                      { value: 'environmentReference', label: t('create.envSecretRef') },
                      ...(inlineSupported ? [{ value: 'inlineSecret', label: t('create.inlineSecret') }] : []),
                    ]}
                    onChange={(event) =>
                      onChange({
                        ...secret,
                        replacementKind: event.currentTarget
                          .value as ConfiguredServerCreateSecretDraft['replacementKind'],
                        replacementValue: '',
                      })
                    }
                  />
                  <Button
                    aria-label={t('create.removeSecretInput', { key: secret.key || t('create.secret') })}
                    variant="subtle"
                    color="red"
                    onClick={() => onRemove(secret.id)}
                  >
                    <Trash2 size={16} />
                  </Button>
                </Group>
                {secret.replacementKind === 'environmentReference' ? (
                  <TextInput
                    label={t('create.envRefFor', { key: secret.key || label })}
                    placeholder={t('create.secretPlaceholder')}
                    value={secret.replacementValue}
                    onChange={(event) => onChange({ ...secret, replacementValue: event.currentTarget.value })}
                  />
                ) : (
                  <>
                    <Alert color="yellow">{t('create.inlineWarning')}</Alert>
                    <PasswordInput
                      label={t('create.inlineSecretFor', { key: secret.key || label })}
                      value={secret.replacementValue}
                      onChange={(event) => onChange({ ...secret, replacementValue: event.currentTarget.value })}
                    />
                  </>
                )}
              </Stack>
            </Paper>
          ))
        )}
      </Stack>
    </Paper>
  );
}

let secretSequence = 0;
function createSecretId(): string {
  secretSequence += 1;
  return `create-secret-${secretSequence}`;
}
