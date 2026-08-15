import Fastify from "fastify";
import { TypeBoxTypeProvider } from "@fastify/type-provider-typebox";

import envPlugin from "./config/env.js";
import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import securityPlugin from "./plugins/security.js";
import serverTimingPlugin from "./plugins/serverTiming.js";
import errorHandlerPlugin from "./plugins/errorHandler.js";
import swaggerPlugin from "./plugins/swagger.js";

import { catalogRoutes } from "./modules/catalog/catalog.routes.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { metricsRoutes } from "./modules/metrics/metrics.routes.js";
import { opsRoutes } from "./modules/ops/ops.routes.js";

export async function buildApp() {
  const app = Fastify({ logger: true }).withTypeProvider<TypeBoxTypeProvider>();

  // Kolejność ma znaczenie: env musi wczytać się pierwszy (inne pluginy
  // czytają app.config), swagger musi zarejestrować się przed trasami,
  // żeby przechwycić wszystkie schematy przez hook onRoute.
  await app.register(envPlugin);
  await app.register(prismaPlugin);
  await app.register(authPlugin);
  await app.register(securityPlugin);
  await app.register(serverTimingPlugin);
  await app.register(errorHandlerPlugin);
  await app.register(swaggerPlugin);

  app.get("/api/health", async () => ({ status: "ok" }));

  await app.register(catalogRoutes, { prefix: "/api/catalog" });
  await app.register(authRoutes, { prefix: "/api/auth" });
  await app.register(metricsRoutes, { prefix: "/api/metrics" });
  await app.register(opsRoutes, { prefix: "/api/ops" });

  return app;
}
