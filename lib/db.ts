import { cache } from "react";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Postgres via the pg driver adapter, so the same code runs on Node and on
// Cloudflare Workers (which cannot run Prisma's native engine).
function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max: isWorkers() ? 1 : 10 }) });
}

function isWorkers() {
  return typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
}

// Workers can't reuse a connection across requests, so build one client per
// request there (React cache() scopes it to the request). On Node, keep one.
const perRequestClient = cache(createClient);
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function client(): PrismaClient {
  if (isWorkers()) return perRequestClient();
  return (globalForPrisma.prisma ??= createClient());
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const c = client();
    const value = Reflect.get(c, prop, c);
    return typeof value === "function" ? value.bind(c) : value;
  },
});
