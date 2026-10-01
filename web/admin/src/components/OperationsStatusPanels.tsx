import { Stack } from '@mantine/core';

import { AlertTriangle } from 'lucide-react';

import type { AdminAuditFact } from '../api/adminApi';
import { useI18n } from '../i18n';
import { DetailRow, EmptyState, Panel } from './AdminConsoleShared';

export function AuditPanel({
  facts,
  onCopyText,
}: {
  facts: AdminAuditFact[];
  onCopyText?: (label: string, value: string) => Promise<void>;
}) {
  const { t } = useI18n();
  return (
    <Panel title={t('audit.panelTitle')} utility={t('audit.redacted')} icon={<AlertTriangle size={17} />}>
      {facts.length === 0 ? (
        <EmptyState message={t('audit.empty')} />
      ) : (
        <Stack gap="xs">
          {facts.map((fact) => (
            <DetailRow
              key={fact.operationId ?? `${fact.operationName}-${fact.timestamp}`}
              label={fact.operationName}
              value={fact.result}
              meta={fact.target?.id ?? fact.operationId ?? '-'}
              description={fact.timestamp}
              copyLabel={fact.request?.requestId ? 'requestId' : undefined}
              copyValue={fact.request?.requestId}
              onCopyText={onCopyText}
            />
          ))}
        </Stack>
      )}
    </Panel>
  );
}
