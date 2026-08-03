import fp from "fastify-plugin";
import fastifyEnv from "@fastify/env";
import { Type } from "@sinclair/typebox";

const schema = Type.Object({
  NODE_ENV: Type.String({ default: "development" }),
  PORT: Type.Number({ default: 3000 }),
  HOST: Type.String({ default: "0.0.0.0" }),
  DATABASE_URL: Type.String(),
  JWT_SECRET: Type.String({ minLength: 32 }),
  ADMIN_TOKEN: Type.String({ minLength: 8 }),
  LOG_LEVEL: Type.String({ default: "info" }),
  RATE_LIMIT_MAX: Type.Number({ default: 1000 }),
  TEST_MODE: Type.Number({ default: 0 }),
});

// Informujemy TypeScript, że app.config będzie istnieć i jakiego jest typu
declare module "fastify" {
  interface FastifyInstance {
    config: {
      NODE_ENV: string;
      PORT: number;
      HOST: string;
      DATABASE_URL: string;
      JWT_SECRET: string;
      ADMIN_TOKEN: string;
      LOG_LEVEL: string;
      RATE_LIMIT_MAX: number;
      TEST_MODE: number;
    };
  }
}

export default fp(async (app) => {
  await app.register(fastifyEnv, {
    schema,
    dotenv: true, // wczytaj plik .env
    confKey: "config", // wynik trafi do app.config
  });
});
