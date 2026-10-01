import {
  Alert,
  Badge,
  Button,
  Group,
  NativeSelect,
  NumberInput,
  Paper,
  PasswordInput,
  Radio,
  Stack,
  Switch,
  TagsInput,
  Text,
  Textarea,
  TextInput,
} from '@mantine/core';

import { useState } from 'react';

import type { ConfiguredServerEditField } from '../../api/adminApi';
import {
  displayFieldValue,
  objectRecord,
  type SecretDraftState,
  splitStringList,
  stringArray,
} from '../../configuredServerEdit/configuredServerEditDraft';
import { type I18n, useI18n } from '../../i18n';
import { DetailRow } from '../AdminConsoleShared';

export function editGroupHelp(groupId: string, t?: I18n['t']): string {
  const key = `editGroup.${groupId}`;
  return t ? t(key) : (EDIT_GROUP_FALLBACK[groupId] ?? EDIT_GROUP_FALLBACK.default);
}

const EDIT_GROUP_FALLBACK: Record<string, string> = {
  identity: 'Rename or enable this target before previewing.',
  secrets: 'Choose preserve, replace, or clear without revealing current values.',
  transport: 'Change how the runtime connects to this server.',
  default: 'Edit normalized fields owned by the Admin Domain.',
};

export function ConfiguredServerFieldDraft({
  field,
  value,
  onChange,
}: {
  field: ConfiguredServerEditField;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (!field.editable || field.control === 'readonly') {
    return <DetailRow label={field.label} value={displayFieldValue(value)} />;
  }

  if (field.control === 'switch') {
    return (
      <Switch
        label={field.label}
        checked={Boolean(value)}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    );
  }

  if (field.control === 'tag-list') {
    return <TagsInput label={field.label} value={stringArray(value)} onChange={onChange} />;
  }

  if (field.control === 'select') {
    return (
      <NativeSelect
        label={field.label}
        value={String(value ?? '')}
        data={field.options ?? []}
        onChange={(event) => onChange(event.currentTarget.value)}
      />
    );
  }

  if (field.control === 'number') {
    return (
      <NumberInput
        label={field.label}
        value={typeof value === 'number' ? value : ''}
        onChange={(nextValue) => onChange(nextValue === '' ? undefined : nextValue)}
      />
    );
  }

  if (field.control === 'string-list') {
    return (
      <Textarea
        label={field.label}
        value={stringArray(value).join('\n')}
        autosize
        minRows={2}
        onChange={(event) => onChange(splitStringList(event.currentTarget.value))}
      />
    );
  }

  if (field.control === 'record') {
    return <RecordFieldDraft label={field.label} value={objectRecord(value)} onChange={onChange} />;
  }

  return (
    <TextInput
      label={field.label}
      value={String(value ?? '')}
      onChange={(event) => onChange(event.currentTarget.value)}
    />
  );
}

function RecordFieldDraft({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
}) {
  const { t } = useI18n();
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  function updateEntry(key: string, entryValue: string) {
    onChange({ ...value, [key]: entryValue });
  }

  function removeEntry(key: string) {
    const next = { ...value };
    delete next[key];
    onChange(next);
  }

  function addEntry() {
    const key = newKey.trim();
    if (!key) {
      return;
    }
    onChange({ ...value, [key]: newValue });
    setNewKey('');
    setNewValue('');
  }

  return (
    <Stack className="record-editor" gap="xs">
      <Text fw={700}>{label}</Text>
      {Object.entries(value).map(([key, entryValue]) => (
        <Group key={key} gap="xs" align="flex-end" wrap="nowrap">
          <TextInput
            className="record-editor-value"
            label={`${label} ${key}`}
            value={String(entryValue ?? '')}
            onChange={(event) => updateEntry(key, event.currentTarget.value)}
          />
          <Button
            aria-label={t('editControls.removeEntry', { label, key })}
            size="compact-xs"
            variant="subtle"
            color="red"
            onClick={() => removeEntry(key)}
          >
            {t('common.remove')}
          </Button>
        </Group>
      ))}
      <Group gap="xs" align="flex-end">
        <TextInput
          label={t('editControls.newKey', { label })}
          value={newKey}
          onChange={(event) => setNewKey(event.currentTarget.value)}
        />
        <TextInput
          label={t('editControls.newValue', { label })}
          value={newValue}
          onChange={(event) => setNewValue(event.currentTarget.value)}
        />
        <Button variant="default" onClick={addEntry}>
          {t('editControls.addEntry')}
        </Button>
      </Group>
    </Stack>
  );
}

export function SecretFieldDraft({
  field,
  draft,
  onChange,
}: {
  field: ConfiguredServerEditField;
  draft?: SecretDraftState[string];
  onChange: (draft: SecretDraftState[string]) => void;
}) {
  const { t } = useI18n();
  const current =
    draft ??
    ({
      fieldPath: field.fieldPath,
      action: 'preserve',
      replacementKind: field.secret?.environmentReference.supported === false ? 'inlineSecret' : 'environmentReference',
      replacementValue: '',
    } satisfies SecretDraftState[string]);
  const actions = field.secret?.allowedActions ?? ['preserve', 'replace', 'clear'];
  const environmentSupported = field.secret?.environmentReference.supported ?? true;
  const environmentRecommended = field.secret?.environmentReference.recommended ?? environmentSupported;
  const inlineSupported = field.secret?.inlineReplacement.supported ?? false;

  return (
    <Paper className="secret-editor" withBorder>
      <Stack gap="xs">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text fw={700}>{field.label}</Text>
            <Text size="xs" c="dimmed">
              {field.secret?.environmentReference.guidance ?? t('editControls.secretGuidance')}
            </Text>
          </div>
          <Group gap={4}>
            <Badge variant="light">{t('editControls.redacted')}</Badge>
            {environmentRecommended ? (
              <Badge color="teal" variant="light">
                {t('editControls.envRefRecommended')}
              </Badge>
            ) : null}
          </Group>
        </Group>
        <Radio.Group
          value={current.action}
          onChange={(value) => onChange({ ...current, action: value as SecretDraftState[string]['action'] })}
        >
          <Group gap="sm">
            {actions.map((action) => (
              <Radio key={action} value={action} label={secretActionLabel(action, field.label, t)} />
            ))}
          </Group>
        </Radio.Group>
        {current.action === 'replace' ? (
          <Stack gap="xs">
            <Alert color="teal" variant="light">
              {t('editControls.keepSecretOutside')}
            </Alert>
            <Radio.Group
              label={t('editControls.replacementSource')}
              value={current.replacementKind}
              onChange={(value) =>
                onChange({ ...current, replacementKind: value as SecretDraftState[string]['replacementKind'] })
              }
            >
              <Group gap="sm">
                <Radio
                  disabled={!environmentSupported}
                  value="environmentReference"
                  label={t('editControls.envVarRecommended')}
                />
              </Group>
            </Radio.Group>
            {current.replacementKind === 'environmentReference' ? (
              <>
                <TextInput
                  label={t('editControls.envVarFor', { label: field.label })}
                  description={t('editControls.envVarExample')}
                  value={current.replacementValue}
                  onChange={(event) => onChange({ ...current, replacementValue: event.currentTarget.value })}
                />
                {inlineSupported ? (
                  <Button
                    size="compact-sm"
                    variant="subtle"
                    color="yellow"
                    onClick={() => onChange({ ...current, replacementKind: 'inlineSecret', replacementValue: '' })}
                  >
                    {t('editControls.useInlineSecret')}
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                <Alert color="yellow" role="alert">
                  {t('editControls.inlineWarning')}
                </Alert>
                <PasswordInput
                  label={t('editControls.inlineSecretFor', { label: field.label })}
                  value={current.replacementValue}
                  onChange={(event) => onChange({ ...current, replacementValue: event.currentTarget.value })}
                />
                {environmentSupported ? (
                  <Button
                    size="compact-sm"
                    variant="subtle"
                    onClick={() =>
                      onChange({ ...current, replacementKind: 'environmentReference', replacementValue: '' })
                    }
                  >
                    {t('editControls.useEnvVar')}
                  </Button>
                ) : null}
              </>
            )}
            <Text size="xs" c="dimmed">
              {current.replacementKind === 'environmentReference'
                ? field.secret?.environmentReference.guidance
                : field.secret?.inlineReplacement.guidance}
            </Text>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}

function secretActionLabel(action: SecretDraftState[string]['action'], label: string, t: I18n['t']): string {
  if (action === 'preserve') {
    return t('editControls.preserve', { label });
  }
  if (action === 'replace') {
    return t('editControls.replace', { label });
  }
  return t('editControls.clear', { label });
}
