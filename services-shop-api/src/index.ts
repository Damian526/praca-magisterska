import { buildApp } from "./app.js";

const app = await buildApp();

await app.listen({ port: app.config.PORT, host: app.config.HOST });
