import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
  {
    id: "cat_01",
    name: "Konsultacje IT",
    slug: "konsultacje-it",
    sortOrder: 1,
  },
  {
    id: "cat_02",
    name: "Projekty graficzne",
    slug: "projekty-graficzne",
    sortOrder: 2,
  },
  {
    id: "cat_03",
    name: "Analizy danych",
    slug: "analizy-danych",
    sortOrder: 3,
  },
  { id: "cat_04", name: "Doradztwo", slug: "doradztwo", sortOrder: 4 },
  { id: "cat_05", name: "Wdrożenia", slug: "wdrozenia", sortOrder: 5 },
];

/**
 * Generator liczb pseudolosowych ze STAŁYM ziarnem (LCG).
 * Math.random() dałby inne dane przy każdym uruchomieniu seeda,
 * co złamałoby powtarzalność eksperymentu.
 * Ten generator zawsze zwróci tę samą sekwencję.
 */
function makeRng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

const TOTAL_SERVICES = 500;

async function main() {
  console.log("Czyszczenie bazy...");
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.service.deleteMany();
  await prisma.category.deleteMany();

  console.log("Kategorie...");
  await prisma.category.createMany({ data: CATEGORIES });

  console.log(`Usługi (${TOTAL_SERVICES})...`);
  const rng = makeRng(20260101); // ziarno = data, byle STAŁE
  const services = [];

  for (let i = 1; i <= TOTAL_SERVICES; i++) {
    const num = String(i).padStart(3, "0");
    const category = CATEGORIES[i % CATEGORIES.length];

    services.push({
      id: `srv_${num}`,
      name: `${category.name} — pakiet ${num}`,
      // opis o stałej długości: identyczny koszt renderowania dla każdego elementu
      description:
        `Usługa nr ${num}. ` + "Szczegółowy opis zakresu prac. ".repeat(8),
      categoryId: category.id,
      priceCents: 9900 + Math.floor(rng() * 400) * 100,
      deliveryTime: ["24h", "48h", "72h", "7 dni"][i % 4],
      imageUrl: `/static/images/srv_${String((i % 20) + 1).padStart(2, "0")}.jpg`,
      rating: Math.round((3 + rng() * 2) * 10) / 10,
      sortOrder: i,
    });
  }

  await prisma.service.createMany({ data: services });
  console.log("Gotowe.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
