import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { get, run } from "./db";

const COOKIE = "cu_session";
const SESSION_DAYS = 30;

export type User = { id: number; email: string; created_at: number };

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export const hashPassword = (pw: string) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);

export async function createSession(userId: number) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expires = Date.now() + SESSION_DAYS * 86400_000;
  await run("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)", [
    sha256(token),
    userId,
    expires,
  ]);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await run("DELETE FROM sessions WHERE token_hash = ?", [sha256(token)]);
  jar.delete(COOKIE);
}

export const getUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const user = await get<User & { expires_at: number }>(
    `SELECT u.id, u.email, u.created_at, s.expires_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?`,
    [sha256(token)],
  );
  if (!user || user.expires_at < Date.now()) return null;
  return { id: user.id, email: user.email, created_at: user.created_at };
});

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
