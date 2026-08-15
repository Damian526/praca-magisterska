import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);

export const opsRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        tags: ["ops"],
        response: {
          200: Type.Object({
            status: Type.String(),
            uptime: Type.Number(),
            services: Type.Integer(),
          }),
        },
      },
    },
    async () => ({
      status: "ok",
      uptime: Math.round(process.uptime()),
      services: await app.prisma.service.count(),
    }),
  );

  app.get(
    "/warmup",
    {
      schema: { tags: ["ops"] },
    },
    async () => {
      await app.prisma.service.findMany({
        take: 30,
        include: { category: true },
        orderBy: { sortOrder: "asc" },
      });
      await app.prisma.category.findMany();
      return { warmed: true };
    },
  );

  /**
   * SZYBKI reset stanu transakcyjnego przed KAŻDYM powtórzeniem.
   * Kasuje tylko zamówienia — katalog usług i konta zostają.
   */
  app.post(
    "/admin/reseed",
    {
      onRequest: [app.requireAdminToken],
      schema: {
        tags: ["ops"],
        response: {
          200: Type.Object({
            reseeded: Type.Boolean(),
            durationMs: Type.Number(),
          }),
        },
      },
    },
    async () => {
      const t0 = process.hrtime.bigint();

      await app.prisma.$executeRawUnsafe(
        "TRUNCATE TABLE order_items, orders RESTART IDENTITY CASCADE",
      );

      const durationMs = Number(process.hrtime.bigint() - t0) / 1_000_000;
      return { reseeded: true, durationMs: +durationMs.toFixed(3) };
    },
  );

  /**
   * PEŁNY reset — odtwarza takze katalog usług od zera.
   * Wywoluj RAZ przed całą serią, nie między powtórzeniami (trwa ok. 2 s).
   */
  app.post(
    "/admin/full-reset",
    {
      onRequest: [app.requireAdminToken],
      schema: { tags: ["ops"] },
    },
    async () => {
      const t0 = Date.now();
      await run("npx", ["tsx", "prisma/seed.ts"]);
      // odświeżenie statystyk planisty zapytań — bez tego pierwsze zapytania
      // po seedzie mają gorszy plan wykonania i są wolniejsze
      await app.prisma.$executeRawUnsafe("ANALYZE");
      return { fullReset: true, durationMs: Date.now() - t0 };
    },
  );
};
