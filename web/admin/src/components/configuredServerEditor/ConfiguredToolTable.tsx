import {
  ActionIcon,
  Badge,
  Button,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
  TextInput,
  Tooltip,
} from '@mantine/core';

import { RefreshCw, RotateCcw, Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import type { ConfiguredToolInventory } from '../../api/adminApi';
import { type I18n, useI18n } from '../../i18n';

type ToolDraft = Record<string, { enabled: boolean; descriptionOverride: string }>;
type ToolFilter = 'all' | 'enabled' | 'disabled' | 'unresolved';

export function ConfiguredToolTable({
  inventory,
  draft,
  disabled,
  refreshBusy,
  refreshError,
  onToolChange,
  onBulkChange,
  onModelChange,
  onRefresh,
}: {
  inventory: ConfiguredToolInventory;
  draft: ToolDraft;
  disabled: boolean;
  refreshBusy: boolean;
  refreshError?: string;
  onToolChange(name: string, change: { enabled?: boolean; descriptionOverride?: string }): void;
  onBulkChange(names: string[], enabled: boolean): void;
  onModelChange(model: string): void | Promise<void>;
  onRefresh(): void | Promise<void>;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ToolFilter>('all');
  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return inventory.rows.filter((row) => {
      const rowDraft = draft[row.name] ?? { enabled: row.enabled, descriptionOverride: row.descriptionOverride ?? '' };
      const matchesQuery =
        !normalizedQuery ||
        row.name.toLowerCase().includes(normalizedQuery) ||
        row.effectiveDescription?.toLowerCase().includes(normalizedQuery) ||
        row.upstreamDescription?.toLowerCase().includes(normalizedQuery);
      const matchesFilter =
        filter === 'all' ||
        (filter === 'enabled' && rowDraft.enabled) ||
        (filter === 'disabled' && !rowDraft.enabled) ||
        (filter === 'unresolved' && row.unresolved);
      return matchesQuery && matchesFilter;
    });
  }, [draft, filter, inventory.rows, query]);
  const visibleNames = visibleRows.map((row) => row.name);
  const modelOptions = useMemo(
    () => Array.from(new Set(['gpt-4o', 'gpt-4o-mini', 'gpt-3.5-turbo', inventory.model].filter(Boolean))),
    [inventory.model],
  );
  const draftSummary = useMemo(() => {
    let disabledCount = 0;
    let enabledTokens = 0;
    for (const row of inventory.rows) {
      const enabled = draft[row.name]?.enabled ?? row.enabled;
      if (enabled) enabledTokens += row.approximateTokens;
      else disabledCount += 1;
    }
    return { disabled: disabledCount, enabledTokens };
  }, [draft, inventory.rows]);
  const inspectionMessage = configuredToolInspectionMessage(inventory, refreshError, t);
  const inspectionFacts = configuredToolInspectionFacts(inventory);
  const retryable = Boolean(refreshError) || inventory.inspection?.retryable === true;

  return (
    <Stack className="configured-tool-table" gap="sm">
      <Group justify="space-between" align="flex-end">
        <div>
          <Text fw={800}>{t('tools.title')}</Text>
          <Text c="dimmed" size="xs">
            {t('tools.counts', {
              observed: inventory.counts.observed,
              disabled: draftSummary.disabled,
              unresolved: inventory.counts.unresolved,
            })}
          </Text>
          {inspectionMessage ? (
            <div
              role={refreshError || inventory.inspection?.status === 'failed' ? 'alert' : 'status'}
              aria-live={refreshError || inventory.inspection?.status === 'failed' ? undefined : 'polite'}
            >
              <Text c={refreshError || inventory.inspection?.status === 'failed' ? 'red' : 'yellow'} size="xs">
                {inspectionMessage}
              </Text>
              {inspectionFacts.length > 0 ? (
                <Stack component="ul" gap={2} m={0} pl="md">
                  {inspectionFacts.map((fact) => (
                    <Text
                      component="li"
                      c="red"
                      size="xs"
                      key={`${fact.instanceId}:${fact.error}`}
                      style={{ overflowWrap: 'anywhere' }}
                    >
                      {fact.instanceId}: {fact.error}
                    </Text>
                  ))}
                </Stack>
              ) : null}
            </div>
          ) : null}
        </div>
        <Group align="flex-end" gap="xs">
          <Button
            variant="default"
            leftSection={<RefreshCw size={15} />}
            loading={refreshBusy}
            disabled={disabled || refreshBusy}
            onClick={() => void onRefresh()}
          >
            {retryable ? t('common.retry') : t('common.refresh')}
          </Button>
          <Select
            label={t('tools.estimateModel')}
            aria-label={t('tools.estimateModelAria')}
            value={inventory.model}
            data={modelOptions}
            allowDeselect={false}
            disabled={disabled || refreshBusy}
            onChange={(value) => {
              if (value) void onModelChange(value);
            }}
          />
        </Group>
      </Group>
      <Group align="flex-end" grow>
        <TextInput
          label={t('tools.searchTools')}
          leftSection={<Search size={15} />}
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
        />
        <SegmentedControl
          aria-label={t('tools.statusFilterAria')}
          value={filter}
          onChange={(value) => setFilter(value as ToolFilter)}
          data={[
            { label: t('servers.all'), value: 'all' },
            { label: t('servers.enabled'), value: 'enabled' },
            { label: t('servers.disabled'), value: 'disabled' },
            { label: t('tools.unresolved'), value: 'unresolved' },
          ]}
        />
      </Group>
      <Group justify="space-between">
        <Text c="dimmed" size="xs">
          {t('tools.visibleSummary', { count: visibleRows.length, tokens: draftSummary.enabledTokens })}
        </Text>
        <Group gap="xs">
          <Button
            size="compact-xs"
            variant="default"
            disabled={disabled || visibleNames.length === 0}
            onClick={() => onBulkChange(visibleNames, true)}
          >
            {t('tools.enableVisible', { count: visibleNames.length })}
          </Button>
          <Button
            size="compact-xs"
            variant="default"
            disabled={disabled || visibleNames.length === 0}
            onClick={() => onBulkChange(visibleNames, false)}
          >
            {t('tools.disableVisible', { count: visibleNames.length })}
          </Button>
        </Group>
      </Group>
      <div className="configured-tool-rows">
        {visibleRows.map((row) => {
          const rowDraft = draft[row.name] ?? {
            enabled: row.enabled,
            descriptionOverride: row.descriptionOverride ?? '',
          };
          return (
            <div className="configured-tool-row" key={row.name}>
              <Group justify="space-between" align="flex-start" wrap="nowrap">
                <div className="configured-tool-identity">
                  <Group gap="xs">
                    <Text fw={700}>{row.name}</Text>
                    {row.stale ? <Badge color="orange">{t('tools.lastObserved')}</Badge> : null}
                    {row.unresolved ? <Badge color="yellow">{t('tools.unresolvedBadge')}</Badge> : null}
                    {row.observedInSomeInstances ? (
                      <Badge variant="outline">
                        {t('tools.instances', { observed: row.observedInstanceCount, active: row.activeInstanceCount })}
                      </Badge>
                    ) : null}
                    <Badge variant="outline">~{t('tools.tokens', { count: row.approximateTokens })}</Badge>
                  </Group>
                  <Text c="dimmed" size="xs">
                    {row.effectiveDescription ?? t('tools.noDescription')}
                  </Text>
                  {row.descriptionOverridden && row.upstreamDescription ? (
                    <Text c="dimmed" size="xs">
                      {t('tools.upstream')} {row.upstreamDescription}
                    </Text>
                  ) : null}
                </div>
                <Switch
                  aria-label={t('tools.enableTool', { name: row.name })}
                  checked={rowDraft.enabled}
                  disabled={disabled}
                  onChange={(event) => onToolChange(row.name, { enabled: event.currentTarget.checked })}
                />
              </Group>
              <Group mt="xs" align="flex-end" wrap="nowrap">
                <TextInput
                  className="configured-tool-description-input"
                  label={t('tools.descriptionOverride')}
                  placeholder={row.upstreamDescription ?? t('tools.addDescription')}
                  value={rowDraft.descriptionOverride}
                  disabled={disabled}
                  onChange={(event) => onToolChange(row.name, { descriptionOverride: event.currentTarget.value })}
                />
                <Tooltip label={t('tools.resetUpstream')}>
                  <ActionIcon
                    aria-label={t('tools.resetDescription', { name: row.name })}
                    variant="default"
                    disabled={disabled || !rowDraft.descriptionOverride}
                    onClick={() => onToolChange(row.name, { descriptionOverride: '' })}
                  >
                    <RotateCcw size={16} />
                  </ActionIcon>
                </Tooltip>
              </Group>
            </div>
          );
        })}
      </div>
      {inventory.targetEnabled ? null : (
        <Text c="yellow" size="xs">
          {t('tools.targetDisabled')}
        </Text>
      )}
      <Text c="dimmed" size="xs">
        {t('tools.denylistHint')}
      </Text>
    </Stack>
  );
}

