import fp from "fastify-plugin";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";

export default fp(async (app) => {
  await app.register(helmet, {
    contentSecurityPolicy: false, // wyłączone, bo serwujemy Swagger UI
  });

  await app.register(cors, {
    origin: true, // odbicie origin nadawcy — OK dla badania lokalnego
    credentials: true,
    exposedHeaders: ["Server-Timing"],
    maxAge: 86400, // ⚠️ cache preflightu na 24h — patrz niżej
  });

  await app.register(rateLimit, {
    max: app.config.RATE_LIMIT_MAX,
    timeWindow: "1 minute",
  });
});
