import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Conflict, Unauthorized } from "../../lib/errors.js";

const ROUNDS = 10;

export async function register(
  prisma: PrismaClient,
  data: { email: string; password: string; fullName: string },
) {
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) throw Conflict("Użytkownik o tym adresie email już istnieje");

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: await bcrypt.hash(data.password, ROUNDS),
      fullName: data.fullName,
    },
  });
  return { id: user.id, email: user.email, fullName: user.fullName };
}

export async function verifyCredentials(
  prisma: PrismaClient,
  email: string,
  password: string,
) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Ten sam komunikat dla "nie ma użytkownika" i "złe hasło"
  // — nie zdradzamy, które konta istnieją.
  if (!user) throw Unauthorized("Nieprawidłowy email lub hasło");

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) throw Unauthorized("Nieprawidłowy email lub hasło");

  return { id: user.id, email: user.email, fullName: user.fullName };
}
