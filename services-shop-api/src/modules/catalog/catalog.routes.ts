import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import { Type } from "@sinclair/typebox";
import {
  ServiceListQuery,
  ServiceListResponse,
  ServiceDto,
  ServiceIdParams,
  CategoryDto,
} from "./catalog.schemas.js";
import { listServices, getService, listCategories } from "./catalog.service.js";
import { NotFound } from "../../lib/errors.js";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const catalogRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.get(
    "/categories",
    {
      schema: {
        tags: ["catalog"],
        summary: "Lista kategorii usług",
        response: { 200: Type.Array(CategoryDto) },
      },
    },
    async () => {
      return listCategories(app.prisma);
    },
  );

  app.get(
    "/services",
    {
      schema: {
        tags: ["catalog"],
        summary: "Lista usług z paginacją i filtrowaniem",
        querystring: ServiceListQuery,
        response: { 200: ServiceListResponse },
      },
    },
    async (request) => {
      // sztuczne opóźnienie tylko w trybie testowym
      if (app.config.TEST_MODE === 1 && request.query.delay) {
        await sleep(request.query.delay);
      }
      return listServices(app.prisma, request.query);
    },
  );

  app.get(
    "/services/:id",
    {
      schema: {
        tags: ["catalog"],
        summary: "Szczegóły usługi",
        params: ServiceIdParams,
        response: { 200: ServiceDto },
      },
    },
    async (request) => {
      const service = await getService(app.prisma, request.params.id);
      if (!service) throw NotFound("Usługa");
      return service;
    },
  );
};
