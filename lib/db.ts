import "server-only";
import { createClient, type Client, type InValue } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS ig_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(user_id, username)
  )`,
  `CREATE TABLE IF NOT EXISTS snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    snapshot_date TEXT NOT NULL,
    followers_json TEXT NOT NULL,
    following_json TEXT NOT NULL,
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

function getClient(): Client {
  if (client) return client;
  const url = process.env.DATABASE_URL || "file:data/app.db";
  if (url.startsWith("file:")) {
    fs.mkdirSync(path.dirname(path.resolve(url.slice("file:".length))), { recursive: true });
  }
  client = createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  return client;
}

async function getDb(): Promise<Client> {
  const c = getClient();
  ready ??= c.batch(SCHEMA, "write").then(() => undefined);
  await ready;
  return c;
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
