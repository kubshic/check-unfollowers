"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import type { Diff, Person } from "@/lib/analysis";
import { setException } from "@/app/actions";
import { dotDate, num, tsDate } from "@/lib/format";

type Props = {
  accountId: number;
  snapshotDate: string;
  notFollowingBack: Person[];
  fans: Person[];
  diff: Diff | null;
};

type TabKey = "nfb" | "new" | "followers" | "following" | "fans";
type Sort = "recent" | "oldest" | "name" | "longest";

const REASON: Record<Diff["lostFollowers"][number]["reason"], string> = {
  unfollowed_me: "나만 팔로우 중",
  mutual_ended: "서로 끊김·탈퇴",
  was_fan: "맞팔 아니었음",
};

const PAGE = 200;

export function PeopleTabs({ accountId, snapshotDate, notFollowingBack, fans, diff }: Props) {
  const [tab, setTab] = useState<TabKey>(diff?.newUnfollowers.length ? "new" : "nfb");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("recent");
  const [showExceptions, setShowExceptions] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  const [exceptions, toggleOptimistic] = useOptimistic(
    new Set(notFollowingBack.filter((p) => p.exception).map((p) => p.username)),
    (set, { username, on }: { username: string; on: boolean }) => {
      const next = new Set(set);
      if (on) next.add(username);
      else next.delete(username);
      return next;
    },
  );

  function toggleException(username: string) {
    const on = !exceptions.has(username);
    startTransition(async () => {
      toggleOptimistic({ username, on });
      await setException(accountId, username, on);
    });
  }

  const nfbVisible = notFollowingBack.filter((p) => !exceptions.has(p.username));
  const exceptionCount = notFollowingBack.length - nfbVisible.length;

  const tabs: { key: TabKey; label: string; count: number; hidden?: boolean }[] = [
    { key: "new", label: "새 언팔", count: diff?.newUnfollowers.length ?? 0, hidden: !diff },
    { key: "nfb", label: "맞팔 안 함", count: nfbVisible.length },
    {
      key: "followers",
      label: "팔로워 변화",
      count: (diff?.gainedFollowers.length ?? 0) + (diff?.lostFollowers.length ?? 0),
      hidden: !diff,
    },
    {
      key: "following",
      label: "팔로잉 변화",
      count: (diff?.startedFollowing.length ?? 0) + (diff?.stoppedFollowing.length ?? 0),
      hidden: !diff,
    },
    { key: "fans", label: "나만 팔로우 받는 중", count: fans.length },
  ];

  const sorted = useMemo(() => {
    const base = tab === "nfb" ? (showExceptions ? notFollowingBack : nfbVisible) : tab === "fans" ? fans : [];
    const q = query.trim().toLowerCase().replace(/^@/, "");
    const filtered = q ? base.filter((p) => p.username.includes(q)) : base;
    const list = [...filtered];
    if (sort === "oldest") list.sort((a, b) => (a.at || Infinity) - (b.at || Infinity));
    else if (sort === "name") list.sort((a, b) => a.username.localeCompare(b.username));
    else if (sort === "longest") list.sort((a, b) => (a.since ?? "").localeCompare(b.since ?? "") || b.at - a.at);
    return list;
  }, [tab, query, sort, showExceptions, notFollowingBack, nfbVisible, fans]);

  function copy(names: string[]) {
    navigator.clipboard.writeText(names.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  const select = (key: TabKey) => {
    setTab(key);
    setQuery("");
    setLimit(PAGE);
  };

  return (
    <section className="card overflow-hidden">
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line px-3 pt-3">
        {tabs
          .filter((t) => !t.hidden)
          .map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => select(t.key)}
              className={`shrink-0 border-b-2 px-3 pb-2.5 pt-1 text-sm font-semibold transition ${
                tab === t.key ? "border-ink text-ink" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
              <span
                className={`tabular ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${
                  t.key === "new" && t.count > 0 ? "bg-danger-soft text-danger" : "bg-surface-2 text-muted"
                }`}
              >
                {num(t.count)}
              </span>
            </button>
          ))}
      </div>

      <div className="p-4 sm:p-5">
        {(tab === "nfb" || tab === "fans") && (
          <>
            <p className="text-sm text-muted">
              {tab === "nfb"
                ? "내가 팔로우하지만 나를 팔로우하지 않는 사람이에요. 연예인·브랜드처럼 맞팔을 기대하지 않는 계정은 '예외'로 두면 목록과 개수에서 빠져요."
                : "나를 팔로우하지만 내가 팔로우하지 않는 사람이에요."}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="아이디 검색"
                aria-label="아이디 검색"
                className="input h-9 w-full text-sm sm:w-56"
              />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as Sort)}
                aria-label="정렬"
                className="input h-9 w-auto text-sm"
              >
                <option value="recent">최근 팔로우 순</option>
                <option value="oldest">오래된 팔로우 순</option>
                <option value="name">아이디 순</option>
                {tab === "nfb" && <option value="longest">맞팔 아닌 기간 긴 순</option>}
              </select>
              {tab === "nfb" && exceptionCount > 0 && (
                <button onClick={() => setShowExceptions((v) => !v)} className="btn btn-ghost btn-sm h-9">
                  {showExceptions ? "예외 숨기기" : `예외 ${exceptionCount}명 보기`}
                </button>
              )}
              <button onClick={() => copy(sorted.map((p) => p.username))} className="btn btn-ghost btn-sm h-9 sm:ml-auto">
                {copied ? "복사됨 ✓" : "아이디 복사"}
              </button>
            </div>
            <PeopleList
              people={sorted.slice(0, limit)}
              meta={(p) =>
                tab === "nfb" ? nfbMeta(p, snapshotDate) : p.at ? `${tsDate(p.at)} 나를 팔로우` : null
              }
              badge={(p) => (p.isNew ? <Badge tone="danger">NEW</Badge> : null)}
              action={
                tab === "nfb"
                  ? (p) => (
                      <button
                        onClick={() => toggleException(p.username)}
                        className={`btn btn-sm ${exceptions.has(p.username) ? "btn-primary" : "btn-ghost"}`}
                        title="맞팔을 기대하지 않는 계정이면 예외로 두세요"
                      >
                        {exceptions.has(p.username) ? "예외 해제" : "예외"}
                      </button>
                    )
                  : undefined
              }
              empty={query ? "검색 결과가 없어요." : tab === "nfb" ? "모두 맞팔 중이에요 🎉" : "없어요."}
            />
            {sorted.length > limit && (
              <button onClick={() => setLimit((l) => l + PAGE)} className="btn btn-ghost mt-3 w-full">
                {num(sorted.length - limit)}명 더 보기
              </button>
            )}
          </>
        )}

        {tab === "new" && diff && (
          <>
            <p className="text-sm text-muted">
              {dotDate(diff.prevDate)}엔 서로 팔로우했는데, 이번 체크에선 나만 팔로우하고 있는 사람이에요.
            </p>
            <CopyRow names={diff.newUnfollowers.map((p) => p.username)} onCopy={copy} copied={copied} />
            <PeopleList
              people={diff.newUnfollowers}
              meta={(p) => (p.at ? `${tsDate(p.at)}부터 내가 팔로우` : null)}
              empty="새로 언팔한 사람이 없어요 🎉"
            />
            <p className="mt-4 text-xs text-faint leading-relaxed">
              상대가 아이디를 바꾸거나 계정을 비활성화해도 언팔로 보일 수 있어요.
            </p>
          </>
        )}

        {tab === "followers" && diff && (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">
                떠난 팔로워 <span className="text-danger">{num(diff.lostFollowers.length)}</span>
              </h3>
              <p className="mt-1 text-xs text-muted">{dotDate(diff.prevDate)} 이후 팔로워 목록에서 빠진 사람</p>
              <PeopleList
                people={diff.lostFollowers}
                meta={(p) => REASON[(p as Diff["lostFollowers"][number]).reason]}
                empty="떠난 팔로워가 없어요."
              />
            </div>
            <div>
              <h3 className="font-semibold">
                새 팔로워 <span className="text-good">{num(diff.gainedFollowers.length)}</span>
              </h3>
              <p className="mt-1 text-xs text-muted">{dotDate(diff.prevDate)} 이후 나를 새로 팔로우한 사람</p>
              <PeopleList
                people={diff.gainedFollowers}
                meta={(p) => (p.at ? `${tsDate(p.at)} 팔로우` : null)}
                empty="새 팔로워가 없어요."
              />
            </div>
          </div>
        )}

        {tab === "following" && diff && (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="font-semibold">내가 새로 팔로우 {num(diff.startedFollowing.length)}</h3>
              <PeopleList
                people={diff.startedFollowing}
                meta={(p) => (p.at ? `${tsDate(p.at)} 팔로우` : null)}
                empty="없어요."
              />
            </div>
            <div>
              <h3 className="font-semibold">내가 언팔 {num(diff.stoppedFollowing.length)}</h3>
              <PeopleList people={diff.stoppedFollowing} meta={() => null} empty="없어요." />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function nfbMeta(p: Person, snapshotDate: string) {
  const parts = [];
  if (p.at) parts.push(`${tsDate(p.at)} 팔로우`);
  if (p.since && p.since !== snapshotDate) parts.push(`${dotDate(p.since)}부터 맞팔 아님`);
  return parts.join(" · ") || null;
}

function CopyRow({ names, onCopy, copied }: { names: string[]; onCopy: (n: string[]) => void; copied: boolean }) {
  if (!names.length) return null;
  return (
    <div className="mt-3 flex justify-end">
      <button onClick={() => onCopy(names)} className="btn btn-ghost btn-sm">
        {copied ? "복사됨 ✓" : "아이디 복사"}
      </button>
    </div>
  );
}

function Badge({ tone, children }: { tone: "danger"; children: React.ReactNode }) {
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${tone === "danger" ? "bg-danger-soft text-danger" : ""}`}>
      {children}
    </span>
  );
}

function PeopleList({
  people,
  meta,
  badge,
  action,
  empty,
}: {
  people: Person[];
  meta: (p: Person) => string | null;
  badge?: (p: Person) => React.ReactNode;
  action?: (p: Person) => React.ReactNode;
  empty: string;
}) {
  if (!people.length) return <p className="mt-4 rounded-xl bg-surface-2 px-4 py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ul className="mt-3 divide-y divide-line">
      {people.map((p) => {
        const m = meta(p);
        return (
          <li key={p.username} className="flex items-center gap-3 py-2.5">
            <span
              aria-hidden
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-sm font-bold uppercase text-muted"
            >
              {p.username.replace(/[._]/g, "")[0] ?? "?"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <a
                  href={`https://www.instagram.com/${p.username}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-semibold hover:underline"
                >
                  {p.username}
                </a>
                {badge?.(p)}
              </div>
              {m && <p className="truncate text-xs text-muted">{m}</p>}
            </div>
            {action?.(p)}
          </li>
        );
      })}
    </ul>
  );
}
