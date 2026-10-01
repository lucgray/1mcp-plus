export type ServerState = 'stopped' | 'starting' | 'running' | 'stopping' | 'failed';

export interface HealthResponse {
  status: string;
  version?: string;
  timestamp?: string;
  system?: {
    uptime?: number;
  };
  configuration?: {
    loaded?: boolean;
  };
}

export interface McpServerDetail {
  state: string;
  retryCount?: number;
  duration?: number;
  error?: string;
  progress?: string;
  authorizationUrl?: string;
}

export interface McpHealthResponse {
  loading?: {
    isComplete?: boolean;
    successRate?: number;
  };
  summary?: {
    total?: number;
    pending?: number;
    loading?: number;
    ready?: number;
    failed?: number;
    awaitingOAuth?: number;
    cancelled?: number;
  };
  servers?: {
    byState?: Record<string, string[]>;
    details?: Record<string, McpServerDetail>;
  };
  degraded?: boolean;
  timestamp?: string;
}

export interface StatusSnapshot {
  state: ServerState;
  endpoint: string;
  error?: string;
  health?: HealthResponse;
  mcp?: McpHealthResponse;
  logTail: string[];
}
