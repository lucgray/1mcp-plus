import {
  Alert,
  Badge,
  Button,
  Group,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  TextInput,
  Title,
} from '@mantine/core';

import { ChevronDown, Save, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  buildTagAuthoringQuery,
  evaluateTagAuthoringQuery,
  parseTagAuthoringQuery,
  type TagAuthoringState,
} from '../../../../../src/domains/preset/tagAuthoring';
import type { AdminPresetDraft, AdminPresetListItem, AdminPresetPreview, AdminPresetTarget } from '../../api/adminApi';
import { useI18n } from '../../i18n';
import type { PresetAuthoringModel } from '../../session/AdminConsoleSessionModel';

export function PresetAuthoringWorkspace({
  model,
  runtimeScopeId,
}: {
  model: PresetAuthoringModel;
  runtimeScopeId?: string;
}) {
  const { t } = useI18n();
  const {
    items: presets,
    targets: presetTargets,
    busy,
    load,
    preview: previewPreset,
    save: savePreset,
    delete: deletePreset,
  } = model;
  const [sourceName, setSourceName] = useState<string | undefined>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [strategy, setStrategy] = useState<'or' | 'and' | 'advanced'>('or');
  const [tagStates, setTagStates] = useState<Record<string, TagAuthoringState>>({});
  const [advanced, setAdvanced] = useState('{}');
  const [preview, setPreview] = useState<AdminPresetPreview | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [structuredConversion, setStructuredConversion] = useState<AdminPresetPreview['structuredConversion']>({
    lossless: true,
  });
  const nameError = presetNameError(name);
  const advancedJsonValid = strategy !== 'advanced' || isObjectJson(advanced);
  const previewDisabled = Boolean(nameError) || !advancedJsonValid || busy;

  function editPreset(preset: AdminPresetListItem, duplicate = false) {
    setSourceName(duplicate ? preset.name : preset.name);
    setName(duplicate ? `${preset.name}-copy` : preset.name);
    setDescription(preset.description ?? '');
    const parsedQuery = parseTagAuthoringQuery(preset.tagQuery);
    setStrategy(parsedQuery ? parsedQuery.strategy : 'advanced');
    setAdvanced(JSON.stringify(preset.tagQuery, null, 2));
    const conversion = parsedQuery ? { tags: Object.keys(parsedQuery.states) } : null;
    setTagStates(parsedQuery?.states ?? {});
    setStructuredConversion(
      conversion
        ? {
            lossless: true,
            strategy: parsedQuery?.strategy,
            tags: conversion.tags,
            states: parsedQuery?.states,
          }
        : { lossless: false, reason: 'This advanced query cannot be represented losslessly in structured mode.' },
    );
    setPreview(null);
  }

  function draft(): AdminPresetDraft {
    let tagQuery: Record<string, unknown>;
    if (strategy === 'advanced') {
      const parsed: unknown = JSON.parse(advanced);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Advanced JSON must be an object.');
      }
      tagQuery = parsed as Record<string, unknown>;
    } else {
      tagQuery = buildTagAuthoringQuery(tagStates, strategy);
    }
    return {
      name,
      description: description || undefined,
      strategy,
      tagQuery,
    };
  }

  async function createPreview() {
    try {
      const next = await previewPreset(draft(), sourceName);
      setPreview(next);
      setStructuredConversion(next.structuredConversion);
      setMessage(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('presets.previewFailed'));
    }
  }

  async function save() {
    if (!preview) return;
    const action = sourceName ? (sourceName === preview.draft.name ? 'update' : 'duplicate') : 'create';
    const saved = await savePreset({ action, sourceName, preview });
    if (!saved) return;
    setPreview(null);
    setMessage(t('presets.saved', { name: preview.draft.name }));
  }

  return (
    <section aria-labelledby="presets-title" className="operations-workspace">
      <Group justify="space-between" align="flex-start" className="workspace-heading">
        <div>
          <Text className="eyebrow" size="xs">
            {t('common.runtimeScope')} / {runtimeScopeId ?? t('common.unavailable')}
          </Text>
          <Title id="presets-title" order={2}>
            {t('presets.title')}
          </Title>
          <Text c="dimmed" size="sm">
            {t('presets.description')}
          </Text>
        </div>
        <Group>
          <Button variant="default" onClick={() => void load()} loading={busy}>
            {t('common.refresh')}
          </Button>
          {presets.length > 0 ? (
            <Button
              onClick={() => {
                setSourceName(undefined);
                setName('');
                setDescription('');
                setStrategy('or');
                setTagStates({});
                setAdvanced('{}');
                setPreview(null);
              }}
            >
              {t('presets.new')}
            </Button>
          ) : null}
        </Group>
      </Group>
      <div
        className={`workspace-grid preset-workspace-grid${presets.length === 0 ? ' preset-workspace-grid-empty' : ''}`}
      >
        {presets.length > 0 ? (
          <Paper withBorder p="md">
            <Stack gap="sm">
              {presets.map((preset) => (
                <Paper key={preset.name} withBorder p="sm">
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Text fw={800}>{preset.name}</Text>
                      <Text size="sm" c="dimmed">
                        {preset.description || t('presets.noDescription')}
                      </Text>
                      <Text size="xs">
                        {preset.strategy.toUpperCase()} · {preset.querySummary || t('presets.emptyQuery')} ·{' '}
                        {t('presets.matchCount', { count: preset.matchCount })}
                      </Text>
                    </div>
                    <Group gap="xs">
                      <Button size="xs" variant="default" onClick={() => editPreset(preset)}>
                        Edit
                      </Button>
                      <Button size="xs" variant="default" onClick={() => editPreset(preset, true)}>
                        Duplicate
                      </Button>
                      <Button
                        size="xs"
                        color="red"
                        variant="light"
                        leftSection={<Trash2 size={14} />}
                        onClick={() => void deletePreset(preset.name)}
                      >
                        {t('presets.delete')}
                      </Button>
                    </Group>
                  </Group>
                </Paper>
              ))}
            </Stack>
          </Paper>
        ) : null}
        <Paper withBorder p="md">
          <Stack gap="sm">
            <Title order={3}>{sourceName ? t('presets.editName', { name: sourceName }) : t('presets.create')}</Title>
            <TextInput
              label={t('presets.name')}
              value={name}
              disabled={Boolean(sourceName && sourceName === name)}
              onChange={(event) => {
                setName(event.currentTarget.value);
                setPreview(null);
              }}
              error={nameError ? t(`presets.${nameError}`) : undefined}
              description={t('presets.nameHint')}
            />
            <TextInput
              label={t('presets.descriptionLabel')}
              value={description}
              onChange={(event) => {
                setDescription(event.currentTarget.value);
                setPreview(null);
              }}
            />
            <Group>
              <Button
                variant={strategy === 'or' ? 'filled' : 'default'}
                aria-pressed={strategy === 'or'}
                disabled={strategy === 'advanced' && !structuredConversion.lossless}
                title={
                  strategy === 'advanced' && !structuredConversion.lossless ? structuredConversion.reason : undefined
                }
                onClick={() => {
                  setStrategy('or');
                  if (structuredConversion.states) setTagStates(structuredConversion.states);
                  else if (structuredConversion.tags) setTagStates(includedTagStates(structuredConversion.tags));
                  setPreview(null);
                }}
              >
                {t('presets.matchAny')}
              </Button>
              <Button
                variant={strategy === 'and' ? 'filled' : 'default'}
                aria-pressed={strategy === 'and'}
                disabled={strategy === 'advanced' && !structuredConversion.lossless}
                title={
                  strategy === 'advanced' && !structuredConversion.lossless ? structuredConversion.reason : undefined
                }
                onClick={() => {
                  setStrategy('and');
                  if (structuredConversion.states) setTagStates(structuredConversion.states);
                  else if (structuredConversion.tags) setTagStates(includedTagStates(structuredConversion.tags));
                  setPreview(null);
                }}
              >
                {t('presets.matchAll')}
              </Button>
              <Button
                variant={strategy === 'advanced' ? 'filled' : 'default'}
                aria-pressed={strategy === 'advanced'}
                onClick={() => {
                  setAdvanced(
                    JSON.stringify(buildTagAuthoringQuery(tagStates, strategy === 'and' ? 'and' : 'or'), null, 2),
                  );
                  setStrategy('advanced');
                  setPreview(null);
                }}
              >
                {t('presets.advancedJson')}
              </Button>
            </Group>
            {strategy === 'advanced' ? (
              <Textarea
                label={t('presets.advancedJson')}
                minRows={8}
                error={!advancedJsonValid ? t('presets.advancedInvalid') : undefined}
                value={advanced}
                onChange={(event) => {
                  const value = event.currentTarget.value;
                  setAdvanced(value);
                  try {
                    const parsed: unknown = JSON.parse(value);
                    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                      const structured = parseTagAuthoringQuery(parsed as Record<string, unknown>);
                      setStructuredConversion(
                        structured
                          ? {
                              lossless: true,
                              strategy: structured.strategy,
                              tags: Object.keys(structured.states),
                              states: structured.states,
                            }
                          : { lossless: false, reason: 'This advanced query cannot be represented losslessly.' },
                      );
                    } else {
                      setStructuredConversion({ lossless: false, reason: 'Advanced JSON must be an object.' });
                    }
                  } catch {
                    setStructuredConversion({
                      lossless: false,
                      reason: 'Advanced JSON must be valid before conversion.',
                    });
                  }
                  setPreview(null);
                }}
              />
            ) : (
              <TagMatrix
                targets={presetTargets}
                strategy={strategy}
                states={tagStates}
                onChange={(nextStates) => {
                  setTagStates(nextStates);
                  setPreview(null);
                }}
              />
            )}
            {presets.length === 0 ? (
              <Alert color="blue" variant="light">
                {t('presets.firstPresetHint')}
              </Alert>
            ) : null}
            <Button
              leftSection={<SlidersHorizontal size={16} />}
              disabled={previewDisabled}
              onClick={() => void createPreview()}
            >
              {t('presets.previewMatches')}
            </Button>
            {preview ? (
              <Paper withBorder p="sm">
                <Text fw={800}>{t('presets.currentMatches', { count: preview.matchCount })}</Text>
                {preview.validation.globalErrors.map((error) => (
                  <Text key={error} c="red">
                    {error}
                  </Text>
                ))}
                {preview.validation.fieldErrors.map((error) => (
                  <Text key={`${error.field}-${error.message}`} c="red">
                    {error.field}: {error.message}
                  </Text>
                ))}
                {preview.validation.warnings.map((warning) => (
                  <Text key={warning} c="yellow">
                    {localizedPresetMessage(warning, t)}
                  </Text>
                ))}
                {preview.matches.map((match) => (
                  <Text key={match.name} size="sm">
                    {match.matched ? '✓' : '–'} {match.name} ·{' '}
                    {match.enabled ? t('common.enabled') : t('common.disabled')} · {match.reason}
                  </Text>
                ))}
                <Button
                  mt="sm"
                  disabled={preview.validation.status === 'invalid'}
                  leftSection={<Save size={16} />}
                  onClick={() => void save()}
                >
                  {t('presets.confirmSave')}
                </Button>
              </Paper>
            ) : null}
            {message ? <Alert>{localizedPresetMessage(message, t)}</Alert> : null}
          </Stack>
        </Paper>
      </div>
    </section>
  );
}

