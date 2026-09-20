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
  app.addHook("onRequest", app.authenticate);

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
        request.user.sub,
        request.body,
      );
      reply.code(201);
      return order;
    },
  );

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
      return getOrder(app.prisma, request.user.sub, request.params.id);
    },
  );
};
