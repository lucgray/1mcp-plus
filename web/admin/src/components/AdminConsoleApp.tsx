import {
  ActionIcon,
  Alert,
  AppShell,
  Badge,
  Burger,
  Button,
  Code,
  Group,
  Menu,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
  Tooltip,
  useMantineColorScheme,
} from '@mantine/core';

import {
  Boxes,
  Check,
  FileClock,
  FileText,
  Gauge,
  Info,
  Languages,
  LogOut,
  Monitor,
  Moon,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  SquareTerminal,
  Sun,
  SunMoon,
  UserRound,
} from 'lucide-react';
import { type KeyboardEvent, lazy, type MouseEvent, type ReactNode, Suspense, useState } from 'react';

import { useI18n } from '../i18n';
import type { AdminConsoleRoute, AdminConsoleSessionModel } from '../session/AdminConsoleSessionModel';
import type { AdminConsoleState } from '../state/adminConsoleState';
import { runtimeEndpointSummary, runtimeSummary, viewBadgeColor, viewLabel } from './adminConsoleUtils';
import { AuditTrailWorkspace, DashboardWorkspace, ServersWorkspace } from './workspaces/RuntimeOperationsWorkspace';

const AboutRuntimeWorkspace = lazy(() =>
  import('./workspaces/AboutRuntimeWorkspace').then((module) => ({ default: module.AboutRuntimeWorkspace })),
);
const BackendLogsWorkspace = lazy(() =>
  import('./workspaces/BackendLogsWorkspace').then((module) => ({ default: module.BackendLogsWorkspace })),
);
const InstructionTemplatesWorkspace = lazy(() =>
  import('./workspaces/InstructionTemplatesWorkspace').then((module) => ({
    default: module.InstructionTemplatesWorkspace,
  })),
);
const OAuthServicesWorkspace = lazy(() =>
  import('./workspaces/OAuthServicesWorkspace').then((module) => ({ default: module.OAuthServicesWorkspace })),
);
const PresetAuthoringWorkspace = lazy(() =>
  import('./workspaces/PresetAuthoringWorkspace').then((module) => ({ default: module.PresetAuthoringWorkspace })),
);

export interface AdminConsoleAppProps {
  session: AdminConsoleSessionModel;
}

