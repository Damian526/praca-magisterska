import { buildServer } from "./server.js";

const app = await buildServer();

// Czyste zamknięcie: dokończ trwające żądania,
// rozłącz Prismę, dopiero potem zakończ proces.
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, async () => {
    app.log.info(`Otrzymano ${signal}, zamykam serwer...`);
    await app.close();
    process.exit(0);
  });
}

try {
  await app.listen({
    port: app.config.PORT,
    host: app.config.HOST,
  });
  app.log.info(`Dokumentacja: http://localhost:${app.config.PORT}/docs`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
