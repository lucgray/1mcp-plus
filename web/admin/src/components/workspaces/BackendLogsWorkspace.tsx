import { Badge, Button, Group, Stack, Text, Title, UnstyledButton } from '@mantine/core';

import { Plus } from 'lucide-react';
import type { MouseEvent } from 'react';

import type { BackendLogEntry, BackendLogSource } from '../../api/adminApi';
import { useI18n } from '../../i18n';
import type { BackendLogsModel } from '../../session/useBackendLogs';

export function BackendLogsWorkspace({
  logs,
  configureServer,
}: {
  logs: BackendLogsModel;
  configureServer(): void | Promise<void>;
}) {
  const { t } = useI18n();
  const selected = logs.sources.find((source) => source.id === logs.selectedSourceId) ?? null;
  const hasSources = logs.sources.length > 0;
  return (
    <section aria-label={t('logs.title')} className="operations-workspace backend-logs-workspace">
      <header className="workspace-heading backend-logs-heading">
        <Group justify="space-between" align="flex-end">
          <div>
            <Text className="eyebrow" size="xs">
              {t('logs.eyebrow')}
            </Text>
            <Title order={2}>{t('logs.title')}</Title>
          </div>
          <Badge color={connectionColor(logs.connection)} variant="light">
            {connectionLabel(logs.connection, hasSources, t)}
          </Badge>
        </Group>
      </header>
      {logs.sources.length === 0 ? (
        <div className="backend-log-empty" role="status">
          {logs.connection === 'loading' ? (
            t('logs.loadingSources')
          ) : (
            <Stack gap="sm" align="center" className="actionable-empty-state">
              <div>
                <Text fw={800}>{t('logs.emptyTitle')}</Text>
                <Text c="dimmed" size="sm">
                  {t('logs.emptyBody')}
                </Text>
              </div>
              <Button
                component="a"
                href="/admin/servers/new"
                leftSection={<Plus size={16} />}
                onClick={(event: MouseEvent<HTMLAnchorElement>) => {
                  if (!isSamePageNavigation(event)) return;
                  event.preventDefault();
                  void configureServer();
                }}
              >
                {t('logs.configureStdio')}
              </Button>
            </Stack>
          )}
        </div>
      ) : (
        <div className="backend-log-layout">
          <nav aria-label={t('logs.sourcesNav')} className="backend-log-sources">
            {logs.sources.map((source) => (
              <SourceButton
                key={source.id}
                source={source}
                active={source.id === logs.selectedSourceId}
                unread={logs.unread[source.id] ?? 0}
                onSelect={() => void logs.select(source.id)}
              />
            ))}
          </nav>
          <div className="backend-log-inspector">
            {selected ? <SelectedSource source={selected} logs={logs} /> : null}
          </div>
        </div>
      )}
    </section>
  );
}

function isSamePageNavigation(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function SourceButton({
  source,
  active,
  unread,
  onSelect,
}: {
  source: BackendLogSource;
  active: boolean;
  unread: number;
  onSelect(): void;
}) {
  const { t } = useI18n();
  return (
    <UnstyledButton
      aria-label={`${source.displayName}, ${sourceStatus(source, t)}`}
      aria-current={active ? 'page' : undefined}
      className={`backend-log-source${active ? ' backend-log-source-active' : ''}`}
      onClick={onSelect}
    >
      <span className="backend-log-source-copy">
        <Text component="span" fw={800} size="sm">
          {source.displayName}
        </Text>
        <Text component="span" c="dimmed" size="xs">
          {sourceStatus(source, t)}
        </Text>
      </span>
      {unread > 0 ? (
        <Badge size="xs" color="orange">
          {unread > 99 ? '99+' : unread}
        </Badge>
      ) : null}
    </UnstyledButton>
  );
}

function sourceStatus(source: BackendLogSource, t: (key: string) => string): string {
  if (source.capture === 'not-captured') return t('logs.statusNotCaptured');
  return source.lifecycle === 'ended' ? t('logs.statusEnded') : t('logs.statusManagedStderr');
}

function SelectedSource({ source, logs }: { source: BackendLogSource; logs: BackendLogsModel }) {
  const { t } = useI18n();
  const entries = logs.entries;
  return (
    <>
      <Group className="backend-log-source-header" justify="space-between" wrap="nowrap">
        <div className="truncate">
          <Text fw={900}>{source.displayName}</Text>
          <Text className="backend-log-canonical truncate" size="xs">
            {source.canonicalName}
          </Text>
        </div>
        <Badge color={source.capture === 'not-captured' ? 'red' : source.lifecycle === 'ended' ? 'orange' : 'teal'}>
          {source.capture === 'not-captured'
            ? t('logs.badgeUnavailable')
            : source.lifecycle === 'ended'
              ? t('logs.statusEnded')
              : t('logs.badgeLive')}
        </Badge>
      </Group>
      {source.capture === 'not-captured' ? (
        <div className="backend-log-empty" role="status">
          {t('logs.notCapturedHint')}
        </div>
      ) : logs.selectionLoading ? (
        <div className="backend-log-empty" role="status">
          {t('logs.loadingHistory')}
        </div>
      ) : logs.selectionError ? (
        <div className="backend-log-empty" role="alert">
          {logs.selectionError}
        </div>
      ) : entries.length === 0 ? (
        <div className="backend-log-empty" role="status">
          {source.lifecycle === 'ended' ? t('logs.endedEmpty') : t('logs.noStderr')}
        </div>
      ) : (
        <div
          aria-label={t('logs.retainedEntries', { name: source.displayName })}
          className="backend-log-well"
          role="log"
        >
          {entries.map((entry) => (
            <LogRow key={entry.sequence} entry={entry} />
          ))}
        </div>
      )}
    </>
  );
}

function LogRow({ entry }: { entry: BackendLogEntry }) {
  return (
    <div className={`backend-log-row backend-log-row-${entry.kind}`}>
      <span className="backend-log-rail">
        <span>#{entry.sequence}</span>
        <time dateTime={entry.timestamp}>{formatTime(entry.timestamp)}</time>
      </span>
      <span className="backend-log-content">{entry.content}</span>
    </div>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return Number.isNaN(date.valueOf()) ? timestamp : date.toLocaleTimeString([], { hour12: false });
}

function connectionLabel(
  connection: BackendLogsModel['connection'],
  hasSources: boolean,
  t: (key: string) => string,
): string {
  if (connection === 'reconnecting') return t('logs.reconnecting');
  if (connection === 'active') return hasSources ? t('logs.liveStream') : t('logs.waitingSources');
  if (connection === 'loading') return t('logs.connecting');
  return t('logs.inactive');
}

function connectionColor(connection: BackendLogsModel['connection']): string {
  if (connection === 'active') return 'teal';
  if (connection === 'reconnecting') return 'orange';
  return 'gray';
}