function presetNameError(name: string): string | null {
  if (!name.trim()) return 'presetNameRequired';
  if (name.length > 50) return 'presetNameTooLong';
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) return 'presetNameInvalid';
  return null;
}

function isObjectJson(value: string): boolean {
  try {
    const parsed: unknown = JSON.parse(value);
    return Boolean(parsed && typeof parsed === 'object' && !Array.isArray(parsed));
  } catch {
    return false;
  }
}

function localizedPresetMessage(
  message: string,
  t: (key: string, params?: Record<string, string | number>) => string,
): string {
  if (/name: Preset name is required/i.test(message)) return t('presets.nameRequired');
  if (/Tag query produces no meaningful filter/i.test(message)) {
    return t('presets.noCriteria');
  }
  return message;
}

function TagMatrix({
  targets,
  strategy,
  states,
  onChange,
}: {
  targets: AdminPresetTarget[];
  strategy: 'or' | 'and';
  states: Record<string, TagAuthoringState>;
  onChange: (states: Record<string, TagAuthoringState>) => void;
}) {
  const { t } = useI18n();
  const catalog = tagCatalog(targets, states);
  const query = buildTagAuthoringQuery(states, strategy);
  const matchingServers = targets.filter((server) => evaluateTagAuthoringQuery(query, server.tags));
  const activeTags = catalog.filter(({ tag }) => (states[tag] ?? 'neutral') !== 'neutral');
  const enabledMatches = matchingServers.filter((server) => server.enabled).length;
  const disabledMatches = matchingServers.length - enabledMatches;
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'include' | 'exclude'>('all');
  const [expandedTags, setExpandedTags] = useState<Record<string, boolean>>({});
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleCatalog = catalog.filter(({ tag, servers }) => {
    const state = states[tag] ?? 'neutral';
    const matchesFilter = filter === 'all' || state === filter;
    const matchesSearch =
      !normalizedSearch ||
      tag.toLocaleLowerCase().includes(normalizedSearch) ||
      servers.some((server) => server.toLocaleLowerCase().includes(normalizedSearch));
    return matchesFilter && matchesSearch;
  });

  function setTagState(tag: string, state: TagAuthoringState) {
    onChange({ ...states, [tag]: state });
  }

  return (
    <section className="preset-tag-builder" aria-labelledby="preset-tag-matrix-title">
      <Group justify="space-between" align="flex-start" gap="md" className="preset-tag-header">
        <div>
          <Title id="preset-tag-matrix-title" order={4}>
            {t('presets.tagMatrix')}
          </Title>
          <Text size="sm" c="dimmed">
            {t('presets.tagMatrixHint')}
          </Text>
        </div>
        <Badge variant="light" color={matchingServers.length > 0 ? 'teal' : 'yellow'}>
          {t('presets.matrixMatch', { matched: matchingServers.length, total: targets.length })}
        </Badge>
      </Group>
      <Group align="flex-end" gap="sm" mt="md" className="preset-tag-toolbar">
        <TextInput
          aria-label={t('presets.searchTagsAria')}
          className="preset-tag-search"
          label={t('presets.searchTags')}
          leftSection={<Search size={16} />}
          placeholder={t('presets.searchPlaceholder')}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
        <SegmentedControl
          aria-label={t('presets.filterTagsAria')}
          data={[
            { label: t('presets.all'), value: 'all' },
            { label: t('presets.included'), value: 'include' },
            { label: t('presets.excluded'), value: 'exclude' },
          ]}
          value={filter}
          onChange={(value) => setFilter(value as typeof filter)}
        />
      </Group>
      <Stack gap="xs" mt="sm" className="preset-tag-list">
        {visibleCatalog.map(({ tag, servers, enabledCount, disabledCount, discovered }) => {
          const state = states[tag] ?? 'neutral';
          const expanded = expandedTags[tag] === true;
          const visibleServers = expanded ? servers : servers.slice(0, 2);
          return (
            <article className={`preset-tag-row preset-tag-${state}`} data-tag={tag} key={tag}>
              <div className="preset-tag-identity">
                <Group gap="xs" wrap="wrap">
                  <Text fw={800}>{tag}</Text>
                  {!discovered ? (
                    <Badge color="gray" size="xs" variant="light">
                      {t('presets.retired')}
                    </Badge>
                  ) : null}
                </Group>
                <Group gap="sm" mt={3} className="preset-tag-counts">
                  <Text size="xs" c="dimmed">
                    {t('presets.serverCount', { count: servers.length })}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('presets.enabledCount', { count: enabledCount })}
                  </Text>
                  <Text size="xs" c="dimmed">
                    {t('presets.disabledCount', { count: disabledCount })}
                  </Text>
                </Group>
              </div>
              <div className="preset-tag-state" role="group" aria-label={t('presets.tagStateAria', { tag })}>
                <SegmentedControl
                  aria-label={t('presets.setTagState', { tag })}
                  fullWidth
                  data={[
                    { label: t('presets.neutral'), value: 'neutral' },
                    { label: t('presets.include'), value: 'include' },
                    { label: t('presets.exclude'), value: 'exclude' },
                  ]}
                  value={state}
                  onChange={(value) => setTagState(tag, value as TagAuthoringState)}
                />
              </div>
              <div className="preset-tag-servers">
                <Text size="xs" c="dimmed" component="span">
                  {visibleServers.length > 0 ? visibleServers.join(', ') : t('presets.noCurrentTargets')}
                </Text>
                {servers.length > 2 ? (
                  <Button
                    aria-expanded={expanded}
                    aria-label={expanded ? t('presets.collapseTagged', { tag }) : t('presets.showTagged', { tag })}
                    className="preset-tag-expand"
                    rightSection={<ChevronDown className={expanded ? 'rotate-180' : undefined} size={13} />}
                    size="compact-xs"
                    variant="subtle"
                    onClick={() => setExpandedTags((current) => ({ ...current, [tag]: !expanded }))}
                  >
                    {expanded ? t('presets.collapse') : `+${servers.length - 2}`}
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
        {visibleCatalog.length === 0 ? (
          <Text c="dimmed" className="preset-tag-empty">
            {catalog.length === 0 ? t('presets.noTagsAvailable') : t('presets.noTagsMatch')}
          </Text>
        ) : null}
      </Stack>
      <div className="preset-query-strip">
        <Group justify="space-between" align="flex-start" gap="md" className="preset-impact-header">
          <div>
            <Text size="xs" fw={800} tt="uppercase">
              {t('presets.liveImpact')}
            </Text>
            <Text size="sm" mt={3}>
              {t('presets.impactSummary', {
                matched: matchingServers.length,
                total: targets.length,
                enabled: enabledMatches,
                disabled: disabledMatches,
              })}
            </Text>
          </div>
          <Group gap={6} className="preset-active-tags">
            {activeTags.length === 0 ? <Text c="dimmed">{t('presets.noCriteriaSelected')}</Text> : null}
            {activeTags.map(({ tag }) => (
              <Badge key={tag} color={states[tag] === 'exclude' ? 'red' : 'teal'} variant="light">
                {states[tag] === 'exclude' ? t('presets.excludeUpper') : t('presets.includeUpper')} {tag}
              </Badge>
            ))}
          </Group>
        </Group>
        <details className="preset-impact-details">
          <summary>{t('presets.viewEvaluation')}</summary>
          <Stack gap={3} mt="xs">
            {targets.map((server) => {
              const matched = matchingServers.some((candidate) => candidate.name === server.name);
              return (
                <Text key={server.name} size="xs" c={matched ? undefined : 'dimmed'}>
                  {matched ? t('presets.match') : t('presets.noMatch')} · {server.name} ·{' '}
                  {server.enabled ? t('common.enabled') : t('common.disabled')} ·{' '}
                  {server.tags.join(', ') || t('presets.untagged')}
                </Text>
              );
            })}
          </Stack>
        </details>
      </div>
    </section>
  );
}

function tagCatalog(targets: AdminPresetTarget[], states: Record<string, TagAuthoringState>) {
  const catalog = new Map<string, { servers: string[]; enabledCount: number; disabledCount: number }>();
  for (const server of targets) {
    for (const tag of server.tags) {
      const current = catalog.get(tag) ?? { servers: [], enabledCount: 0, disabledCount: 0 };
      current.servers.push(server.name);
      if (server.enabled) current.enabledCount += 1;
      else current.disabledCount += 1;
      catalog.set(tag, current);
    }
  }
  for (const tag of Object.keys(states)) {
    if (!catalog.has(tag)) catalog.set(tag, { servers: [], enabledCount: 0, disabledCount: 0 });
  }
  return Array.from(catalog, ([tag, details]) => ({ tag, ...details, discovered: details.servers.length > 0 })).sort(
    (left, right) => left.tag.localeCompare(right.tag),
  );
}

function includedTagStates(tags: string[]): Record<string, TagAuthoringState> {
  return Object.fromEntries(tags.map((tag) => [tag, 'include' as const]));
}
