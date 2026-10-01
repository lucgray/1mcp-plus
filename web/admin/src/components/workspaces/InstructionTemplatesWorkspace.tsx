import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Code,
  Group,
  SegmentedControl,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';

import { CheckCircle2, Copy, FileInput, FileText, Play, RefreshCw, Save, ShieldCheck, Trash2 } from 'lucide-react';
import { useState } from 'react';

import type { InstructionTemplateSelection, InstructionTemplateSurface } from '../../api/adminApi';
import { useI18n } from '../../i18n';
import type { InstructionTemplatesModel } from '../../instructionTemplates/useInstructionTemplates';

export function InstructionTemplatesWorkspace({
  model,
  runtimeScopeId,
}: {
  model: InstructionTemplatesModel;
  runtimeScopeId?: string;
}) {
  const { t } = useI18n();
  const selected = model.items.find((item) => item.identity === model.selectedIdentity);
  const [copyIdentity, setCopyIdentity] = useState('');
  const [legacyIdentity, setLegacyIdentity] = useState('legacy');
  const valid = selected?.validation.valid !== false;
  const activationReady = Boolean(model.activationValidation && !model.dirty && valid);

  return (
    <section aria-labelledby="instruction-templates-title" className="operations-workspace">
      <Group justify="space-between" align="flex-start" className="workspace-heading">
        <div>
          <Text className="eyebrow" size="xs">
            {t('common.runtimeScope')} / {runtimeScopeId ?? t('common.unavailable')}
          </Text>
          <Title id="instruction-templates-title" order={2}>
            {t('instr.title')}
          </Title>
          <Text c="dimmed" size="sm">
            {t('instr.description')}
          </Text>
        </div>
        <Group gap="xs">
          <Badge color={model.selectionExplicit ? 'teal' : 'gray'} variant="light">
            {model.selectionExplicit
              ? t('instr.activeBadge', { id: model.activeIdentity ?? t('instr.none') })
              : t('instr.legacySelection')}
          </Badge>
          <Button
            aria-label={t('instr.refresh')}
            leftSection={<RefreshCw size={15} />}
            variant="default"
            loading={model.busy}
            onClick={() => void model.load()}
          >
            {t('instr.refresh')}
          </Button>
          <Button leftSection={<FileText size={15} />} onClick={model.newDraft}>
            {t('instr.newTemplate')}
          </Button>
        </Group>
      </Group>

      {model.error ? (
        <Alert color="red" role="alert" mb="md">
          {model.error}
        </Alert>
      ) : null}
      {model.reloadWarning ? (
        <Alert color="yellow" role="status" mb="md" title={t('instr.reloadWarning')}>
          {model.reloadWarning}
        </Alert>
      ) : null}
      {Object.values(model.renderFailures).map((failure) => (
        <Alert key={failure.surface} color="yellow" mb="sm" role="status">
          {t('instr.renderFallback', { surface: surfaceLabel(failure.surface), id: failure.templateIdentity })}
          <Text component="span" size="xs" c="dimmed">
            {' '}
            {failure.code}
          </Text>
        </Alert>
      ))}

      <div className="instruction-workspace-grid">
        <aside className="instruction-template-list" aria-label={t('instr.libraryAria')}>
          <Group justify="space-between" className="instruction-pane-heading">
            <Text fw={800}>{t('instr.library')}</Text>
            <Badge variant="outline">{model.items.length}</Badge>
          </Group>
          <Stack gap={4} className="instruction-template-scroll">
            {model.items.map((item) => (
              <button
                type="button"
                key={item.identity}
                className={`instruction-template-row${item.identity === model.selectedIdentity ? ' instruction-template-row-active' : ''}`}
                aria-pressed={item.identity === model.selectedIdentity}
                onClick={() => model.select(item.identity)}
              >
                <span className="instruction-template-identity">{item.identity}</span>
                <span className="instruction-template-badges">
                  {item.active ? <Badge color="teal">{t('instr.active')}</Badge> : null}
                  {item.protected ? <Badge variant="outline">{t('instr.builtIn')}</Badge> : null}
                  <Badge color={item.validation.valid ? 'teal' : 'red'} variant="light">
                    {item.validation.valid ? t('instr.valid') : t('instr.invalid')}
                  </Badge>
                </span>
              </button>
            ))}
            {!model.busy && model.items.length === 0 ? (
              <Text c="dimmed" size="sm" p="sm">
                {t('instr.emptyLibrary')}
              </Text>
            ) : null}
          </Stack>

          {model.selectedIdentity ? (
            <Stack gap="xs" className="instruction-library-actions">
              <TextInput
                label={t('instr.cloneAs')}
                placeholder="template-copy"
                value={copyIdentity}
                onChange={(event) => setCopyIdentity(event.currentTarget.value)}
              />
              <Button
                leftSection={<Copy size={14} />}
                variant="default"
                disabled={!copyIdentity.trim() || model.busy}
                onClick={() => void model.clone(copyIdentity.trim()).then(() => setCopyIdentity(''))}
              >
                {t('instr.cloneTemplate')}
              </Button>
            </Stack>
          ) : null}

          {model.legacyAvailable ? (
            <Stack gap="xs" className="instruction-library-actions">
              <TextInput
                label={t('instr.importLegacyAs')}
                value={legacyIdentity}
                onChange={(event) => setLegacyIdentity(event.currentTarget.value)}
              />
              <Button
                leftSection={<FileInput size={14} />}
                variant="default"
                disabled={!legacyIdentity.trim() || model.busy}
                onClick={() => void model.importLegacy(legacyIdentity.trim())}
              >
                {t('instr.importLegacy')}
              </Button>
            </Stack>
          ) : null}
        </aside>

        <main className="instruction-editor-pane">
          <Group justify="space-between" align="flex-start" className="instruction-pane-heading">
            <div>
              <Text className="eyebrow" size="xs">
                {model.selectedIdentity ? t('instr.managedDraft') : t('instr.newManagedDraft')}
              </Text>
              <Title order={3}>{model.selectedIdentity ?? t('instr.untitled')}</Title>
            </div>
            <Group gap="xs">
              {selected?.protected ? <Badge variant="outline">{t('instr.protectedBuiltIn')}</Badge> : null}
              {selected ? (
                <Badge color={valid ? 'teal' : 'red'} variant="light">
                  {valid ? t('instr.validDraft') : t('instr.invalidDraft')}
                </Badge>
              ) : null}
              <Badge color={model.dirty ? 'yellow' : 'gray'} variant={model.dirty ? 'light' : 'outline'}>
                {model.dirty ? t('instr.unsaved') : t('instr.saved')}
              </Badge>
            </Group>
          </Group>

          <TextInput
            label={t('instr.templateName')}
            value={model.draft.identity}
            disabled={Boolean(model.selectedIdentity)}
            onChange={(event) => model.changeIdentity(event.currentTarget.value)}
          />

          <Tabs
            value={model.surface}
            onChange={(value) => value && model.changeSurface(value as InstructionTemplateSurface)}
          >
            <Tabs.List grow>
              <Tabs.Tab value="initialize">{t('instr.initialization')}</Tabs.Tab>
              <Tabs.Tab value="cli">{t('instr.cli')}</Tabs.Tab>
            </Tabs.List>
            {(['initialize', 'cli'] as const).map((surface) => (
              <Tabs.Panel key={surface} value={surface} pt="sm">
                <Textarea
                  className="instruction-template-editor"
                  aria-label={surface === 'cli' ? t('instr.cliTemplate') : t('instr.initializationTemplate')}
                  autosize
                  minRows={12}
                  maxRows={24}
                  disabled={selected?.protected}
                  value={model.draft.variants[surface === 'initialize' ? 'initialization' : 'cli']}
                  onChange={(event) => model.changeVariant(surface, event.currentTarget.value)}
                />
              </Tabs.Panel>
            ))}
          </Tabs>

          {selected && !selected.validation.valid ? (
            <Alert color="red" title={t('instr.draftValidation')}>
              {selected.validation.initialization.error ? (
                <Text size="sm">
                  {t('instr.initialization')}: {selected.validation.initialization.error}
                </Text>
              ) : null}
              {selected.validation.cli.error ? <Text size="sm">CLI: {selected.validation.cli.error}</Text> : null}
            </Alert>
          ) : null}

          <Group justify="space-between" className="instruction-editor-actions">
            <Button
              aria-label={t('instr.delete')}
              color="red"
              leftSection={<Trash2 size={15} />}
              variant="light"
              disabled={!model.selectedIdentity || selected?.protected || model.busy}
              onClick={() => void model.deleteSelected()}
            >
              {t('instr.delete')}
            </Button>
            <Button
              leftSection={<Save size={15} />}
              disabled={!model.draft.identity.trim() || !model.dirty || selected?.protected || model.busy}
              loading={model.busy}
              onClick={() => void model.saveDraft()}
            >
              {t('instr.saveDraft')}
            </Button>
          </Group>
        </main>

        <aside className="instruction-preview-pane" aria-label={t('instr.previewAria')}>
          <Group justify="space-between" className="instruction-pane-heading">
            <div>
              <Text fw={800}>{t('instr.effectivePreview')}</Text>
              <Text size="xs" c="dimmed">
                {t('instr.surfaceLabel', { surface: surfaceLabel(model.surface) })}
              </Text>
            </div>
            {model.previewStale ? <Badge color="yellow">{t('instr.previewStale')}</Badge> : null}
          </Group>

          <SegmentedControl
            fullWidth
            aria-label={t('instr.previewTarget')}
            value={model.selection.mode}
            onChange={(value) => model.changeSelection(defaultSelection(value))}
            data={[
              { value: 'all', label: t('instr.selAll') },
              { value: 'preset', label: t('instr.selPreset') },
              { value: 'tags', label: t('instr.selTags') },
              { value: 'tag-filter', label: t('instr.selFilter') },
            ]}
          />
          <SelectionInput selection={model.selection} onChange={model.changeSelection} />
          <RequestContextForm value={model.requestContext} onChange={model.changeRequestContext} />
          <Button
            leftSection={<Play size={15} />}
            disabled={!model.selectedIdentity || model.dirty || model.busy}
            loading={model.busy}
            onClick={() => void model.previewDraft()}
          >
            {t('instr.previewSurface', { surface: model.surface })}
          </Button>

          <div className="instruction-preview-output" aria-live="polite">
            {model.preview ? (
              <>
                <Group justify="space-between">
                  <Badge color={model.preview.validation ? 'yellow' : 'teal'} variant="light">
                    {model.preview.validation ? t('instr.previewFailed') : t('instr.rendered')}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {t('instr.oneShot')}
                  </Text>
                </Group>
                <Code block>{model.preview.rendered ?? model.preview.validation?.message ?? '(suppressed)'}</Code>
                {model.preview.unresolvedTemplates.length > 0 ? (
                  <Alert color="yellow" title={t('instr.contextRequired')} role="status">
                    {t('instr.unresolvedServers')} {model.preview.unresolvedTemplates.join(', ')}
                  </Alert>
                ) : null}
                <Stack gap={4} aria-label={t('instr.effectiveServers')}>
                  <Group justify="space-between">
                    <Text size="xs" fw={800}>
                      {t('instr.effectiveServers')}
                    </Text>
                    <Badge variant="outline">{model.preview.effectiveServers.length}</Badge>
                  </Group>
                  {model.preview.effectiveServers.map((server) => (
                    <Group key={`${server.target.source}:${server.target.name}`} justify="space-between" wrap="nowrap">
                      <Text size="xs">
                        <Text component="span" c="dimmed" inherit>
                          {server.target.source} /
                        </Text>{' '}
                        {server.target.name}
                      </Text>
                      <Badge color={server.hasInstructions ? 'teal' : 'gray'} variant="light">
                        {server.hasInstructions ? t('instr.hasInstructions') : t('instr.noInstructions')}
                      </Badge>
                    </Group>
                  ))}
                  {model.preview.effectiveServers.length === 0 ? (
                    <Text size="xs" c="dimmed">
                      {t('instr.noEffectiveServers')}
                    </Text>
                  ) : null}
                </Stack>
              </>
            ) : (
              <Stack align="center" gap={4} className="instruction-preview-empty">
                <CheckCircle2 size={20} />
                <Text size="sm" fw={700}>
                  {t('instr.saveThenPreview')}
                </Text>
                <Text size="xs" c="dimmed" ta="center">
                  {t('instr.previewExpires')}
                </Text>
              </Stack>
            )}
          </div>
          <Button
            variant="default"
            disabled={!model.selectedIdentity || model.dirty || model.busy}
            onClick={() => void model.validateDraft()}
          >
            {t('instr.validateBoth')}
          </Button>
          <Button
            leftSection={<ShieldCheck size={15} />}
            disabled={!activationReady || model.busy}
            onClick={() => void model.activate()}
          >
            {t('instr.activate')}
          </Button>
        </aside>
      </div>
    </section>
  );
}

