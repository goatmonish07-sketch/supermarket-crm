import { getRequestContext } from "@cloudflare/next-on-pages";

/**
 * Lightweight direct-D1 data access. Replaces Prisma at runtime so the app
 * stays well under Cloudflare's per-request CPU budget (no WASM query engine).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type D1 = any;

export function d1(): D1 {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (getRequestContext().env as any).DB;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const stmt = d1().prepare(sql);
  const bound = params.length ? stmt.bind(...params) : stmt;
  const res = await bound.all();
  return (res.results ?? []) as T[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function queryFirst<T = any>(sql: string, params: any[] = []): Promise<T | null> {
  const stmt = d1().prepare(sql);
  const bound = params.length ? stmt.bind(...params) : stmt;
  const row = await bound.first();
  return (row ?? null) as T | null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function execute(sql: string, params: any[] = []): Promise<void> {
  const stmt = d1().prepare(sql);
  const bound = params.length ? stmt.bind(...params) : stmt;
  await bound.run();
}

/** Run several prepared statements as a D1 batch (atomic per-statement). */
export async function batch(statements: { sql: string; params?: unknown[] }[]): Promise<void> {
  const db = d1();
  const prepared = statements.map((s) =>
    s.params?.length ? db.prepare(s.sql).bind(...s.params) : db.prepare(s.sql),
  );
  await db.batch(prepared);
}

let counter = 0;
/** Compact unique id (no external deps). */
export function newId(prefix: string): string {
  counter = (counter + 1) % 100000;
  const rand =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(16).slice(2);
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${rand.slice(0, 8)}`;
}

export function nowSql(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}
