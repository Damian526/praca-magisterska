import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import type { FastifyRequest, FastifyReply } from "fastify";

// Informujemy TypeScript, co siedzi w tokenie
declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: { sub: string; email: string };
    user: { sub: string; email: string };
  }
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireAdminToken: (
      req: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
}

export default fp(async (app) => {
  await app.register(jwt, {
    secret: app.config.JWT_SECRET,
    sign: { expiresIn: "30d" }, // długo, żeby token nie wygasł w środku serii pomiarowej
  });

  // Strażnik dla endpointów użytkownika
  app.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch {
        return reply.code(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Nieprawidłowy lub brakujący token",
          },
        });
      }
    },
  );

  // Strażnik dla endpointów badawczych (prosty stały token)
  app.decorate(
    "requireAdminToken",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const header = request.headers["x-admin-token"];
      if (header !== app.config.ADMIN_TOKEN) {
        return reply.code(401).send({
          error: {
            code: "UNAUTHORIZED",
            message: "Nieprawidłowy token administracyjny",
          },
        });
      }
    },
  );
});
