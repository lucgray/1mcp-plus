import { Alert, Button, Group, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';

import { AlertTriangle, ArrowRight, CircleCheck, KeyRound, Plus, ServerOff } from 'lucide-react';
import { type MouseEvent, type ReactNode, useState } from 'react';

import { ConfiguredServerDeletionNotice } from '../../configuredServerDelete/ConfiguredServerDeletionNotice';
import { useI18n } from '../../i18n';
import type { AdminConsoleRoute, OperatorWorkspaceModel } from '../../session/AdminConsoleSessionModel';
import { DetailRow, Panel } from '../AdminConsoleShared';
import { disabledServers, enabledServers, humanize, isOAuthAttention } from '../adminConsoleUtils';
import { ConfiguredServerCreator } from '../configuredServerCreator';
import { ConfiguredServerEditor } from '../configuredServerEditor';
import { ConfiguredServersPanel } from '../ConfiguredServersPanel';
import { AuditPanel } from '../OperationsStatusPanels';

export function DashboardWorkspace({
  model,
  navigate,
}: {
  model: OperatorWorkspaceModel;
  navigate(route: AdminConsoleRoute): void | Promise<void>;
}) {
  const { t } = useI18n();
  const { state, configuredServers } = model;
  const failedAudits = (state.status?.audit.facts ?? []).filter((fact) => fact.result === 'failed').length;
  const oauthAttention = (state.status?.oauth.services ?? []).filter(isOAuthAttention).length;
  const disabled = disabledServers(state.configuredServers);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const runtime = state.status?.runtime;

  async function configureServer() {
    await configuredServers.create.open();
  }

  async function copyText(label: string, value: string): Promise<void> {
    try {
      await configuredServers.copy(label, value);
      setCopyFeedback(`${humanize(label)} copied.`);
    } catch {
      setCopyFeedback(`Could not copy ${humanize(label)}. Select the value manually.`);
    }
  }

  return (
    <section aria-labelledby="runtime-operations-title" className="operations-workspace">
      <Title id="runtime-operations-title" order={2} className="sr-only">
        Runtime operations
      </Title>
      <WorkspaceHeading
        title={t('dash.title')}
        description={t('dash.description', {
          user: state.session?.account.username ?? 'operator',
          time: state.lastUpdatedAt ?? t('dash.never'),
        })}
      />
      <div className="runtime-status-strip" role="status" aria-label={t('dash.runtimeOnline')}>
        <Group gap="xs" wrap="nowrap" className="runtime-status-main">
          <span className="runtime-live-dot" />
          <Text fw={800} size="sm">
            {t('dash.runtimeOnline')}
          </Text>
          <Text c="dimmed" size="sm" className="truncate">
            {runtime?.externalUrl ?? t('dash.localRuntime')}
          </Text>
        </Group>
        <Group gap="lg" wrap="nowrap" className="runtime-status-facts">
          <Text size="xs" c="dimmed">
            {t('dash.version')} <strong>{runtime?.runtimeVersion ?? t('dash.unavailable')}</strong>
          </Text>
          <Text size="xs" c="dimmed">
            {t('dash.updated')} <strong>{state.lastUpdatedAt ?? t('dash.never')}</strong>
          </Text>
        </Group>
      </div>
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="sm" className="summary-grid">
        <SummaryLink
          label={t('dash.enabledServers')}
          value={enabledServers(state.configuredServers)}
          tone="good"
          href="/admin/servers"
          onNavigate={() => navigate('servers')}
        />
        <SummaryLink
          label={t('dash.disabledServers')}
          value={disabled}
          tone="warn"
          href="/admin/servers"
          onNavigate={() => navigate('servers')}
        />
        <SummaryLink
          label={t('dash.oauthAttention')}
          value={oauthAttention}
          tone={oauthAttention > 0 ? 'warn' : 'good'}
          href="/admin/oauth"
          onNavigate={() => navigate('oauth')}
        />
        <SummaryLink
          label={t('dash.failedAudits')}
          value={failedAudits}
          tone={failedAudits > 0 ? 'bad' : 'good'}
          href="/admin/audit"
          onNavigate={() => navigate('audit')}
        />
      </SimpleGrid>
      <div className="dashboard-grid">
        <section className="attention-panel" aria-labelledby="attention-title">
          <Group justify="space-between" align="flex-start" mb="sm">
            <div>
              <Text className="eyebrow" size="xs">
                {t('dash.triage')}
              </Text>
              <Title id="attention-title" order={3}>
                {t('dash.needsAttention')}
              </Title>
            </div>
            <Button leftSection={<Plus size={16} />} onClick={() => void configureServer()}>
              {t('dash.configureServer')}
            </Button>
          </Group>
          <Stack gap={0} className="attention-list">
            {disabled > 0 ? (
              <AttentionLink
                icon={<ServerOff size={17} />}
                label={t('dash.attention.disabled', { count: disabled })}
                detail={t('dash.attention.disabledDetail')}
                href="/admin/servers"
                onNavigate={() => navigate('servers')}
              />
            ) : null}
            {oauthAttention > 0 ? (
              <AttentionLink
                icon={<KeyRound size={17} />}
                label={t('dash.attention.oauth', { count: oauthAttention })}
                detail={t('dash.attention.oauthDetail')}
                href="/admin/oauth"
                onNavigate={() => navigate('oauth')}
              />
            ) : null}
            {failedAudits > 0 ? (
              <AttentionLink
                icon={<AlertTriangle size={17} />}
                label={t('dash.attention.audits', { count: failedAudits })}
                detail={t('dash.attention.auditsDetail')}
                href="/admin/audit"
                onNavigate={() => navigate('audit')}
              />
            ) : null}
            {disabled === 0 && oauthAttention === 0 && failedAudits === 0 ? (
              <div className="attention-clear">
                <CircleCheck size={18} />
                <div>
                  <Text fw={800}>{t('dash.noAction')}</Text>
                  <Text c="dimmed" size="sm">
                    {t('dash.clearState')}
                  </Text>
                </div>
              </div>
            ) : null}
          </Stack>
        </section>
        <Panel
          title={t('identity.title')}
          utility={t('identity.currentTarget')}
          icon={<span className="runtime-live-dot" />}
        >
          {runtime ? (
            <SimpleGrid cols={1} spacing="sm" className="runtime-identity-grid">
              <DetailRow label={t('dash.version')} value={runtime.runtimeVersion} />
              <DetailRow
                label={t('identity.externalUrl')}
                value={runtime.externalUrl ?? '-'}
                copyLabel="externalUrl"
                onCopyText={copyText}
                wrapValue
              />
              <DetailRow
                label={t('identity.runtimeScope')}
                value={runtime.runtimeScopeId}
                copyLabel="runtimeScopeId"
                onCopyText={copyText}
                wrapValue
              />
            </SimpleGrid>
          ) : (
            <Text c="dimmed">{t('identity.notLoaded')}</Text>
          )}
        </Panel>
      </div>
      <CopyFeedback message={copyFeedback} />
    </section>
  );
}

export function ServersWorkspace({ model }: { model: OperatorWorkspaceModel }) {
  const { t } = useI18n();
  const { state, configuredServers } = model;
  const creating = configuredServers.create.state.status !== 'idle';
  const editing = configuredServers.edit.state.status !== 'list';

  return (
    <section aria-labelledby="servers-workspace-title" className="operations-workspace">
      <WorkspaceHeading
        title={t('servers.title')}
        titleId="servers-workspace-title"
        description={t('servers.description', {
          count: state.configuredServers.length,
          time: state.lastUpdatedAt ?? t('dash.never'),
        })}
      />
      {!creating && !editing && configuredServers.deletionNotice ? (
        <ConfiguredServerDeletionNotice
          result={configuredServers.deletionNotice}
          dismiss={configuredServers.dismissDeletionNotice}
        />
      ) : null}
      <div className="inventory-column server-browse-workspace" hidden={creating || editing}>
        <ConfiguredServersPanel
          state={state}
          onServerAction={configuredServers.mutate}
          onOpenServerDetail={configuredServers.edit.open}
          onConfigureCustomServer={configuredServers.create.open}
        />
      </div>
      {creating || editing ? (
        <div className="server-task-workspace">
          {creating ? (
            <ConfiguredServerCreator model={configuredServers.create} />
          ) : (
            <ConfiguredServerEditor model={configuredServers.edit} deleteModel={configuredServers.delete} />
          )}
        </div>
      ) : null}
    </section>
  );
}

export function AuditTrailWorkspace({ model }: { model: OperatorWorkspaceModel }) {
  const { t } = useI18n();
  const { state, configuredServers } = model;
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  async function copyText(label: string, value: string): Promise<void> {
    try {
      await configuredServers.copy(label, value);
      setCopyFeedback(`${humanize(label)} copied.`);
    } catch {
      setCopyFeedback(`Could not copy ${humanize(label)}. Select the value manually.`);
    }
  }

  return (
    <section aria-labelledby="audit-workspace-title" className="operations-workspace">
      <WorkspaceHeading
        title={t('audit.title')}
        titleId="audit-workspace-title"
        description={t('audit.description', { time: state.lastUpdatedAt ?? t('dash.never') })}
      />
      <AuditPanel facts={state.status?.audit.facts ?? []} onCopyText={copyText} />
      <CopyFeedback message={copyFeedback} />
    </section>
  );
}

export function WorkspaceHeading({
  title,
  titleId,
  description,
}: {
  title: string;
  titleId?: string;
  description: string;
}) {
  const { t } = useI18n();
  return (
    <Group justify="space-between" align="flex-start" className="workspace-heading">
      <div>
        <Text className="eyebrow" size="xs">
          {t('workspace.operatorLive')}
        </Text>
        <Title id={titleId} order={2}>
          {title}
        </Title>
        <Text c="dimmed" size="sm">
          {description}
        </Text>
      </div>
    </Group>
  );
}

function AttentionLink({
  icon,
  label,
  detail,
  href,
  onNavigate,
}: {
  icon: ReactNode;
  label: string;
  detail: string;
  href: string;
  onNavigate(): void | Promise<void>;
}) {
  return (
    <a
      className="attention-row"
      href={href}
      onClick={(event) => {
        if (!isSamePageNavigation(event)) return;
        event.preventDefault();
        void onNavigate();
      }}
    >
      <span className="attention-icon">{icon}</span>
      <span className="attention-copy">
        <Text component="span" fw={800} size="sm">
          {label}
        </Text>
        <Text component="span" c="dimmed" size="xs">
          {detail}
        </Text>
      </span>
      <ArrowRight size={16} />
    </a>
  );
}

function SummaryLink({
  label,
  value,
  tone,
  href,
  onNavigate,
}: {
  label: string;
  value: number;
  tone: 'good' | 'warn' | 'bad';
  href: string;
  onNavigate(): void;
}) {
  return (
    <Paper
      component="a"
      href={href}
      className={`summary-counter summary-link summary-${tone}`}
      withBorder
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        if (!isSamePageNavigation(event)) return;
        event.preventDefault();
        onNavigate();
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text size="xs" c="dimmed" fw={800} tt="uppercase">
            {label}
          </Text>
          <Text className="summary-value">{value}</Text>
        </div>
        <ArrowRight size={15} aria-hidden="true" />
      </Group>
    </Paper>
  );
}

function CopyFeedback({ message }: { message: string | null }) {
  return (
    <div aria-live="polite">
      {message ? (
        <Alert color={message.startsWith('Could not') ? 'red' : 'teal'} mt="sm">
          {message}
        </Alert>
      ) : null}
    </div>
  );
}

function isSamePageNavigation(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}
