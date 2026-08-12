import type { FastifyPluginAsyncTypebox } from "@fastify/type-provider-typebox";
import {
  RegisterBody,
  LoginBody,
  AuthResponse,
  UserDto,
} from "./auth.schemas.js";
import { register, verifyCredentials } from "./auth.service.js";
import { NotFound } from "../../lib/errors.js";

export const authRoutes: FastifyPluginAsyncTypebox = async (app) => {
  app.post(
    "/register",
    {
      schema: {
        tags: ["auth"],
        body: RegisterBody,
        response: { 201: AuthResponse },
      },
    },
    async (request, reply) => {
      const user = await register(app.prisma, request.body);
      const token = app.jwt.sign({ sub: user.id, email: user.email });
      reply.code(201);
      return { token, user };
    },
  );

  app.post(
    "/login",
    {
      schema: {
        tags: ["auth"],
        body: LoginBody,
        response: { 200: AuthResponse },
      },
    },
    async (request) => {
      const user = await verifyCredentials(
        app.prisma,
        request.body.email,
        request.body.password,
      );
      return { token: app.jwt.sign({ sub: user.id, email: user.email }), user };
    },
  );

  app.get(
    "/me",
    {
      onRequest: [app.authenticate], // ← strażnik
      schema: { tags: ["auth"], response: { 200: UserDto } },
    },
    async (request) => {
      const user = await app.prisma.user.findUnique({
        where: { id: request.user.sub },
      });
      if (!user) throw NotFound("Użytkownik");
      return { id: user.id, email: user.email, fullName: user.fullName };
    },
  );
};