function configuredToolInspectionFacts(
  inventory: ConfiguredToolInventory,
): Array<{ instanceId: string; error: string }> {
  return (inventory.inspection?.instances ?? [])
    .flatMap((fact) => {
      const error = fact.error?.trim();
      if (fact.status === 'complete' || !error) return [];
      return [{ instanceId: fact.instanceId, error: error.length > 240 ? `${error.slice(0, 237)}...` : error }];
    })
    .slice(0, 5);
}

function configuredToolInspectionMessage(
  inventory: ConfiguredToolInventory,
  refreshError: string | undefined,
  t: I18n['t'],
): string | undefined {
  if (refreshError) return refreshError;
  const inspection = inventory.inspection;
  if (inspection?.status === 'in_progress') return t('tools.refreshing');
  if (inspection?.status === 'complete' && inventory.freshness === 'live') return undefined;
  switch (inspection?.reason) {
    case 'target_disabled':
      return t('tools.reasonTargetDisabled');
    case 'target_disconnected':
      return t('tools.reasonDisconnected');
    case 'no_active_instances':
      return t('tools.reasonNoInstances');
    case 'active_instance_unavailable':
      return t('tools.reasonInstanceUnavailable');
    case 'inspection_failed':
      return t('tools.reasonInspectionFailed');
    case 'snapshot_unavailable':
      return t('tools.reasonNoSnapshot');
    case 'active_instances_changed':
      return t('tools.reasonInstancesChanged');
    default:
      return inventory.freshness === 'unavailable' ? t('tools.reasonUnavailable') : undefined;
  }
}
