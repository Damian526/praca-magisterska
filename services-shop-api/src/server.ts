import Fastify, { type FastifyInstance } from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

import envPlugin from "./config/env.js";
import prismaPlugin from "./plugins/prisma.js";
import serverTiming from "./plugins/serverTiming.js";
import securityPlugin from "./plugins/security.js";
import authPlugin from "./plugins/auth.js";
import staticPlugin from "./plugins/static.js";
import swaggerPlugin from "./plugins/swagger.js";
import errorHandler from "./plugins/errorHandler.js";

import { authRoutes } from "./modules/auth/auth.routes.js";
import { catalogRoutes } from "./modules/catalog/catalog.routes.js";
import { ordersRoutes } from "./modules/orders/orders.routes.js";
import { metricsRoutes } from "./modules/metrics/metrics.routes.js";
import { opsRoutes } from "./modules/ops/ops.routes.js";

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? "info",
      transport:
        process.env.NODE_ENV === "development"
          ? { target: "pino-pretty" }
          : undefined,
    },
    // wyłącza wbudowany logger żądań — mniej narzutu podczas pomiarów
    disableRequestLogging: process.env.NODE_ENV === "production",
    // rozdzielczość nanosekundowa dla wewnętrznych pomiarów Fastify
    trustProxy: false,
  }).withTypeProvider<TypeBoxTypeProvider>();

  // 1. konfiguracja — reszta jej potrzebuje
  await app.register(envPlugin);

  // 2. pomiar czasu — jak najwcześniej, żeby objął całą obsługę
  await app.register(serverTiming);

  // 3. infrastruktura
  await app.register(errorHandler);
  await app.register(prismaPlugin);
  await app.register(securityPlugin);
  await app.register(authPlugin);
  await app.register(staticPlugin);
  await app.register(swaggerPlugin);

  // 4. trasy z prefiksami
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(catalogRoutes, { prefix: "/api" });
  await app.register(ordersRoutes, { prefix: "/api/orders" });
  await app.register(metricsRoutes, { prefix: "/api/metrics" });
  await app.register(opsRoutes, { prefix: "/api" });

  return app;
}
