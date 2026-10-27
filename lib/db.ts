import "server-only";
import { createClient, type Client, type InValue } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

// 로그인 관련 테이블(user, session, account, verification, rateLimit)은 Better Auth가 따로 만든다.
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS ig_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, username)
  )`,
  `CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    snapshot_date TEXT NOT NULL,
    lists BLOB NOT NULL,
    follower_count INTEGER NOT NULL,
    following_count INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(account_id, snapshot_date)
  )`,
  `CREATE TABLE IF NOT EXISTS exceptions (
    account_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    PRIMARY KEY(account_id, username)
  )`,
];

let client: Client | null = null;
let ready: Promise<void> | null = null;

export function dbClient(): Client {
  if (client) return client;
  const url = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "file:data/app.db";
  if (url.startsWith("file:")) {
    fs.mkdirSync(path.dirname(path.resolve(url.slice("file:".length))), { recursive: true });
  }
  client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN });
  return client;
}

/** 테이블이 없으면 만든다. 서버 인스턴스마다 처음 한 번만 실제로 실행된다. */
export function ensureDb(): Promise<void> {
  ready ??= (async () => {
    await dbClient().batch(SCHEMA, "write");
    const [{ getMigrations }, { authOptions }] = await Promise.all([
      import("better-auth/db/migration"),
      import("./auth"),
    ]);
    const { runMigrations } = await getMigrations(authOptions);
    await runMigrations();
  })().catch((err) => {
    ready = null;
    throw err;
  });
  return ready;
}

async function getDb(): Promise<Client> {
  await ensureDb();
  return dbClient();
}

export async function all<T>(sql: string, args: InValue[] = []): Promise<T[]> {
  const res = await (await getDb()).execute({ sql, args });
  return res.rows as unknown as T[];
}

export async function get<T>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  return (await all<T>(sql, args))[0];
}

export async function run(sql: string, args: InValue[] = []) {
  return (await getDb()).execute({ sql, args });
}

export async function tx(statements: { sql: string; args: InValue[] }[]) {
  return (await getDb()).batch(statements, "write");
}
