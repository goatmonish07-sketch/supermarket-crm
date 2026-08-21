import { PrismaClient } from "@prisma/client";
import { PrismaD1 } from "@prisma/adapter-d1";
import { getRequestContext } from "@cloudflare/next-on-pages";

/**
 * Build a Prisma client bound to the Cloudflare D1 database for the current
 * request. On Cloudflare (and in `next dev` via the dev-platform hook) the D1
 * binding is exposed as `env.DB`. A fresh client per request is the correct
 * pattern on Workers/D1 — there is no long-lived connection to pool.
 */
export function getDb(): PrismaClient {
  const { env } = getRequestContext();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d1 = (env as any).DB;
  return new PrismaClient({ adapter: new PrismaD1(d1) });
}

/**
 * Request-scoped Prisma proxy. Accessing any property resolves a D1-bound
 * client for the current request, so existing `import { prisma }` call sites
 * keep working unchanged (e.g. `prisma.invoice.findMany()`).
 * The binding is only resolved at access time (request scope), never at module
 * load, so the build's static analysis never touches Cloudflare context.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getDb();
    const value = Reflect.get(client as object, prop, receiver);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