function RequestContextForm({ value, onChange }: { value: string; onChange(value: string): void }) {
  const { t } = useI18n();
  const context = parseContextFormValue(value);
  const enabled = value.trim().length > 0;
  const update = (next: Partial<typeof context>) => onChange(JSON.stringify({ ...context, ...next }));

  return (
    <Stack gap="xs">
      <Checkbox
        label={t('instr.useExplicitContext')}
        checked={enabled}
        onChange={(event) =>
          onChange(event.currentTarget.checked ? JSON.stringify({ project: {}, user: {}, environment: {} }) : '')
        }
      />
      {enabled ? (
        <>
          <TextInput
            label={t('instr.projectName')}
            value={context.project.name ?? ''}
            onChange={(event) => update({ project: { name: event.currentTarget.value } })}
          />
          <TextInput
            label={t('instr.userName')}
            value={context.user.name ?? ''}
            onChange={(event) => update({ user: { name: event.currentTarget.value } })}
          />
          <TextInput
            label={t('instr.envPrefixes')}
            description={t('common.commaSeparated')}
            value={(context.environment.prefixes ?? []).join(', ')}
            onChange={(event) =>
              update({
                environment: {
                  prefixes: event.currentTarget.value
                    .split(',')
                    .map((prefix) => prefix.trim())
                    .filter(Boolean),
                },
              })
            }
          />
        </>
      ) : null}
    </Stack>
  );
}