export function AdminConsoleApp({ session }: AdminConsoleAppProps) {
  const { t } = useI18n();
  const { state, loginBusy, navigation } = session;
  const route = navigation.route;
  const [mobileNavigationOpened, setMobileNavigationOpened] = useState(false);
  if (state.view !== 'console') {
    return (
      <AuthShell state={state}>
        {state.view === 'setupRequired' ? <SetupRequiredView /> : null}
        {state.view === 'loading' || state.view === 'login' ? (
          <LoginView loading={state.view === 'loading' || loginBusy} onLogin={session.login} />
        ) : null}
      </AuthShell>
    );
  }

  return (
    <>
      <a className="skip-link" href="#admin-main">
        {t('header.skipToMain')}
      </a>
      <AppShell
        className="admin-app-shell"
        header={{ height: 66 }}
        navbar={{ width: 232, breakpoint: 'md', collapsed: { mobile: !mobileNavigationOpened } }}
        padding={0}
      >
        <AppShell.Header aria-label={t('header.title')} className="admin-app-header">
          <Group h="100%" px="lg" justify="space-between" wrap="nowrap" className="command-bar">
            <Group gap="sm" wrap="nowrap">
              <Burger
                aria-label={mobileNavigationOpened ? 'Close operations navigation' : 'Open operations navigation'}
                className="mobile-navigation-toggle"
                color="var(--admin-ink)"
                opened={mobileNavigationOpened}
                size="sm"
                onClick={() => setMobileNavigationOpened((opened) => !opened)}
              />
              <Title order={1} size="h4">
                {t('header.title')}
              </Title>
            </Group>
            <Group gap="xs" wrap="nowrap" className="global-actions">
              <div className="runtime-live" aria-label={t('header.runtimeOnline')}>
                <span className="runtime-live-dot" />
                <Text size="xs" fw={800}>
                  {t('header.runtimeOnline')}
                </Text>
              </div>
              <Badge className="global-view-badge" variant="light" color={viewBadgeColor(state)}>
                {viewLabel(state, t)}
              </Badge>
              <Tooltip label={t('header.refresh')}>
                <ActionIcon
                  aria-label={t('header.refresh')}
                  color="gray"
                  size="lg"
                  variant="subtle"
                  onClick={() => void session.refresh()}
                >
                  <RefreshCw size={17} />
                </ActionIcon>
              </Tooltip>
              <LanguageMenu />
              <ThemeMenu />
              <div className="operator-identity" title={state.session?.account.role ?? t('header.adminSession')}>
                <UserRound size={16} />
                <Text className="operator-name" fw={700} size="sm">
                  {state.session?.account.username ?? t('header.operator')}
                </Text>
              </div>
              <Tooltip label={t('header.logOut')}>
                <ActionIcon
                  aria-label={t('header.logOut')}
                  color="red"
                  size="lg"
                  variant="subtle"
                  onClick={() => void session.logout()}
                >
                  <LogOut size={17} />
                </ActionIcon>
              </Tooltip>
            </Group>
          </Group>
        </AppShell.Header>
        <AppShell.Navbar className="admin-app-navbar" aria-label={t('header.operationsNav')}>
          <Stack gap="lg" className="nav-stack">
            <Stack gap={4}>
              <Text className="nav-section-label">{t('nav.manage')}</Text>
              <NavItem
                icon={<Gauge size={17} />}
                label={t('nav.overview')}
                href="/admin"
                active={route === 'dashboard'}
                onNavigate={() => navigate('dashboard')}
              />
              <NavItem
                icon={<Boxes size={17} />}
                label={t('nav.servers')}
                href="/admin/servers"
                active={route === 'servers'}
                onNavigate={() => navigate('servers')}
              />
              <NavItem
                icon={<SlidersHorizontal size={17} />}
                label={t('nav.presets')}
                href="/admin/presets"
                active={route === 'presets'}
                onNavigate={() => navigate('presets')}
              />
              <NavItem
                icon={<FileText size={17} />}
                label={t('nav.instructions')}
                href="/admin/instructions"
                active={route === 'instructions'}
                onNavigate={() => navigate('instructions')}
              />
            </Stack>
            <Stack gap={4}>
              <Text className="nav-section-label">{t('nav.observe')}</Text>
              <NavItem
                icon={<ShieldCheck size={17} />}
                label={t('nav.oauth')}
                href="/admin/oauth"
                active={route === 'oauth'}
                onNavigate={() => navigate('oauth')}
              />
              <NavItem
                icon={<FileClock size={17} />}
                label={t('nav.audit')}
                href="/admin/audit"
                active={route === 'audit'}
                onNavigate={() => navigate('audit')}
              />
              <NavItem
                icon={<SquareTerminal size={17} />}
                label={t('nav.logs')}
                href="/admin/logs"
                active={route === 'logs'}
                onNavigate={() => navigate('logs')}
              />
            </Stack>
            <Stack gap={4}>
              <Text className="nav-section-label">{t('nav.system')}</Text>
              <NavItem
                icon={<Info size={17} />}
                label={t('nav.about')}
                href="/admin/about"
                active={route === 'about'}
                onNavigate={() => navigate('about')}
              />
            </Stack>
          </Stack>
          <Stack gap="xs" className="nav-runtime-card">
            <Text className="nav-section-label">{t('nav.runtimeTarget')}</Text>
            <Text fw={800} className="truncate">
              {runtimeSummary(state.status?.runtime)}
            </Text>
            <Text size="xs" c="dimmed" className="truncate">
              {runtimeEndpointSummary(state.status?.runtime)}
            </Text>
            <Text size="xs" className="nav-scope truncate">
              {state.status?.runtime.runtimeScopeId ?? t('nav.scopeUnavailable')}
            </Text>
          </Stack>
        </AppShell.Navbar>
        <AppShell.Main id="admin-main" className="admin-shell-main">
          <Stack gap="md" className="admin-console">
            <Banner state={state} />
            <Suspense fallback={<WorkspaceLoading />}>
              <ConsoleWorkspace session={session} />
            </Suspense>
          </Stack>
        </AppShell.Main>
      </AppShell>
    </>
  );

  function navigate(route: AdminConsoleRoute) {
    void navigation.navigate(route);
    setMobileNavigationOpened(false);
  }
}

