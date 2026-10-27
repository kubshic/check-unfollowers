"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { all, get, run, tx } from "@/lib/db";
import { createSession, destroySession, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { getOwnedAccount, MAX_ACCOUNTS } from "@/lib/data";
import { normalizeUsername, USERNAME_RE, type Entry } from "@/lib/instagram";

export type FormState = { error?: string } | undefined;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

// ---------- 인증 ----------

export async function signup(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!EMAIL_RE.test(email)) return { error: "올바른 이메일 주소를 입력해 주세요." };
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 해요." };
  if (password !== String(fd.get("confirm") ?? "")) return { error: "비밀번호 확인이 일치하지 않아요." };
  if (await get("SELECT 1 FROM users WHERE email = ?", [email])) return { error: "이미 가입된 이메일이에요." };

  const res = await run("INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)", [
    email,
    await hashPassword(password),
    Date.now(),
  ]);
  await createSession(Number(res.lastInsertRowid));
  redirect("/accounts");
}

// 같은 이메일로 10분 안에 5번 틀리면 잠시 막는다 (서버 인스턴스 단위의 가벼운 보호).
const failures = new Map<string, { count: number; until: number }>();

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  const f = failures.get(email);
  if (f && f.count >= 5 && f.until > Date.now()) {
    return { error: "로그인 시도가 너무 많아요. 10분 뒤에 다시 시도해 주세요." };
  }
  const user = await get<{ id: number; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE email = ?",
    [email],
  );
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    const prev = f && f.until > Date.now() ? f.count : 0;
    failures.set(email, { count: prev + 1, until: Date.now() + 10 * 60_000 });
    return { error: "이메일 또는 비밀번호가 올바르지 않아요." };
  }
  failures.delete(email);
  await createSession(user.id);
  redirect("/accounts");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function changePassword(_: FormState, fd: FormData): Promise<FormState & { ok?: boolean }> {
  const user = await requireUser();
  const current = String(fd.get("current") ?? "");
  const next = String(fd.get("next") ?? "");
  const row = await get<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [user.id]);
  if (!row || !(await verifyPassword(current, row.password_hash))) return { error: "현재 비밀번호가 올바르지 않아요." };
  if (next.length < 8) return { error: "새 비밀번호는 8자 이상이어야 해요." };
  await run("UPDATE users SET password_hash = ? WHERE id = ?", [await hashPassword(next), user.id]);
  return { ok: true };
}

export async function deleteUser(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const row = await get<{ password_hash: string }>("SELECT password_hash FROM users WHERE id = ?", [user.id]);
  if (!row || !(await verifyPassword(String(fd.get("password") ?? ""), row.password_hash))) {
    return { error: "비밀번호가 올바르지 않아요." };
  }
  const accountIds = (await all<{ id: number }>("SELECT id FROM ig_accounts WHERE user_id = ?", [user.id])).map(
    (a) => a.id,
  );
  await tx([
    ...accountIds.flatMap((id) => [
      { sql: "DELETE FROM snapshots WHERE account_id = ?", args: [id] },
      { sql: "DELETE FROM exceptions WHERE account_id = ?", args: [id] },
    ]),
    { sql: "DELETE FROM ig_accounts WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM sessions WHERE user_id = ?", args: [user.id] },
    { sql: "DELETE FROM users WHERE id = ?", args: [user.id] },
  ]);
  await destroySession();
  redirect("/");
}

// ---------- 인스타그램 계정 ----------

export async function addAccount(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser();
  const username = normalizeUsername(str(fd, "username"));
  if (!USERNAME_RE.test(username)) {
    return { error: "인스타그램 아이디는 영문 소문자, 숫자, 마침표(.), 밑줄(_)로 30자 이내예요." };
  }
  const count = await get<{ n: number }>("SELECT COUNT(*) AS n FROM ig_accounts WHERE user_id = ?", [user.id]);
  if (Number(count?.n) >= MAX_ACCOUNTS) return { error: `계정은 최대 ${MAX_ACCOUNTS}개까지 등록할 수 있어요.` };
  if (await get("SELECT 1 FROM ig_accounts WHERE user_id = ? AND username = ?", [user.id, username])) {
    return { error: `@${username}은(는) 이미 등록되어 있어요.` };
  }
  const res = await run("INSERT INTO ig_accounts (user_id, username, created_at) VALUES (?, ?, ?)", [
    user.id,
    username,
    Date.now(),
  ]);
  redirect(`/accounts/${res.lastInsertRowid}/upload`);
}

