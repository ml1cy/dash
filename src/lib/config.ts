import * as yaml from 'js-yaml';

export type WidgetType = 'ServiceTickets' | 'HardwareStatus' | 'CommandButton';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title?: string;
  badge?: string;
  cols?: number;
  rows?: number;
  props?: Record<string, unknown>;
}

export interface DashboardTab {
  id: string;
  label: string;
  columns?: number;
  widgets: DashboardWidget[];
}

export interface DashboardConfig {
  title: string;
  tabs: DashboardTab[];
}

export const DEFAULT_CONFIG_YAML = `title: Dashboard\ntabs:\n  - id: overview\n    label: Overview\n    columns: 3\n    widgets:\n      - id: tickets\n        type: ServiceTickets\n        title: Service Tickets\n        props:\n          open: 7\n          inProgress: 3\n          overdue: 1\n      - id: hardware\n        type: HardwareStatus\n        title: Hardware Status\n        props:\n          printer: online\n          pi: online\n          temperature: 41\n      - id: reboot\n        type: CommandButton\n        title: Actions\n        props:\n          label: Run Health Check\n          endpoint: /api/proxy\n          method: POST\n          body:\n            url: https://example.com/health-check\n`;

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeWidget = (input: unknown, index: number): DashboardWidget => {
  if (!isObject(input)) {
    throw new Error(`Widget at index ${index} must be an object.`);
  }

  const type = input.type;
  if (type !== 'ServiceTickets' && type !== 'HardwareStatus' && type !== 'CommandButton') {
    throw new Error(`Widget at index ${index} has unsupported type.`);
  }

  return {
    id: typeof input.id === 'string' && input.id ? input.id : `widget-${index + 1}`,
    type,
    title: typeof input.title === 'string' ? input.title : undefined,
    badge: typeof input.badge === 'string' ? input.badge : undefined,
    cols: typeof input.cols === 'number' && input.cols > 0 ? input.cols : 1,
    rows: typeof input.rows === 'number' && input.rows > 0 ? input.rows : 1,
    props: isObject(input.props) ? input.props : {},
  };
};

const normalizeTab = (input: unknown, index: number): DashboardTab => {
  if (!isObject(input)) {
    throw new Error(`Tab at index ${index} must be an object.`);
  }

  const rawWidgets = Array.isArray(input.widgets) ? input.widgets : [];

  return {
    id: typeof input.id === 'string' && input.id ? input.id : `tab-${index + 1}`,
    label: typeof input.label === 'string' && input.label ? input.label : `Tab ${index + 1}`,
    columns: typeof input.columns === 'number' && input.columns > 0 ? input.columns : 3,
    widgets: rawWidgets.map((widget, widgetIndex) => normalizeWidget(widget, widgetIndex)),
  };
};

export const parseDashboardConfig = (rawYaml: string): DashboardConfig => {
  const parsed = yaml.load(rawYaml);
  if (!isObject(parsed)) {
    throw new Error('Dashboard YAML must define an object at the root.');
  }

  const tabsInput = Array.isArray(parsed.tabs) ? parsed.tabs : [];
  if (tabsInput.length === 0) {
    throw new Error('Dashboard YAML must include at least one tab.');
  }

  return {
    title: typeof parsed.title === 'string' && parsed.title ? parsed.title : 'Dashboard',
    tabs: tabsInput.map((tab, index) => normalizeTab(tab, index)),
  };
};

const isKvNamespaceLike = (value: unknown): value is { get: (key: string) => Promise<string | null> } =>
  isObject(value) && typeof value.get === 'function';

export const loadDashboardConfigYaml = async (env?: Record<string, unknown>): Promise<string> => {
  if (typeof env?.DASHBOARD_CONFIG === 'string' && env.DASHBOARD_CONFIG.trim()) {
    return env.DASHBOARD_CONFIG;
  }

  if (isKvNamespaceLike(env?.DASHBOARD_CONFIG)) {
    try {
      const value = await env.DASHBOARD_CONFIG.get('dashboard.yaml');
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    } catch {
      // Fall back to default config below.
    }
  }

  return DEFAULT_CONFIG_YAML;
};

export const loadDashboardConfig = async (env?: Record<string, unknown>): Promise<DashboardConfig> => {
  const rawYaml = await loadDashboardConfigYaml(env);
  return parseDashboardConfig(rawYaml);
};
