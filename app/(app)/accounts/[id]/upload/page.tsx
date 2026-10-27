import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { get, all } from "@/lib/db";
import { getOwnedAccount } from "@/lib/data";
import { ExportGuide } from "@/components/ExportGuide";
import { UploadFlow } from "@/components/UploadFlow";

export const metadata = { title: "새로 체크하기 — 맞팔체크" };

export default async function UploadPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const account = await getOwnedAccount(user.id, Number((await params).id));
  const latest = await get<{ snapshot_date: string; follower_count: number; following_count: number }>(
    `SELECT snapshot_date, follower_count, following_count FROM snapshots
      WHERE account_id = ? ORDER BY snapshot_date DESC LIMIT 1`,
    [account.id],
  );
  const dates = (
    await all<{ snapshot_date: string }>("SELECT snapshot_date FROM snapshots WHERE account_id = ?", [account.id])
  ).map((r) => r.snapshot_date);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/accounts/${account.id}`} className="text-sm text-muted hover:text-ink">
        ← @{account.username}
      </Link>
      <h1 className="mt-2 text-2xl font-bold">새로 체크하기</h1>
      <p className="mt-1 text-sm text-muted">
        인스타그램에서 받은 ZIP 파일을 그대로 올리거나, 압축을 푼 <code>followers_1.json</code>과{" "}
        <code>following.json</code>을 함께 올려주세요.
      </p>

      <div className="mt-6 space-y-4">
        <ExportGuide open={!latest} />
        <UploadFlow
          accountId={account.id}
          username={account.username}
          existingDates={dates}
          latest={
            latest
              ? { date: latest.snapshot_date, followers: latest.follower_count, following: latest.following_count }
              : null
          }
        />
      </div>
    </div>
  );
}
