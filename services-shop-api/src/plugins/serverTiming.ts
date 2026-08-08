import fp from "fastify-plugin";

declare module "fastify" {
  interface FastifyRequest {
    startHrTime: bigint;
  }
}

export default fp(async (app) => {
  // Rezerwujemy miejsce na polu request.startHrTime.
  // Fastify wymaga deklaracji z góry — dzięki temu obiekt request
  // ma stały kształt i silnik V8 może go zoptymalizować.
  app.decorateRequest("startHrTime", 0n);

  app.addHook("onRequest", async (request) => {
    request.startHrTime = process.hrtime.bigint();
  });

  app.addHook("onSend", async (request, reply, payload) => {
    const elapsedNs = process.hrtime.bigint() - request.startHrTime;
    const elapsedMs = Number(elapsedNs) / 1_000_000;

    reply.header("Server-Timing", `app;dur=${elapsedMs.toFixed(3)}`);

    // Dla Ionic (WebView) przeglądarka domyślnie ukrywa niestandardowe
    // nagłówki przed kodem JS. Musimy je jawnie udostępnić.
    reply.header("Access-Control-Expose-Headers", "Server-Timing");

    return payload; // hook onSend MUSI zwrócić payload
  });
});
