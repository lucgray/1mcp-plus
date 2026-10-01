import { Alert, Paper, SimpleGrid, Stack, Text, Title } from '@mantine/core';

import { useI18n } from '../../i18n';
import type { AdminConsoleState } from '../../state/adminConsoleState';

export function AboutRuntimeWorkspace({ state }: { state: AdminConsoleState }) {
  const { t } = useI18n();
  const about = state.status?.about;
  if (!about) return <Alert>{t('about.unavailable')}</Alert>;
  return (
    <section aria-labelledby="about-title" className="operations-workspace">
      <Text className="eyebrow" size="xs">
        {t('about.eyebrow')}
      </Text>
      <Title id="about-title" order={2}>
        {t('about.title', { name: about.productName })}
      </Title>
      {!about.protocolCompatible ? (
        <Alert color="red" title={t('about.protocolIncompatible')}>
          {t('about.protocolMismatch', {
            expected: about.adminUiProtocolVersion ?? t('common.unavailable'),
            actual: about.adminApiProtocolVersion,
          })}
        </Alert>
      ) : null}
      <SimpleGrid cols={{ base: 1, md: 2 }} mt="md">
        <AboutPanel
          title={t('about.versions')}
          values={[
            [t('about.runtimeVersion'), about.runtimeVersion],
            [t('about.adminUiBuild'), about.adminUiBuildVersion ?? t('common.unavailable')],
            [t('about.adminApiProtocol'), about.adminApiProtocolVersion],
            [t('about.adminUiProtocol'), about.adminUiProtocolVersion ?? t('common.unavailable')],
          ]}
        />
        <AboutPanel
          title={t('about.runtimeScope')}
          values={[
            [t('about.runtimeScopeId'), about.runtime.runtimeScopeId],
            [t('about.externalUrl'), about.runtime.externalUrl ?? t('common.unavailable')],
          ]}
        />
        <AboutPanel
          title={t('about.build')}
          values={[
            [t('about.commit'), about.build.commit ?? t('common.unavailable')],
            [t('about.buildTimestamp'), about.build.timestamp ?? t('common.unavailable')],
          ]}
        />
        <Paper withBorder p="md">
          <Title order={3}>{t('about.project')}</Title>
          <Stack gap="xs" mt="sm">
            {about.project.repository ? (
              <SafeExternalLink label={t('about.repository')} href={about.project.repository} />
            ) : (
              <Text>
                {t('about.repository')} · {t('common.unavailable')}
              </Text>
            )}
            {about.project.documentation ? (
              <SafeExternalLink label={t('about.documentation')} href={about.project.documentation} />
            ) : (
              <Text>
                {t('about.documentation')} · {t('common.unavailable')}
              </Text>
            )}
            {about.project.issues ? (
              <SafeExternalLink label={t('about.reportIssue')} href={about.project.issues} />
            ) : (
              <Text>
                {t('about.reportIssue')} · {t('common.unavailable')}
              </Text>
            )}
            <Text>
              {t('about.license')} · {about.project.license ?? t('common.unavailable')}
            </Text>
          </Stack>
        </Paper>
      </SimpleGrid>
    </section>
  );
}

function AboutPanel({ title, values }: { title: string; values: Array<[string, string]> }) {
  return (
    <Paper withBorder p="md">
      <Title order={3}>{title}</Title>
      <Stack gap="xs" mt="sm">
        {values.map(([label, value]) => (
          <div key={label}>
            <Text size="xs" c="dimmed">
              {label}
            </Text>
            <Text>{value}</Text>
          </div>
        ))}
      </Stack>
    </Paper>
  );
}

function SafeExternalLink({ label, href }: { label: string; href: string }) {
  const { t } = useI18n();
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={t('common.opensNewTab', { label })}>
      {label}
    </a>
  );
}