function parseContextFormValue(value: string): {
  project: { name?: string };
  user: { name?: string };
  environment: { prefixes?: string[] };
} {
  if (!value.trim()) return { project: {}, user: {}, environment: {} };
  try {
    const parsed = JSON.parse(value) as {
      project?: { name?: string };
      user?: { name?: string };
      environment?: { prefixes?: string[] };
    };
    return {
      project: parsed.project ?? {},
      user: parsed.user ?? {},
      environment: parsed.environment ?? {},
    };
  } catch {
    return { project: {}, user: {}, environment: {} };
  }
}

function SelectionInput({
  selection,
  onChange,
}: {
  selection: InstructionTemplateSelection;
  onChange(selection: InstructionTemplateSelection): void;
}) {
  const { t } = useI18n();
  if (selection.mode === 'all') return null;
  if (selection.mode === 'preset') {
    return (
      <TextInput
        label={t('instr.selPreset')}
        value={selection.preset}
        onChange={(event) => onChange({ mode: 'preset', preset: event.currentTarget.value })}
      />
    );
  }
  if (selection.mode === 'tags') {
    return (
      <TextInput
        label={t('instr.selTags')}
        description={t('common.commaSeparated')}
        value={selection.tags.join(', ')}
        onChange={(event) =>
          onChange({
            mode: 'tags',
            tags: event.currentTarget.value
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
          })
        }
      />
    );
  }
  return (
    <TextInput
      label={t('instr.tagFilter')}
      value={selection.expression}
      onChange={(event) => onChange({ mode: 'tag-filter', expression: event.currentTarget.value })}
    />
  );
}

function defaultSelection(mode: string): InstructionTemplateSelection {
  if (mode === 'preset') return { mode, preset: '' };
  if (mode === 'tags') return { mode, tags: [] };
  if (mode === 'tag-filter') return { mode, expression: '' };
  return { mode: 'all' };
}

function surfaceLabel(surface: InstructionTemplateSurface): string {
  return surface === 'cli' ? 'CLI' : 'Initialization';
}
