import {
  API_URL,
  ADMIN_TOKEN,
  APP_VERSION,
  SESSION_ID,
  SCENARIO,
  RUN_ID,
} from './config';
import { PLATFORM } from '../platform/identity';

export function now(): number {
  return globalThis.performance?.now() ?? Date.now();
}

export function afterPaint(cb: () => void): void {
  requestAnimationFrame(() => requestAnimationFrame(cb));
}

export type MetricName =
  | 'startup_ms'
  | 'ui_response_ms'
  | 'api_request_ms'
  | 'request_build_ms'
  | 'render_checkout_ms'
  | 'render_orders_ms'
  | 'render_search_ms'
  | 'ram_mb'
  | 'cpu_percent';

type Sample = {
  metric: MetricName;
  value: number;
  unit: 'ms' | 'MB' | '%';
  serverMs?: number;
  recordedAtMs: number;
  extra?: Record<string, unknown>;
};

const buffer: Sample[] = [];

let deviceModel = 'nieznane';
let osVersion = 'nieznane';

export function configureDevice(opts: {
  deviceModel?: string;
  osVersion?: string;
}) {
  if (opts.deviceModel) deviceModel = opts.deviceModel;
  if (opts.osVersion) osVersion = opts.osVersion;
}

export function record(
  metric: MetricName,
  value: number,
  unit: 'ms' | 'MB' | '%' = 'ms',
  opts?: { serverMs?: number; extra?: Record<string, unknown> },
): void {
  buffer.push({
    metric,
    value: Math.round(value * 1000) / 1000,
    unit,
    serverMs: opts?.serverMs,
    extra: opts?.extra,
    recordedAtMs: Date.now(),
  });
  if (import.meta.env.DEV) {
    console.log(`[POMIAR ${SCENARIO}] ${metric} = ${value.toFixed(2)} ${unit}`);
  }
}

export async function flush(): Promise<number> {
  if (buffer.length === 0) return 0;
  const payload = {
    sessionId: SESSION_ID,
    runId: RUN_ID,
    scenario: SCENARIO,
    platform: PLATFORM,
    deviceModel,
    osVersion,
    buildType: import.meta.env.DEV ? 'debug' : 'release',
    appVersion: APP_VERSION,
    measurements: [...buffer],
  };
  const res = await fetch(`${API_URL}/api/metrics/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': ADMIN_TOKEN,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Wysyłka pomiarów nieudana: ${res.status}`);
  const count = buffer.length;
  buffer.length = 0;
  return count;
}

export function pendingCount() {
  return buffer.length;
}
