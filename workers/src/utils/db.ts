/**
 * Database utilities for Cloudflare D1
 */

/**
 * Execute a query and return all results
 */
export async function query<T = any>(
  db: D1Database,
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const result = await db.prepare(sql).bind(...params).all();
  return result.results as T[];
}

/**
 * Execute a query and return the first result
 */
export async function queryOne<T = any>(
  db: D1Database,
  sql: string,
  params: any[] = []
): Promise<T | null> {
  const result = await db.prepare(sql).bind(...params).first();
  return result as T | null;
}

/**
 * Execute a mutation (INSERT, UPDATE, DELETE)
 */
export async function execute(
  db: D1Database,
  sql: string,
  params: any[] = []
): Promise<D1Result> {
  return await db.prepare(sql).bind(...params).run();
}

/**
 * Get current Unix timestamp (seconds)
 */
export function now(): number {
  return Math.floor(Date.now() / 1000);
}

/**
 * Generate a unique ID
 */
export function generateId(prefix?: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return prefix ? `${prefix}-${timestamp}-${random}` : `${timestamp}-${random}`;
}

