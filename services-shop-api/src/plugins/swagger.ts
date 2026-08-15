import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

export default fp(async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Services Shop API",
        description: "Backend do badania wydajności React Native vs Ionic",
        version: "1.0.0",
      },
      tags: [
        { name: "auth", description: "Uwierzytelnianie" },
        { name: "catalog", description: "Katalog usług" },
        { name: "orders", description: "Zamówienia" },
        { name: "metrics", description: "Infrastruktura pomiarowa" },
        { name: "ops", description: "Operacyjne" },
      ],
    },
  });

  await app.register(swaggerUi, { routePrefix: "/docs" });
});
