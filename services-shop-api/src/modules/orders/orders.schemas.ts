import { Type, type Static } from "@sinclair/typebox";

/* ---------- Wejście: tworzenie zamówienia ---------- */

export const CreateOrderItem = Type.Object({
  serviceId: Type.String({ pattern: "^srv_[0-9]{3,}$" }),
  quantity: Type.Integer({ minimum: 1, maximum: 99 }),
});

export const CreateOrderBody = Type.Object({
  items: Type.Array(CreateOrderItem, { minItems: 1, maxItems: 50 }),
  customerName: Type.String({ minLength: 2, maxLength: 100 }),
  customerEmail: Type.String({ format: "email", maxLength: 120 }),
});

/* ---------- Wyjście ---------- */

export const OrderItemDto = Type.Object({
  serviceId: Type.String(),
  serviceName: Type.String(),
  quantity: Type.Integer(),
  unitPrice: Type.Number(),
});

export const OrderStatusEnum = Type.Union([
  Type.Literal("NEW"),
  Type.Literal("PAID"),
  Type.Literal("IN_PROGRESS"),
  Type.Literal("COMPLETED"),
  Type.Literal("CANCELLED"),
]);

export const OrderDto = Type.Object({
  id: Type.String(),
  customerName: Type.String(),
  customerEmail: Type.String(),
  total: Type.Number(),
  status: OrderStatusEnum,
  createdAt: Type.String({ format: "date-time" }),
  items: Type.Array(OrderItemDto),
});

// Ten sam kształt co ServiceListResponse — obie aplikacje mobilne
// mogą użyć DOKŁADNIE tego samego kodu obsługi paginacji.
export const OrderListResponse = Type.Object({
  data: Type.Array(OrderDto),
  meta: Type.Object({
    page: Type.Integer(),
    limit: Type.Integer(),
    total: Type.Integer(),
    totalPages: Type.Integer(),
  }),
});

/* ---------- Parametry ---------- */

export const OrderListQuery = Type.Object({
  page: Type.Integer({ minimum: 1, default: 1 }),
  limit: Type.Integer({ minimum: 1, maximum: 100, default: 20 }),
});

export const OrderIdParams = Type.Object({
  id: Type.String({ format: "uuid" }),
});

export type CreateOrderBody = Static<typeof CreateOrderBody>;
