import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { Prisma } from "../../generated/prisma/client.js";
import { MetricsBatchBody } from "./metrics.schema.js";

/* Kontrakt API używa czytelnych nazw ('react-native'), baza — enumów
   PostgreSQL (REACT_NATIVE). Mapujemy w jednym miejscu. */
const PLATFORM = {
  "react-native": "REACT_NATIVE",
  ionic: "IONIC",
} as const;

const BUILD = { release: "RELEASE", debug: "DEBUG" } as const;

const METRIC = {
  startup_ms: "STARTUP_MS",
  ui_response_ms: "UI_RESPONSE_MS",
  api_request_ms: "API_REQUEST_MS",
  request_build_ms: "REQUEST_BUILD_MS",
  render_checkout_ms: "RENDER_CHECKOUT_MS",
  render_orders_ms: "RENDER_ORDERS_MS",
  render_search_ms: "RENDER_SEARCH_MS",
  ram_mb: "RAM_MB",
  cpu_percent: "CPU_PERCENT",
} as const;

/** Filtr wspólny dla /summary i /export.csv */
const SeriesFilter = Type.Object({
  sessionId: Type.Optional(Type.String()),
  runId: Type.Optional(Type.String()),
});

type SeriesQuery = { sessionId?: string; runId?: string };

const whereSeries = (q: SeriesQuery) => ({
  ...(q.sessionId ? { sessionId: q.sessionId } : {}),
  ...(q.runId ? { runId: q.runId } : {}),
});

