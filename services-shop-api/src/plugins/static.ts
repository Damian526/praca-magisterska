import fp from "fastify-plugin";
import fastifyStatic from "@fastify/static";
import { join } from "node:path";

export default fp(async (app) => {
  await app.register(fastifyStatic, {
    root: join(process.cwd(), "static"),
    prefix: "/static/",
    // 1 rok cache — obrazy się nie zmieniają wiec stabilny cache
    maxAge: "365d",
    immutable: true,
  });
});
