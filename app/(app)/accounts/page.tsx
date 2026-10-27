import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listAccountCards, MAX_ACCOUNTS } from "@/lib/data";
import { daysSince, dotDate, num, relativeDay, signed, STALE_DAYS } from "@/lib/format";
import { AddAccountForm } from "@/components/AddAccountForm";

export const metadata = { title: "내 계정 — 맞팔체크" };

export default async function AccountsPage() {
  const user = await requireUser();
  const cards = await listAccountCards(user.id);

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-lg pt-6 sm:pt-12">
        <h1 className="text-2xl font-bold">어떤 계정을 체크할까요?</h1>
        <p className="mt-2 text-muted">
          체크할 인스타그램 아이디를 등록하세요. 여러 계정을 등록해 따로 기록할 수 있어요.
        </p>
        <div className="card mt-6 p-5">
          <AddAccountForm autoFocus />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">내 계정</h1>
          <p className="mt-1 text-sm text-muted">계정을 눌러 대시보드를 보거나 새로 체크하세요.</p>
        </div>
      </div>

      <ul className="mt-6 grid gap-3 sm:grid-cols-2">
        {cards.map((a) => {
          const latest = a.latest;
          const stale = latest && daysSince(latest.date) >= STALE_DAYS;
          const followerDelta = latest && a.previous ? latest.followers - a.previous.followers : null;
          return (
            <li key={a.id}>
              <Link href={`/accounts/${a.id}`} className="card block p-5 transition hover:border-faint">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-lg font-bold">@{a.username}</p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {latest
                        ? `마지막 체크 ${dotDate(latest.date)} · ${relativeDay(latest.date)}`
                        : "아직 체크 기록이 없어요"}
                    </p>
                  </div>
                  {latest?.newUnfollowers ? (
                    <span className="shrink-0 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-bold text-danger">
                      새 언팔 {latest.newUnfollowers}명
                    </span>
                  ) : null}
                </div>

                {latest ? (
                  <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Stat label="팔로워" value={num(latest.followers)} sub={followerDelta !== null ? signed(followerDelta) : undefined} />
                    <Stat label="팔로잉" value={num(latest.following)} />
                    <Stat label="맞팔 안 함" value={num(latest.notFollowingBack)} />
                  </dl>
                ) : (
                  <p className="mt-4 rounded-xl bg-surface-2 px-4 py-3 text-sm font-medium">
                    첫 체크를 하려면 눌러서 파일을 올려주세요 →
                  </p>
                )}

                {stale && (
                  <p className="mt-3 text-xs font-medium text-warn">
                    체크한 지 {daysSince(latest.date)}일 지났어요. 새 파일로 업데이트해 보세요.
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {cards.length < MAX_ACCOUNTS && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold text-muted">계정 추가</h2>
          <div className="mt-2 max-w-md">
            <AddAccountForm />
          </div>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-2 py-2.5">
      <dt className="text-[12px] text-muted">{label}</dt>
      <dd className="tabular mt-0.5 font-bold">
        {value}
        {sub && <span className="ml-1 text-[11px] font-medium text-muted">{sub}</span>}
      </dd>
    </div>
  );
}
