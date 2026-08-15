import type { PrismaClient } from "@prisma/client";
import { BadRequest, NotFound } from "../../lib/errors.js";

type CreateOrderInput = {
  items: Array<{ serviceId: string; quantity: number }>;
  customerName: string;
  customerEmail: string;
};

export async function createOrder(
  prisma: PrismaClient,
  userId: string,
  input: CreateOrderInput,
) {
  // 1. Pobierz aktualne ceny Z BAZY, nie od klienta.
  //    Nigdy nie ufaj cenie przysłanej przez aplikację.
  const ids = input.items.map((i) => i.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: ids } },
  });

  if (services.length !== ids.length) {
    throw BadRequest("Jedna lub więcej usług nie istnieje");
  }

  const priceMap = new Map(services.map((s) => [s.id, s.priceCents]));
  const totalCents = input.items.reduce(
    (sum, i) => sum + priceMap.get(i.serviceId)! * i.quantity,
    0,
  );

  // 2. Jedna transakcja: zamówienie + pozycje
  const order = await prisma.order.create({
    data: {
      userId,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      totalCents,
      items: {
        create: input.items.map((i) => ({
          serviceId: i.serviceId,
          quantity: i.quantity,
          unitPriceCents: priceMap.get(i.serviceId)!,
        })),
      },
    },
    include: { items: { include: { service: true } } },
  });

  return toOrderDto(order);
}

export async function listOrders(
  prisma: PrismaClient,
  userId: string,
  page: number,
  limit: number,
) {
  const [orders, total] = await prisma.$transaction([
    prisma.order.findMany({
      where: { userId },
      include: { items: { include: { service: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.order.count({ where: { userId } }),
  ]);

  return {
    data: orders.map(toOrderDto),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getOrder(
  prisma: PrismaClient,
  userId: string,
  id: string,
) {
  const order = await prisma.order.findFirst({
    where: { id, userId }, // ← userId w warunku = użytkownik widzi tylko swoje
    include: { items: { include: { service: true } } },
  });
  if (!order) throw NotFound("Zamówienie");
  return toOrderDto(order);
}

function toOrderDto(order: any) {
  return {
    id: order.id,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    total: order.totalCents / 100,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    items: order.items.map((it: any) => ({
      serviceId: it.serviceId,
      serviceName: it.service.name,
      quantity: it.quantity,
      unitPrice: it.unitPriceCents / 100,
    })),
  };
}