function WorkspaceLoading() {
  const { t } = useI18n();
  return (
    <Paper className="operations-panel" role="status" withBorder>
      <Text c="dimmed">{t('workspace.loading')}</Text>
    </Paper>
  );
}

function ConsoleWorkspace({ session }: { session: AdminConsoleSessionModel }) {
  const { state, navigation, configuredServers, presets } = session;
  const operatorModel = { state, logout: session.logout, refresh: session.refresh, configuredServers };

  switch (navigation.route) {
    case 'servers':
      return <ServersWorkspace model={operatorModel} />;
    case 'oauth':
      return (
        <OAuthServicesWorkspace
          model={operatorModel}
          oauth={session.oauth}
          configureServer={operatorModel.configuredServers.create.open}
        />
      );
    case 'audit':
      return <AuditTrailWorkspace model={operatorModel} />;
    case 'presets':
      return (
        <PresetAuthoringWorkspace
          model={{
            ...presets,
            targets:
              presets.targets.length > 0
                ? presets.targets
                : state.configuredServers.map((server) => ({
                    name: server.id,
                    tags: server.tags,
                    enabled: server.enabled,
                  })),
          }}
          runtimeScopeId={state.status?.runtime.runtimeScopeId}
        />
      );
    case 'instructions':
      return (
        <InstructionTemplatesWorkspace
          model={session.instructions}
          runtimeScopeId={state.status?.runtime.runtimeScopeId}
        />
      );
    case 'logs':
      return <BackendLogsWorkspace logs={session.logs} configureServer={operatorModel.configuredServers.create.open} />;
    case 'about':
      return <AboutRuntimeWorkspace state={state} />;
    case 'dashboard':
      return <DashboardWorkspace model={operatorModel} navigate={navigation.navigate} />;
  }
}

function NavItem({
  icon,
  label,
  href,
  active = false,
  onNavigate,
}: {
  icon: ReactNode;
  label: string;
  href: string;
  active?: boolean;
  onNavigate?: () => void;
}) {
  return (
    <a
      href={href}
      aria-current={active ? 'page' : undefined}
      className={`nav-item${active ? ' nav-item-active' : ''}`}
      onClick={(event) => {
        if (!isSamePageNavigation(event)) return;
        event.preventDefault();
        onNavigate?.();
      }}
    >
      {icon}
      <Text size="sm" fw={700}>
        {label}
      </Text>
    </a>
  );
}

function isSamePageNavigation(event: MouseEvent<HTMLAnchorElement>): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

function AuthShell({ state, children }: { state: AdminConsoleState; children: ReactNode }) {
  const { t } = useI18n();
  return (
    <main className="admin-auth-shell" aria-label={t('header.adminSession')}>
      <div className="auth-theme-control">
        <LanguageMenu />
        <ThemeMenu />
      </div>
      <Stack gap="md" className="admin-auth-card">
        <Banner state={state} />
        {children}
      </Stack>
    </main>
  );
}