export const metricsRoutes: FastifyPluginAsyncTypebox = async (app) => {
  // Wszystkie trasy w tym module wymagają tokenu administracyjnego.
  // To działa dzięki enkapsulacji (rozdz. 0.2) — hook obowiązuje
  // tylko wewnątrz tego pluginu.
  app.addHook("onRequest", app.requireAdminToken);

  /* ---- Zapis paczki pomiarów ---- */
  app.post(
    "/batch",
    {
      schema: {
        tags: ["metrics"],
        summary: "Zapisuje paczkę pomiarów z aplikacji mobilnej",
        body: MetricsBatchBody,
        response: {
          201: Type.Object({
            saved: Type.Integer(),
            sessionId: Type.String(),
            runId: Type.String(),
            scenario: Type.String(),
          }),
        },
      },
    },
    async (request, reply) => {
      const b = request.body;

      // Iteracje numerujemy licząc wiersze już zapisane w tej serii. runId jest
      // stały przez całą serię, więc numeracja przeżywa restarty aplikacji w S1.
      const counts = new Map<string, number>();
      for (const m of b.measurements) {
        const key = METRIC[m.metric];
        if (!counts.has(key)) {
          const n = await app.prisma.measurement.count({
            where: {
              sessionId: b.sessionId,
              runId: b.runId,
              platform: PLATFORM[b.platform],
              scenario: b.scenario,
              metric: METRIC[m.metric],
            },
          });
          counts.set(key, n);
        }
      }

      const nextIteration = (metric: string) => {
        const n = counts.get(metric)! + 1;
        counts.set(metric, n);
        return n;
      };

      await app.prisma.measurement.createMany({
        data: b.measurements.map((m) => ({
          sessionId: b.sessionId,
          runId: b.runId,
          platform: PLATFORM[b.platform],
          scenario: b.scenario,
          deviceModel: b.deviceModel,
          osVersion: b.osVersion,
          buildType: BUILD[b.buildType],
          appVersion: b.appVersion,
          metric: METRIC[m.metric],
          iteration: nextIteration(METRIC[m.metric]),
          value: m.value,
          unit: m.unit,
          serverMs: m.serverMs ?? null,
          extra:
            m.extra === null
              ? Prisma.JsonNull
              : m.extra === undefined
                ? undefined
                : (m.extra as Prisma.InputJsonValue), // JSONB — Prisma wymaga InputJsonValue lub JsonNull
          recordedAtMs: BigInt(m.recordedAtMs),
        })),
      });

      reply.code(201);
      return {
        saved: b.measurements.length,
        sessionId: b.sessionId,
        runId: b.runId,
        scenario: b.scenario,
      };
    },
  );

  /* ---- Statystyki opisowe ---- */
  app.get(
    "/summary",
    {
      schema: { tags: ["metrics"], querystring: SeriesFilter },
    },
    async (request) => {
      const rows = await app.prisma.measurement.findMany({
        where: whereSeries(request.query),
      });

      // grupowanie: sesja | platforma | scenariusz | metryka
      const groups = new Map<string, number[]>();
      for (const r of rows) {
        const key = `${r.sessionId}|${r.platform}|${r.scenario}|${r.metric}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r.value);
      }

      return [...groups.entries()]
        .map(([key, values]) => {
          const [sessionId, platform, scenario, metric] = key.split("|");
          const sorted = [...values].sort((a, b) => a - b);
          const n = sorted.length;
          const mean = sorted.reduce((a, b) => a + b, 0) / n;
          const variance =
            n > 1
              ? sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1)
              : 0;

          const percentile = (p: number) =>
            sorted[Math.min(n - 1, Math.floor((p / 100) * n))];

          return {
            sessionId,
            platform,
            scenario,
            metric,
            n,
            mean: +mean.toFixed(3),
            median: +percentile(50).toFixed(3),
            sd: +Math.sqrt(variance).toFixed(3),
            min: +sorted[0].toFixed(3),
            max: +sorted[n - 1].toFixed(3),
            p95: +percentile(95).toFixed(3),
          };
        })
        .sort(
          (a, b) =>
            a.sessionId.localeCompare(b.sessionId) ||
            a.scenario.localeCompare(b.scenario) ||
            a.metric.localeCompare(b.metric) ||
            a.platform.localeCompare(b.platform),
        );
    },
  );

  /* ---- Eksport CSV ---- */
  app.get(
    "/export.csv",
    {
      schema: { tags: ["metrics"], querystring: SeriesFilter },
    },
    async (request, reply) => {
      const rows = await app.prisma.measurement.findMany({
        where: whereSeries(request.query),
        orderBy: [
          { sessionId: "asc" },
          { platform: "asc" },
          { scenario: "asc" },
          { metric: "asc" },
          { iteration: "asc" },
        ],
      });

      const header = [
        "session_id",
        "run_id",
        "platform",
        "device_model",
        "os_version",
        "build_type",
        "app_version",
        "scenario",
        "metric",
        "iteration",
        "value",
        "unit",
        "server_ms",
        "recorded_at_ms",
        "recorded_at_utc",
      ].join(",");

      const lines = rows.map((r) =>
        [
          r.sessionId,
          r.runId,
          r.platform,
          r.deviceModel ?? "",
          r.osVersion ?? "",
          r.buildType ?? "",
          r.appVersion ?? "",
          r.scenario,
          r.metric,
          r.iteration,
          r.value,
          r.unit,
          r.serverMs ?? "",
          r.recordedAtMs.toString(), // BigInt nie serializuje się sam
          new Date(Number(r.recordedAtMs)).toISOString(),
        ].join(","),
      );

      reply
        .header("Content-Type", "text/csv; charset=utf-8")
        .header("Content-Disposition", 'attachment; filename="pomiary.csv"');

      return [header, ...lines].join("\n");
    },
  );

  /* ---- Usunięcie nieudanej serii ---- */
  app.delete(
    "/run/:runId",
    {
      schema: {
        tags: ["metrics"],
        params: Type.Object({ runId: Type.String() }),
        response: { 200: Type.Object({ deleted: Type.Integer() }) },
      },
    },
    async (request) => {
      const res = await app.prisma.measurement.deleteMany({
        where: { runId: request.params.runId },
      });
      return { deleted: res.count };
    },
  );

  /* ---- Usunięcie całej sesji ---- */
  app.delete(
    "/session/:sessionId",
    {
      schema: {
        tags: ["metrics"],
        params: Type.Object({ sessionId: Type.String() }),
        response: { 200: Type.Object({ deleted: Type.Integer() }) },
      },
    },
    async (request) => {
      const res = await app.prisma.measurement.deleteMany({
        where: { sessionId: request.params.sessionId },
      });
      return { deleted: res.count };
    },
  );
};
