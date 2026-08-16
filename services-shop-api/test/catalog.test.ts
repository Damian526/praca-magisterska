import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildServer } from "../src/server.js";
import type { FastifyInstance } from "fastify";

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildServer();
});
afterAll(async () => {
  await app.close();
});

describe("GET /api/services", () => {
  it("zwraca domyślnie 30 usług", async () => {
    const res = await app.inject({ method: "GET", url: "/api/services" });
    expect(res.statusCode).toBe(200);

    const body = res.json();
    expect(body.data).toHaveLength(30);
    expect(body.meta.total).toBe(500);
  });

  it("odrzuca limit powyżej 500", async () => {
    const res = await app.inject({ url: "/api/services?limit=9999" });
    expect(res.statusCode).toBe(400);
  });

  it("zwraca 404 dla nieistniejącej usługi", async () => {
    const res = await app.inject({ url: "/api/services/srv_999999" });
    expect(res.statusCode).toBe(404);
  });

  it("dodaje nagłówek Server-Timing", async () => {
    const res = await app.inject({ url: "/api/services" });
    expect(res.headers["server-timing"]).toMatch(/^app;dur=/);
  });

  it("zwraca STAŁĄ kolejność elementów przy powtórzeniach", async () => {
    // to jest test WARUNKU EKSPERYMENTU, nie tylko funkcjonalności
    const a = (await app.inject({ url: "/api/services?limit=50" })).json();
    const b = (await app.inject({ url: "/api/services?limit=50" })).json();
    expect(a.data.map((s: any) => s.id)).toEqual(b.data.map((s: any) => s.id));
  });
});
