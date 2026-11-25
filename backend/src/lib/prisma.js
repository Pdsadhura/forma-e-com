import { PrismaClient } from "@prisma/client";

let client;

export function getPrisma() {
  if (!client) {
    client = new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }
  return client;
}

export async function disconnectPrisma() {
  if (client) {
    await client.$disconnect();
    client = undefined;
  }
}
