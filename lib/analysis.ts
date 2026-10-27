// 스냅샷 비교. 변화량은 저장하지 않고 매번 "바로 이전 날짜의 스냅샷"과 비교해 계산한다.
// 그래서 과거 날짜를 끼워 넣거나 스냅샷을 지워도 기록이 항상 일관된다.
import type { Entry } from "./instagram";

export type Snapshot = {
  id: number;
  date: string;
  followers: Map<string, number>;
  following: Map<string, number>;
};

export type Person = {
  username: string;
  /** 내가(또는 상대가) 팔로우한 시각, unix 초. 0이면 알 수 없음 */
  at: number;
  /** 이 상태가 처음 확인된 스냅샷 날짜 */
  since?: string;
  isNew?: boolean;
  exception?: boolean;
};

export type SnapshotSummary = {
  id: number;
  date: string;
  followers: number;
  following: number;
  mutual: number;
  /** 예외 계정 제외 */
  notFollowingBack: number;
  newUnfollowers: number | null;
  gainedFollowers: number | null;
  lostFollowers: number | null;
};

export type Diff = {
  prevDate: string;
  /** 지난번엔 맞팔이었는데 이번엔 나만 팔로우 중 */
  newUnfollowers: Person[];
  /** 지난번 팔로워였는데 이번에 팔로워 목록에서 빠진 사람 전체 */
  lostFollowers: (Person & { reason: "unfollowed_me" | "mutual_ended" | "was_fan" })[];
  gainedFollowers: Person[];
  startedFollowing: Person[];
  stoppedFollowing: Person[];
};

export type SnapshotDetail = {
  summary: SnapshotSummary;
  notFollowingBack: Person[];
  fans: Person[];
  diff: Diff | null;
};

export const toMap = (entries: Entry[]) => new Map(entries);

const isMutual = (s: Snapshot, u: string) => s.followers.has(u) && s.following.has(u);
const isNotFollowingBack = (s: Snapshot, u: string) => s.following.has(u) && !s.followers.has(u);

function newUnfollowers(prev: Snapshot, cur: Snapshot) {
  const out: string[] = [];
  for (const u of cur.following.keys()) if (isNotFollowingBack(cur, u) && isMutual(prev, u)) out.push(u);
  return out;
}

function countMutual(s: Snapshot) {
  let n = 0;
  for (const u of s.following.keys()) if (s.followers.has(u)) n++;
  return n;
}

/** 예외로 둔 계정은 모든 기록에서 똑같이 빼고 세야 날짜 간 비교가 맞다. */
function countNotFollowingBack(s: Snapshot, exceptions: Set<string>) {
  let n = 0;
  for (const u of s.following.keys()) if (!s.followers.has(u) && !exceptions.has(u)) n++;
  return n;
}

function lostFollowersCount(prev: Snapshot, cur: Snapshot) {
  let n = 0;
  for (const u of prev.followers.keys()) if (!cur.followers.has(u)) n++;
  return n;
}

function gainedFollowersCount(prev: Snapshot, cur: Snapshot) {
  let n = 0;
  for (const u of cur.followers.keys()) if (!prev.followers.has(u)) n++;
  return n;
}

/** snapshots는 날짜 오름차순 */
export function summarize(snapshots: Snapshot[], exceptions: Set<string>): SnapshotSummary[] {
  return snapshots.map((cur, i) => {
    const prev = snapshots[i - 1];
    const mutual = countMutual(cur);
    return {
      id: cur.id,
      date: cur.date,
      followers: cur.followers.size,
      following: cur.following.size,
      mutual,
      notFollowingBack: countNotFollowingBack(cur, exceptions),
      newUnfollowers: prev ? newUnfollowers(prev, cur).length : null,
      gainedFollowers: prev ? gainedFollowersCount(prev, cur) : null,
      lostFollowers: prev ? lostFollowersCount(prev, cur) : null,
    };
  });
}

const byRecent = (a: Person, b: Person) => b.at - a.at || a.username.localeCompare(b.username);

export function detail(
  snapshots: Snapshot[],
  index: number,
  summaries: SnapshotSummary[],
  exceptions: Set<string>,
): SnapshotDetail {
  const cur = snapshots[index];
  const prev = snapshots[index - 1];

  const freshUnfollowers = new Set(prev ? newUnfollowers(prev, cur) : []);

  const notFollowingBack: Person[] = [];
  for (const [u, at] of cur.following) {
    if (cur.followers.has(u)) continue;
    // 연속으로 "맞팔 아님"이었던 가장 오래된 스냅샷 날짜
    let since = cur.date;
    for (let j = index - 1; j >= 0 && isNotFollowingBack(snapshots[j], u); j--) since = snapshots[j].date;
    notFollowingBack.push({
      username: u,
      at,
      since,
      isNew: freshUnfollowers.has(u),
      exception: exceptions.has(u),
    });
  }
  notFollowingBack.sort(byRecent);

  const fans: Person[] = [];
  for (const [u, at] of cur.followers) if (!cur.following.has(u)) fans.push({ username: u, at });
  fans.sort(byRecent);

  let diff: Diff | null = null;
  if (prev) {
    const lostFollowers: Diff["lostFollowers"] = [];
    for (const [u, at] of prev.followers) {
      if (cur.followers.has(u)) continue;
      const reason = cur.following.has(u) ? "unfollowed_me" : prev.following.has(u) ? "mutual_ended" : "was_fan";
      lostFollowers.push({ username: u, at, reason, exception: exceptions.has(u) });
    }
    const pick = (from: Map<string, number>, notIn: Map<string, number>) => {
      const out: Person[] = [];
      for (const [u, at] of from) if (!notIn.has(u)) out.push({ username: u, at });
      return out.sort(byRecent);
    };
    diff = {
      prevDate: prev.date,
      newUnfollowers: notFollowingBack.filter((p) => p.isNew),
      lostFollowers: lostFollowers.sort(byRecent),
      gainedFollowers: pick(cur.followers, prev.followers),
      startedFollowing: pick(cur.following, prev.following),
      stoppedFollowing: pick(prev.following, cur.following),
    };
  }

  return { summary: summaries[index], notFollowingBack, fans, diff };
}
