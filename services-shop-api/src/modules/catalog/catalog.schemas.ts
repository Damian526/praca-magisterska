import { Type, type Static } from "@sinclair/typebox";

/* ---------- Model odpowiedzi ---------- */

export const ServiceDto = Type.Object({
  id: Type.String(),
  name: Type.String(),
  description: Type.String(),
  categoryId: Type.String(),
  categoryName: Type.String(),
  price: Type.Number(),
  deliveryTime: Type.String(),
  imageUrl: Type.String(),
  rating: Type.Number(),
});

export const CategoryDto = Type.Object({
  id: Type.String(),
  name: Type.String(),
  slug: Type.String(),
  count: Type.Integer(),
});

export const PaginationMeta = Type.Object({
  page: Type.Integer(),
  limit: Type.Integer(),
  total: Type.Integer(),
  totalPages: Type.Integer(),
});

export const ServiceListResponse = Type.Object({
  data: Type.Array(ServiceDto),
  meta: PaginationMeta,
});

/* ---------- Parametry zapytania ---------- */

export const ServiceListQuery = Type.Object({
  category: Type.Optional(Type.String()),
  q: Type.Optional(Type.String({ maxLength: 100 })),
  page: Type.Integer({ minimum: 1, default: 1 }),
  limit: Type.Integer({ minimum: 1, maximum: 500, default: 30 }),
  sort: Type.Union(
    [
      Type.Literal("default"),
      Type.Literal("price_asc"),
      Type.Literal("price_desc"),
      Type.Literal("rating"),
    ],
    { default: "default" },
  ),
  // tylko w TEST_MODE — sztuczne opóźnienie do analizy jakościowej
  delay: Type.Optional(Type.Integer({ minimum: 0, maximum: 5000 })),
});

export const ServiceIdParams = Type.Object({
  id: Type.String({ pattern: "^srv_[0-9]{3,}$" }),
});

export type ServiceListQuery = Static<typeof ServiceListQuery>;