function ThemeMenu() {
  const { t } = useI18n();
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const options = [
    { value: 'auto' as const, label: t('theme.system'), icon: <Monitor size={16} /> },
    { value: 'light' as const, label: t('theme.light'), icon: <Sun size={16} /> },
    { value: 'dark' as const, label: t('theme.dark'), icon: <Moon size={16} /> },
  ];

  return (
    <Menu position="bottom-end" shadow="md" width={170}>
      <Menu.Target>
        <ActionIcon
          aria-label={t('theme.choose')}
          color="gray"
          size="lg"
          title={t('header.colorTheme')}
          variant="subtle"
        >
          <SunMoon size={17} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t('header.colorTheme')}</Menu.Label>
        {options.map((option) => (
          <Menu.Item
            key={option.value}
            aria-label={`${option.label} theme${colorScheme === option.value ? ', selected' : ''}`}
            leftSection={option.icon}
            rightSection={colorScheme === option.value ? <Check size={14} /> : null}
            onClick={() => setColorScheme(option.value)}
          >
            {option.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

function LanguageMenu() {
  const { locale, setLocale, t } = useI18n();
  const options: { value: 'en' | 'zh'; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'zh', label: '中文' },
  ];

  return (
    <Menu position="bottom-end" shadow="md" width={150}>
      <Menu.Target>
        <ActionIcon
          aria-label={t('header.language')}
          color="gray"
          size="lg"
          title={t('header.language')}
          variant="subtle"
        >
          <Languages size={17} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t('header.language')}</Menu.Label>
        {options.map((option) => (
          <Menu.Item
            key={option.value}
            aria-label={`${option.label}${locale === option.value ? ', selected' : ''}`}
            rightSection={locale === option.value ? <Check size={14} /> : null}
            onClick={() => setLocale(option.value)}
          >
            {option.label}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

function SetupRequiredView() {
  const { t } = useI18n();
  return (
    <Paper component="section" className="operations-panel" aria-labelledby="setup-required-title" withBorder>
      <Stack gap="sm">
        <Group justify="space-between" align="flex-start">
          <div>
            <Text className="eyebrow" size="xs">
              {t('auth.runtimeGate')}
            </Text>
            <Title id="setup-required-title" order={2}>
              {t('auth.setupRequired')}
            </Title>
          </div>
          <Badge color="yellow" variant="filled">
            {t('auth.noAdminAccount')}
          </Badge>
        </Group>
        <Text c="dimmed">{t('auth.bootstrapHint')}</Text>
        <Code block>1mcp admin bootstrap --username operator --password 'use-a-long-random-password'</Code>
      </Stack>
    </Paper>
  );
}

function LoginView({
  loading,
  onLogin,
}: {
  loading: boolean;
  onLogin?: (input: { username: string; password: string }) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <Paper component="section" className="login-panel" aria-labelledby="login-title" withBorder>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!loading) {
            void onLogin?.({ username, password });
          }
        }}
      >
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text className="eyebrow" size="xs">
                {t('auth.adminSession')}
              </Text>
              <Title id="login-title" order={2}>
                {t('auth.operatorLogin')}
              </Title>
            </div>
            <Badge variant="light">{loading ? t('auth.checkingSession') : t('auth.loginRequired')}</Badge>
          </Group>
          <TextInput
            label={t('auth.username')}
            autoComplete="username"
            disabled={loading}
            value={username}
            onChange={(event) => setUsername(event.currentTarget.value)}
            required
          />
          <PasswordInput
            label={t('auth.password')}
            autoComplete="current-password"
            disabled={loading}
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            visible={passwordVisible}
            onVisibilityChange={() => setPasswordVisible((visible) => !visible)}
            visibilityToggleButtonProps={{
              'aria-label': passwordVisible ? t('auth.hidePassword') : t('auth.showPassword'),
              'aria-pressed': passwordVisible,
              tabIndex: 0,
              onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  setPasswordVisible((visible) => !visible);
                }
              },
            }}
            required
          />
          <Button type="submit" loading={loading} disabled={loading}>
            {loading ? t('auth.checking') : t('auth.logIn')}
          </Button>
        </Stack>
      </form>
    </Paper>
  );
}

function Banner({ state }: { state: AdminConsoleState }) {
  const banner = state.banner ?? (state.error ? { kind: 'error' as const, message: state.error } : null);
  if (!banner) {
    return null;
  }

  return (
    <Alert color={banner.kind === 'error' ? 'red' : 'teal'} role={banner.kind === 'error' ? 'alert' : 'status'}>
      {banner.message}
    </Alert>
  );
}
