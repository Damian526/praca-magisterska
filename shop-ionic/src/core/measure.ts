import { API_URL, ADMIN_TOKEN, APP_VERSION } from './config';
import { PLATFORM } from '../platform/identity';

export function now(): number {
  const p = (globalThis as any).performance;
  return typeof p?.now === 'function' ? p.now() : Date.now();
}

export function afterPaint(cb: () => void): void {
  requestAnimationFrame(() => requestAnimationFrame(cb));
}

// ─────────────────────────────────────────────────────────
//  BUFOR POMIARÓW
// ─────────────────────────────────────────────────────────

export type MetricName =
  | 'startup_ms'
  | 'ui_response_ms'
  | 'api_request_ms'
  | 'render_ms'
  | 'ram_mb'
  | 'cpu_percent';

export type Scenario = 'S1' | 'S2' | 'S3';

type Sample = {
  scenario: Scenario;
  metric: MetricName;
  iteration: number;
  value: number;
  unit: 'ms' | 'MB' | '%';
  serverMs?: number;
  recordedAt: string;
  extra?: Record<string, unknown>;
};

const buffer: Sample[] = [];

let runId = 'run_dev';
let iteration = 1;
let deviceModel = 'nieznane';
let osVersion = 'nieznane';

export function configureRun(opts: {
  runId: string;
  iteration?: number;
  deviceModel?: string;
  osVersion?: string;
}) {
  runId = opts.runId;
  if (opts.iteration !== undefined) iteration = opts.iteration;
  if (opts.deviceModel) deviceModel = opts.deviceModel;
  if (opts.osVersion) osVersion = opts.osVersion;
}

export function nextIteration() {
  iteration += 1;
}

/**
 * ⚠️⚠️ TYLKO zapis do pamięci. ŻADNEJ SIECI.
 */
export function record(
  scenario: Scenario,
  metric: MetricName,
  value: number,
  unit: 'ms' | 'MB' | '%' = 'ms',
  opts?: { serverMs?: number; extra?: Record<string, unknown> },
): void {
  buffer.push({
    scenario,
    metric,
    iteration,
    value: Math.round(value * 1000) / 1000,
    unit,
    serverMs: opts?.serverMs,
    extra: opts?.extra,
    recordedAt: new Date().toISOString(),
  });
  if (__DEV__) console.log(`[POMIAR] ${metric} = ${value.toFixed(2)} ${unit}`);
}

/** Wywołuj DOPIERO po zakończeniu całego scenariusza. */
export async function flush(): Promise<number> {
  if (buffer.length === 0) return 0;
  const payload = {
    runId,
    platform: PLATFORM,
    deviceModel,
    osVersion,
    buildType: __DEV__ ? 'debug' : 'release',
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
