import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getOwnedAccount, loadExceptions, loadSnapshots } from "@/lib/data";
import { detail, summarize } from "@/lib/analysis";
import { daysSince, dotDate, num, signed, STALE_DAYS } from "@/lib/format";
import { deleteAccount, deleteSnapshot } from "@/app/actions";
import { ExportGuide } from "@/components/ExportGuide";
import { PeopleTabs } from "@/components/PeopleTabs";
import { TrendChart } from "@/components/TrendChart";
import { ConfirmButton, SnapshotPicker } from "@/components/controls";

export const metadata = { title: "대시보드 — 맞팔체크" };

export default async function AccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ s?: string }>;
}) {
  const user = await requireUser();
  const account = await getOwnedAccount(user.id, Number((await params).id));
  const [snapshots, exceptions] = await Promise.all([loadSnapshots(account.id), loadExceptions(account.id)]);
  const uploadHref = `/accounts/${account.id}/upload`;

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <Link href="/accounts" className="text-sm text-muted hover:text-ink">
          ← 내 계정
        </Link>
        <h1 className="mt-1 truncate text-2xl font-bold">
          <a href={`https://www.instagram.com/${account.username}/`} target="_blank" rel="noreferrer" className="hover:underline">
            @{account.username}
          </a>
        </h1>
      </div>
      <Link href={uploadHref} className="btn btn-brand h-11 px-5">
        새로 체크하기
      </Link>
    </div>
  );

  const deleteAccountButton = (
    <ConfirmButton
      action={deleteAccount.bind(null, account.id)}
      message={`@${account.username} 계정과 모든 체크 기록을 삭제할까요? 되돌릴 수 없어요.`}
    >
      이 계정 삭제
    </ConfirmButton>
  );

  if (snapshots.length === 0) {
    return (
      <div className="space-y-6">
        {header}
        <div className="card p-6 text-center sm:p-10">
          <p className="text-lg font-bold">아직 체크 기록이 없어요</p>
          <p className="mt-1 text-sm text-muted">인스타그램에서 받은 파일을 올리면 첫 기록이 만들어져요.</p>
          <Link href={uploadHref} className="btn btn-primary mt-5 h-11 px-5">
            파일 올리기
          </Link>
        </div>
        <ExportGuide />
        <div className="flex justify-end">{deleteAccountButton}</div>
      </div>
    );
  }

  const summaries = summarize(snapshots, exceptions);
  const requested = Number((await searchParams).s);
  const found = snapshots.findIndex((s) => s.id === requested);
  const index = found >= 0 ? found : snapshots.length - 1;
  const isLatest = index === snapshots.length - 1;
  const d = detail(snapshots, index, summaries, exceptions);
  const cur = d.summary;
  const prev = index > 0 ? summaries[index - 1] : null;
  const excluded = d.notFollowingBack.length - cur.notFollowingBack;

  return (
    <div className="space-y-5">
      {header}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted">
        <span>기준</span>
        <SnapshotPicker accountId={account.id} dates={summaries.map((s) => ({ id: s.id, date: s.date }))} selectedId={cur.id} />
        <span>
          {prev ? `${dotDate(prev.date)} 체크 대비` : "첫 체크예요 · 다음에 다시 체크하면 변화를 알려드려요"}
        </span>
      </div>

      {!isLatest && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-4 py-3 text-sm">
          <span>과거 기록({dotDate(cur.date)})을 보고 있어요.</span>
          <Link href={`/accounts/${account.id}`} className="font-semibold underline underline-offset-4">
            최신 기록 보기
          </Link>
        </div>
      )}
      {isLatest && daysSince(cur.date) >= STALE_DAYS && (
        <div className="rounded-xl bg-warn-soft px-4 py-3 text-sm text-warn">
          마지막 체크 후 {num(daysSince(cur.date))}일이 지났어요. 인스타그램에서 새 파일을 받아 업데이트해 보세요.
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="팔로워" value={cur.followers} delta={prev ? cur.followers - prev.followers : null} goodWhenUp />
        <Kpi label="팔로잉" value={cur.following} delta={prev ? cur.following - prev.following : null} />
        <Kpi
          label="맞팔 안 함"
          value={cur.notFollowingBack}
          delta={prev ? cur.notFollowingBack - prev.notFollowingBack : null}
          note={excluded ? `예외 ${num(excluded)}명 제외` : undefined}
        />
        {d.diff ? (
          <Kpi label="새 언팔로워" value={d.diff.newUnfollowers.length} tone={d.diff.newUnfollowers.length ? "danger" : undefined} note="지난 체크 땐 맞팔" />
        ) : (
          <Kpi label="맞팔" value={cur.mutual} />
        )}
      </dl>

      {d.diff && d.diff.newUnfollowers.length > 0 && (
        <section className="card border-danger/30 p-5">
          <h2 className="font-bold">
            <span className="text-danger">{d.diff.newUnfollowers.length}명</span>이 새로 나를 언팔했어요
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {d.diff.newUnfollowers.slice(0, 12).map((p) => (
              <li key={p.username}>
                <a
                  href={`https://www.instagram.com/${p.username}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block rounded-full bg-danger-soft px-3 py-1.5 text-sm font-semibold text-danger hover:underline"
                >
                  @{p.username}
                </a>
              </li>
            ))}
            {d.diff.newUnfollowers.length > 12 && (
              <li className="px-2 py-1.5 text-sm text-muted">외 {d.diff.newUnfollowers.length - 12}명</li>
            )}
          </ul>
        </section>
      )}

      {summaries.length > 1 && (
        <section className="card p-5">
          <h2 className="font-bold">팔로워·팔로잉 추이</h2>
          <div className="mt-3">
            <TrendChart data={summaries} selectedId={cur.id} />
          </div>
        </section>
      )}

      <PeopleTabs
        key={cur.id}
        accountId={account.id}
        snapshotDate={cur.date}
        notFollowingBack={d.notFollowingBack}
        fans={d.fans}
        diff={d.diff}
      />

      <section className="card overflow-hidden">
        <h2 className="px-5 pt-5 font-bold">체크 기록</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[12px] text-muted">
                <th className="px-5 py-2 font-medium">날짜</th>
                <th className="px-3 py-2 text-right font-medium">팔로워</th>
                <th className="px-3 py-2 text-right font-medium">팔로잉</th>
                <th className="px-3 py-2 text-right font-medium">맞팔 안 함</th>
                <th className="px-3 py-2 text-right font-medium">새 언팔</th>
                <th className="px-3 py-2 text-right font-medium">팔로워 증감</th>
                <th className="px-5 py-2" />
              </tr>
            </thead>
            <tbody className="tabular">
              {[...summaries].reverse().map((s) => (
                <tr key={s.id} className={`border-b border-line last:border-0 ${s.id === cur.id ? "bg-surface-2" : ""}`}>
                  <td className="px-5 py-2.5 font-semibold">
                    <Link href={`/accounts/${account.id}?s=${s.id}`} className="hover:underline">
                      {dotDate(s.date)}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 text-right">{num(s.followers)}</td>
                  <td className="px-3 py-2.5 text-right">{num(s.following)}</td>
                  <td className="px-3 py-2.5 text-right">{num(s.notFollowingBack)}</td>
                  <td className={`px-3 py-2.5 text-right ${s.newUnfollowers ? "font-semibold text-danger" : ""}`}>
                    {s.newUnfollowers ?? "–"}
                  </td>
                  <td className="px-3 py-2.5 text-right text-muted">
                    {s.gainedFollowers === null ? "–" : `+${s.gainedFollowers} / −${s.lostFollowers}`}
                  </td>
                  <td className="px-5 py-2.5 text-right">
                    <ConfirmButton
                      action={deleteSnapshot.bind(null, account.id, s.id)}
                      message={`${dotDate(s.date)} 기록을 삭제할까요? 앞뒤 기록의 비교 결과도 다시 계산돼요.`}
                      className="text-xs text-muted hover:text-danger"
                    >
                      삭제
                    </ConfirmButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex justify-end">{deleteAccountButton}</div>
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  note,
  tone,
  goodWhenUp,
}: {
  label: string;
  value: number;
  delta?: number | null;
  note?: string;
  tone?: "danger";
  goodWhenUp?: boolean;
}) {
  const deltaColor =
    !delta || !goodWhenUp ? "text-muted" : delta > 0 ? "text-good" : "text-danger";
  return (
    <div className="card p-4">
      <dt className="text-[13px] font-medium text-muted">{label}</dt>
      <dd className={`tabular mt-1 text-[26px] font-extrabold leading-none ${tone === "danger" ? "text-danger" : ""}`}>
        {num(value)}
      </dd>
      <dd className="mt-2 min-h-[18px] text-[12px]">
        {delta !== undefined && delta !== null && <span className={`tabular font-semibold ${deltaColor}`}>{signed(delta)}</span>}
        {note && <span className="ml-1 text-faint">{note}</span>}
      </dd>
    </div>
  );
}
