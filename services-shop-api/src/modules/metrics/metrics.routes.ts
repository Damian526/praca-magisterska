import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { Prisma } from "@prisma/client";
import { MetricsBatchBody } from "./metrics.schema.js";

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
          201: Type.Object({ saved: Type.Integer(), runId: Type.String() }),
        },
      },
    },
    async (request, reply) => {
      const b = request.body;

      // Kontrakt API używa czytelnych nazw ('react-native'),
      // baza używa enumów PostgreSQL (REACT_NATIVE). Mapujemy w jednym miejscu.
      const PLATFORM = {
        "react-native": "REACT_NATIVE",
        ionic: "IONIC",
      } as const;
      const BUILD = { release: "RELEASE", debug: "DEBUG" } as const;
      const METRIC = {
        startup_ms: "STARTUP_MS",
        ui_response_ms: "UI_RESPONSE_MS",
        api_request_ms: "API_REQUEST_MS",
        render_ms: "RENDER_MS",
        ram_mb: "RAM_MB",
        cpu_percent: "CPU_PERCENT",
      } as const;

      await app.prisma.measurement.createMany({
        data: b.measurements.map((m) => ({
          runId: b.runId,
          platform: PLATFORM[b.platform],
          deviceModel: b.deviceModel,
          osVersion: b.osVersion,
          buildType: BUILD[b.buildType],
          appVersion: b.appVersion,
          scenario: m.scenario, // S1/S2/S3 — takie same po obu stronach
          metric: METRIC[m.metric],
          iteration: m.iteration,
          value: m.value,
          unit: m.unit,
          serverMs: m.serverMs ?? null,
          extra:
            m.extra === null
              ? Prisma.JsonNull
              : m.extra === undefined
                ? undefined
                : (m.extra as Prisma.InputJsonValue), // JSONB — Prisma wymaga InputJsonValue lub JsonNull
          recordedAt: new Date(m.recordedAt),
        })),
      });

      reply.code(201);
      return { saved: b.measurements.length, runId: b.runId };
    },
  );

  /* ---- Statystyki opisowe ---- */
  app.get(
    "/summary",
    {
      schema: {
        tags: ["metrics"],
        querystring: Type.Object({ runId: Type.Optional(Type.String()) }),
      },
    },
    async (request) => {
      const rows = await app.prisma.measurement.findMany({
        where: request.query.runId ? { runId: request.query.runId } : {},
      });

      // grupowanie: platforma | scenariusz | metryka
      const groups = new Map<string, number[]>();
      for (const r of rows) {
        const key = `${r.platform}|${r.scenario}|${r.metric}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r.value);
      }

      return [...groups.entries()].map(([key, values]) => {
        const [platform, scenario, metric] = key.split("|");
        const sorted = [...values].sort((a, b) => a - b);
        const n = sorted.length;
        const mean = sorted.reduce((a, b) => a + b, 0) / n;
        const variance =
          sorted.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1);

        const percentile = (p: number) =>
          sorted[Math.min(n - 1, Math.floor((p / 100) * n))];

        return {
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
      });
    },
  );

  /* ---- Eksport CSV ---- */
  app.get(
    "/export.csv",
    {
      schema: {
        tags: ["metrics"],
        querystring: Type.Object({ runId: Type.Optional(Type.String()) }),
      },
    },
    async (request, reply) => {
      const rows = await app.prisma.measurement.findMany({
        where: request.query.runId ? { runId: request.query.runId } : {},
        orderBy: [
          { platform: "asc" },
          { scenario: "asc" },
          { metric: "asc" },
          { iteration: "asc" },
        ],
      });

      const header = [
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
        "recorded_at",
      ].join(",");

      const lines = rows.map((r) =>
        [
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
          r.recordedAt.toISOString(),
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
};
