import "server-only";
import { notFound } from "next/navigation";
import { all, get } from "./db";
import { summarize, toMap, type Snapshot, type SnapshotSummary } from "./analysis";
import type { Entry } from "./instagram";

export type Account = { id: number; user_id: number; username: string; created_at: number };

export const MAX_ACCOUNTS = 10;

export async function getOwnedAccount(userId: number, accountId: number) {
  const account = await get<Account>("SELECT * FROM ig_accounts WHERE id = ? AND user_id = ?", [
    accountId,
    userId,
  ]);
  if (!account) notFound();
  return account;
}

type SnapshotRow = { id: number; snapshot_date: string; followers_json: string; following_json: string };

export async function loadSnapshots(accountId: number): Promise<Snapshot[]> {
  const rows = await all<SnapshotRow>(
    `SELECT id, snapshot_date, followers_json, following_json
       FROM snapshots WHERE account_id = ? ORDER BY snapshot_date ASC`,
    [accountId],
  );
  return rows.map((r) => ({
    id: r.id,
    date: r.snapshot_date,
    followers: toMap(JSON.parse(r.followers_json) as Entry[]),
    following: toMap(JSON.parse(r.following_json) as Entry[]),
  }));
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

export async function listAccountCards(userId: number): Promise<AccountCard[]> {
  const accounts = await all<Account>("SELECT * FROM ig_accounts WHERE user_id = ? ORDER BY created_at ASC", [userId]);
  return Promise.all(
    accounts.map(async (a) => {
      // 최근 두 개만 있으면 카드에 필요한 숫자(현재 값과 직전 대비 변화)를 모두 계산할 수 있다.
      const rows = await all<SnapshotRow>(
        `SELECT id, snapshot_date, followers_json, following_json
           FROM snapshots WHERE account_id = ? ORDER BY snapshot_date DESC LIMIT 2`,
        [a.id],
      );
      const count = await get<{ n: number }>("SELECT COUNT(*) AS n FROM snapshots WHERE account_id = ?", [a.id]);
      const snaps = rows.reverse().map((r) => ({
        id: r.id,
        date: r.snapshot_date,
        followers: toMap(JSON.parse(r.followers_json)),
        following: toMap(JSON.parse(r.following_json)),
      }));
      const summaries = summarize(snaps, await loadExceptions(a.id));
      return {
        ...a,
        snapshotCount: Number(count?.n ?? 0),
        latest: summaries.at(-1) ?? null,
        previous: summaries.length > 1 ? summaries[0] : null,
      };
    }),
  );
}
