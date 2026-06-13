import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error"] : [] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Compatibility helpers
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return prisma.$queryRawUnsafe<T[]>(sql, ...params);
}
export async function queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const rows = await prisma.$queryRawUnsafe<T[]>(sql, ...params);
  return rows[0] ?? null;
}
export async function execute(sql: string, params: any[] = []): Promise<void> {
  await prisma.$executeRawUnsafe(sql, ...params);
}
