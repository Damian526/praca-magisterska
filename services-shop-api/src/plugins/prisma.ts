import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(async (app) => {
  const adapter = new PrismaPg({ connectionString: app.config.DATABASE_URL });
  const prisma = new PrismaClient({
    adapter,
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
