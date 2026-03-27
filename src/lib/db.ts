import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Resolve a usable PostgreSQL connection string.
 * Handles Prisma proxy URLs (prisma+postgres://) by extracting the inner URL.
 */
function resolveConnectionString(): string {
  if (process.env.DIRECT_DATABASE_URL) return process.env.DIRECT_DATABASE_URL;

  const raw =
    process.env.DATABASE_URL ??
    "postgresql://dilling:dilling_dev_2026@localhost:5432/dilling";

  if (raw.startsWith("prisma+postgres://")) {
    try {
      const url = new URL(raw.replace("prisma+postgres://", "https://"));
      const apiKey = url.searchParams.get("api_key");
      if (apiKey) {
        const decoded = JSON.parse(
          Buffer.from(apiKey, "base64url").toString(),
        );
        if (decoded.databaseUrl) return decoded.databaseUrl;
      }
    } catch {
      /* fall through to raw */
    }
  }

  return raw;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Lazy Prisma singleton — the pg Pool and PrismaClient are created on first
 * access rather than at module-import time. This prevents Docker build crashes
 * when no DATABASE_URL is available during static page generation.
 */
function buildPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connStr = resolveConnectionString();
  const pool = new Pool({ connectionString: connStr });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = buildPrisma();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export const db = prisma;
