import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  CreateOrderBody,
  OrderDto,
  OrderListQuery,
  OrderListResponse,
  OrderIdParams,
} from "./orders.schemas.js";
import { createOrder, listOrders, getOrder } from "./orders.service.js";

export const ordersRoutes: FastifyPluginAsyncTypebox = async (app) => {
  // ⭐ Hook na poziomie CAŁEGO modułu.
  // Dzięki enkapsulacji (rozdz. 0.2) obowiązuje wyłącznie wewnątrz
  // tego pluginu — moduł katalogu pozostaje publiczny.
  // Nie musisz powtarzać `onRequest` przy każdej trasie osobno.
  app.addHook("onRequest", app.authenticate);

  /* ---- POST /api/orders ---- */
  app.post(
    "/",
    {
      schema: {
        tags: ["orders"],
        summary: "Tworzy nowe zamówienie",
        security: [{ bearerAuth: [] }],
        body: CreateOrderBody,
        response: { 201: OrderDto },
      },
    },
    async (request, reply) => {
      const order = await createOrder(
        app.prisma,
        request.user.sub, // userId z tokenu JWT, NIE z ciała żądania
        request.body,
      );
      reply.code(201);
      return order;
    },
  );

  /* ---- GET /api/orders ---- */
  app.get(
    "/",
    {
      schema: {
        tags: ["orders"],
        summary: "Historia zamówień zalogowanego użytkownika",
        security: [{ bearerAuth: [] }],
        querystring: OrderListQuery,
        response: { 200: OrderListResponse },
      },
    },
    async (request) => {
      return listOrders(
        app.prisma,
        request.user.sub,
        request.query.page,
        request.query.limit,
      );
    },
  );

  /* ---- GET /api/orders/:id ---- */
  app.get(
    "/:id",
    {
      schema: {
        tags: ["orders"],
        summary: "Szczegóły zamówienia",
        security: [{ bearerAuth: [] }],
        params: OrderIdParams,
        response: { 200: OrderDto },
      },
    },
    async (request) => {
      // getOrder rzuci NotFound, jeśli zamówienie nie należy do użytkownika
      return getOrder(app.prisma, request.user.sub, request.params.id);
    },
  );
};