export async function deleteAccount(accountId: number) {
  const user = await requireUser();
  await getOwnedAccount(user.id, accountId);
  await tx([
    { sql: "DELETE FROM snapshots WHERE account_id = ?", args: [accountId] },
    { sql: "DELETE FROM exceptions WHERE account_id = ?", args: [accountId] },
    { sql: "DELETE FROM ig_accounts WHERE id = ?", args: [accountId] },
  ]);
  redirect("/accounts");
}

// ---------- 스냅샷 ----------

export type SaveResult = { ok: true; id: number } | { ok: false; error: string; conflict?: boolean };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanEntries(input: unknown): Entry[] | null {
  if (!Array.isArray(input)) return null;
  const seen = new Map<string, number>();
  for (const item of input) {
    if (!Array.isArray(item) || typeof item[0] !== "string") return null;
    const u = item[0];
    const t = Number.isFinite(item[1]) ? Math.max(0, Math.floor(item[1])) : 0;
    if (USERNAME_RE.test(u) && !seen.has(u)) seen.set(u, t);
  }
  return [...seen];
}

export async function saveSnapshot(
  accountId: number,
  payload: { date: string; followers: Entry[]; following: Entry[]; overwrite?: boolean },
): Promise<SaveResult> {
  const user = await requireUser();
  await getOwnedAccount(user.id, accountId);

  const date = String(payload.date);
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!DATE_RE.test(date) || isNaN(parsed.getTime())) return { ok: false, error: "날짜 형식이 올바르지 않아요." };
  // 시간대 차이를 감안해 하루까지는 허용
  if (parsed.getTime() > Date.now() + 86400_000) return { ok: false, error: "미래 날짜로는 저장할 수 없어요." };

  const followers = cleanEntries(payload.followers);
  const following = cleanEntries(payload.following);
  if (!followers || !following) return { ok: false, error: "목록 데이터가 올바르지 않아요." };
  if (followers.length + following.length === 0) return { ok: false, error: "팔로워와 팔로잉 목록이 모두 비어 있어요." };

  const existing = await get<{ id: number }>("SELECT id FROM snapshots WHERE account_id = ? AND snapshot_date = ?", [
    accountId,
    date,
  ]);
  if (existing && !payload.overwrite) {
    return { ok: false, conflict: true, error: `${date}에 이미 저장된 기록이 있어요.` };
  }

  const args = [JSON.stringify(followers), JSON.stringify(following), followers.length, following.length, Date.now()];
  let id: number;
  if (existing) {
    await run(
      `UPDATE snapshots SET followers_json = ?, following_json = ?, follower_count = ?, following_count = ?, created_at = ?
        WHERE id = ?`,
      [...args, existing.id],
    );
    id = existing.id;
  } else {
    const res = await run(
      `INSERT INTO snapshots (followers_json, following_json, follower_count, following_count, created_at, account_id, snapshot_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [...args, accountId, date],
    );
    id = Number(res.lastInsertRowid);
  }
  revalidatePath(`/accounts/${accountId}`);
  return { ok: true, id };
}

export async function deleteSnapshot(accountId: number, snapshotId: number) {
  const user = await requireUser();
  await getOwnedAccount(user.id, accountId);
  await run("DELETE FROM snapshots WHERE id = ? AND account_id = ?", [snapshotId, accountId]);
  redirect(`/accounts/${accountId}`);
}

export async function setException(accountId: number, username: string, on: boolean) {
  const user = await requireUser();
  await getOwnedAccount(user.id, accountId);
  if (!USERNAME_RE.test(username)) return;
  if (on) {
    await run("INSERT OR IGNORE INTO exceptions (account_id, username, created_at) VALUES (?, ?, ?)", [
      accountId,
      username,
      Date.now(),
    ]);
  } else {
    await run("DELETE FROM exceptions WHERE account_id = ? AND username = ?", [accountId, username]);
  }
  revalidatePath(`/accounts/${accountId}`);
}
