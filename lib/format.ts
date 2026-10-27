export const num = (n: number) => n.toLocaleString("ko-KR");

export const signed = (n: number) => (n > 0 ? `+${num(n)}` : n < 0 ? `−${num(-n)}` : "±0");

/** "YYYY-MM-DD" 기준 오늘로부터 며칠 전인지 (현지 날짜 기준) */
export function daysSince(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const then = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - then.getTime()) / 86400_000);
}

export function relativeDay(date: string) {
  const n = daysSince(date);
  if (n <= 0) return "오늘";
  if (n === 1) return "어제";
  if (n < 30) return `${n}일 전`;
  if (n < 365) return `${Math.floor(n / 30)}개월 전`;
  return `${Math.floor(n / 365)}년 전`;
}

export function dotDate(date: string) {
  return date.replaceAll("-", ".");
}

/** unix 초 → "2024.03.01" */
export function tsDate(ts: number) {
  if (!ts) return null;
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

/** 오래된 기록이면 새 체크를 권하는 기준 */
export const STALE_DAYS = 30;
