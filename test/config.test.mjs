import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDashboardConfig, parseDashboardConfig } from '../src/lib/config.ts';

test('parseDashboardConfig parses valid YAML tabs and widgets', () => {
  const config = parseDashboardConfig(`title: Ops\ntabs:\n  - id: a\n    label: A\n    widgets:\n      - id: w1\n        type: ServiceTickets\n`);

  assert.equal(config.title, 'Ops');
  assert.equal(config.tabs.length, 1);
  assert.equal(config.tabs[0].widgets[0].type, 'ServiceTickets');
});

test('loadDashboardConfig falls back to default YAML when env is missing', () => {
  const config = loadDashboardConfig();
  assert.equal(config.title, 'Dashboard');
  assert.ok(config.tabs.length > 0);
});

test('parseDashboardConfig rejects YAML without tabs', () => {
  assert.throws(() => parseDashboardConfig('title: Nope'), /at least one tab/);
});
