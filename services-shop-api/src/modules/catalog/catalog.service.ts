import type { PrismaClient, Service, Category } from "@prisma/client";
import type { ServiceListQuery } from "./catalog.schemas.js";

type ServiceWithCategory = Service & { category: Category };

/** Mapowanie encji bazodanowej na obiekt API */
function toDto(s: ServiceWithCategory) {
  return {
    id: s.id,
    name: s.name,
    description: s.description,
    categoryId: s.categoryId,
    categoryName: s.category.name,
    price: s.priceCents / 100,
    deliveryTime: s.deliveryTime,
    imageUrl: s.imageUrl,
    rating: s.rating,
  };
}

const ORDER_BY = {
  default: { sortOrder: "asc" as const },
  price_asc: { priceCents: "asc" as const },
  price_desc: { priceCents: "desc" as const },
  rating: { rating: "desc" as const },
};

export async function listServices(prisma: PrismaClient, q: ServiceListQuery) {
  const where = {
    ...(q.category ? { category: { slug: q.category } } : {}),
    ...(q.q ? { name: { contains: q.q } } : {}),
  };

  // Dwa zapytania równolegle: dane + licznik.
  // $transaction gwarantuje, że oba widzą ten sam stan bazy.
  const [items, total] = await prisma.$transaction([
    prisma.service.findMany({
      where,
      include: { category: true },
      orderBy: ORDER_BY[q.sort],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
    prisma.service.count({ where }),
  ]);

  return {
    data: items.map(toDto),
    meta: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages: Math.ceil(total / q.limit),
    },
  };
}

export async function getService(prisma: PrismaClient, id: string) {
  const s = await prisma.service.findUnique({
    where: { id },
    include: { category: true },
  });
  return s ? toDto(s) : null;
}

export async function listCategories(prisma: PrismaClient) {
  const cats = await prisma.category.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { services: true } } },
  });
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    count: c._count.services,
  }));
}
