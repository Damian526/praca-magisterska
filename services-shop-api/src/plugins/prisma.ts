import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (app) => {
  const prisma = new PrismaClient({
    log: app.config.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

  await prisma.$connect();
  app.decorate("prisma", prisma);

  // hook onClose = "posprzątaj przy zamykaniu serwera"
  app.addHook("onClose", async (instance) => {
    await instance.prisma.$disconnect();
  });

  app.log.info("Prisma połączona");
});
