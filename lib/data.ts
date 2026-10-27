import "server-only";
import zlib from "node:zlib";
import { notFound } from "next/navigation";
import { all, get, tx } from "./db";
import { summarize, toMap, type Snapshot, type SnapshotSummary } from "./analysis";
import type { Entry } from "./instagram";

export type Account = { id: number; user_id: string; username: string; created_at: number };

export const MAX_ACCOUNTS = 10;

// ---------- 스냅샷 목록 압축 ----------
// 아이디 목록은 반복이 많아 brotli로 압축하면 크기가 크게 준다. 저장 용량이 곧 비용이라 압축해 둔다.

type Lists = { followers: Entry[]; following: Entry[] };

export function encodeLists(lists: Lists): Uint8Array {
  return zlib.brotliCompressSync(JSON.stringify(lists), {
    params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 9 },
  });
}

function decodeLists(blob: ArrayBuffer | Uint8Array): Lists {
  return JSON.parse(zlib.brotliDecompressSync(Buffer.from(blob as ArrayBuffer)).toString("utf8"));
}

// ---------- 조회 ----------

export async function getOwnedAccount(userId: string, accountId: number) {
  const account = await get<Account>("SELECT * FROM ig_accounts WHERE id = ? AND user_id = ?", [
    accountId,
    userId,
  ]);
  if (!account) notFound();
  return account;
}

type SnapshotRow = { id: number; snapshot_date: string; lists: ArrayBuffer };

function toSnapshot(r: SnapshotRow): Snapshot {
  const { followers, following } = decodeLists(r.lists);
  return { id: r.id, date: r.snapshot_date, followers: toMap(followers), following: toMap(following) };
}

export async function loadSnapshots(accountId: number): Promise<Snapshot[]> {
  const rows = await all<SnapshotRow>(
    "SELECT id, snapshot_date, lists FROM snapshots WHERE account_id = ? ORDER BY snapshot_date ASC",
    [accountId],
  );
  return rows.map(toSnapshot);
}

export async function loadExceptions(accountId: number) {
  const rows = await all<{ username: string }>("SELECT username FROM exceptions WHERE account_id = ?", [accountId]);
  return new Set(rows.map((r) => r.username));
}

export type AccountCard = Account & {
  snapshotCount: number;
  latest: SnapshotSummary | null;
  previous: SnapshotSummary | null;
};

export async function listAccountCards(userId: string): Promise<AccountCard[]> {
  const accounts = await all<Account>("SELECT * FROM ig_accounts WHERE user_id = ? ORDER BY created_at ASC", [userId]);
  return Promise.all(
    accounts.map(async (a) => {
      // 최근 두 개만 있으면 카드에 필요한 숫자(현재 값과 직전 대비 변화)를 모두 계산할 수 있다.
      const rows = await all<SnapshotRow>(
        "SELECT id, snapshot_date, lists FROM snapshots WHERE account_id = ? ORDER BY snapshot_date DESC LIMIT 2",
        [a.id],
      );
      const count = await get<{ n: number }>("SELECT COUNT(*) AS n FROM snapshots WHERE account_id = ?", [a.id]);
      const summaries = summarize(rows.reverse().map(toSnapshot), await loadExceptions(a.id));
      return {
        ...a,
        snapshotCount: Number(count?.n ?? 0),
        latest: summaries.at(-1) ?? null,
        previous: summaries.length > 1 ? summaries[0] : null,
      };
    }),
  );
}

// ---------- 삭제 ----------

export async function deleteAccountData(accountId: number) {
  await tx([
    { sql: "DELETE FROM snapshots WHERE account_id = ?", args: [accountId] },
    { sql: "DELETE FROM exceptions WHERE account_id = ?", args: [accountId] },
    { sql: "DELETE FROM ig_accounts WHERE id = ?", args: [accountId] },
  ]);
}

/** 회원 탈퇴 시 Better Auth가 사용자를 지우기 직전에 호출한다. */
export async function deleteUserData(userId: string) {
  const accounts = await all<{ id: number }>("SELECT id FROM ig_accounts WHERE user_id = ?", [userId]);
  for (const a of accounts) await deleteAccountData(a.id);
}
