// 인스타그램 "내 정보 내보내기" 파일 해석. 브라우저에서만 실행되며 원본 파일은 서버로 보내지 않는다.
import { listZip, readZipText } from "./zip";

/** [아이디, 팔로우 시각(unix 초, 모르면 0)] */
export type Entry = [string, number];

export type SourceFile = {
  name: string;
  kind: "followers" | "following" | "ignored";
  count: number;
};

export type ParsedUpload = {
  followers: Entry[];
  following: Entry[];
  sources: SourceFile[];
  owner: string | null;
  date: string | null;
  errors: string[];
};

export const USERNAME_RE = /^[a-z0-9._]{1,30}$/;

export function normalizeUsername(raw: string) {
  return raw
    .trim()
    .replace(/^@/, "")
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();
}

type RawItem = {
  title?: string;
  string_list_data?: { href?: string; value?: string; timestamp?: number }[];
};

function usernameOf(item: RawItem): string | null {
  const s = item.string_list_data?.[0];
  let name = s?.value || item.title || "";
  // 최근 내보내기는 value 없이 href(https://www.instagram.com/_u/아이디)만 주기도 한다.
  if (!name && s?.href) {
    try {
      name = new URL(s.href).pathname.split("/").filter(Boolean).pop() ?? "";
    } catch {}
  }
  name = normalizeUsername(name);
  return USERNAME_RE.test(name) ? name : null;
}

function toEntries(items: unknown): Entry[] | null {
  if (!Array.isArray(items)) return null;
  const out: Entry[] = [];
  for (const item of items as RawItem[]) {
    if (!item || typeof item !== "object" || !("string_list_data" in item || "title" in item)) return null;
    const name = usernameOf(item);
    if (name) out.push([name, item.string_list_data?.[0]?.timestamp ?? 0]);
  }
  return out;
}

/** 파일 이름이 아니라 내용 구조로 팔로워/팔로잉을 구분한다. */
export function classify(json: unknown): { kind: SourceFile["kind"]; entries: Entry[] } {
  if (Array.isArray(json)) {
    const entries = toEntries(json);
    if (entries) return { kind: "followers", entries };
  } else if (json && typeof json === "object") {
    const obj = json as Record<string, unknown>;
    if ("relationships_following" in obj) {
      const entries = toEntries(obj.relationships_following);
      if (entries) return { kind: "following", entries };
    }
    if ("relationships_followers" in obj) {
      const entries = toEntries(obj.relationships_followers);
      if (entries) return { kind: "followers", entries };
    }
  }
  return { kind: "ignored", entries: [] };
}

const pad = (n: number) => String(n).padStart(2, "0");
export const toDateString = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const RELEVANT = /(^|\/)(followers(_\d+)?|following)\.(json|html)$/i;
const EXPORT_NAME = /instagram-([a-z0-9._]+)-(\d{4}-\d{2}-\d{2})/i;

export async function parseUploads(files: File[]): Promise<ParsedUpload> {
  const followers = new Map<string, number>();
  const following = new Map<string, number>();
  const sources: SourceFile[] = [];
  const errors: string[] = [];
  let owner: string | null = null;
  let date: string | null = null;
  let fallbackDate: Date | null = null;
  let sawHtml = false;

  const take = (name: string, text: string) => {
    let json: unknown;
    try {
      json = JSON.parse(text);
    } catch {
      errors.push(`${name}: JSON 파일을 읽을 수 없어요.`);
      return;
    }
    const { kind, entries } = classify(json);
    const target = kind === "followers" ? followers : kind === "following" ? following : null;
    if (target) for (const [u, t] of entries) if (!target.has(u)) target.set(u, t);
    sources.push({ name, kind, count: entries.length });
  };

  const later = (d: Date) => {
    if (!fallbackDate || d > fallbackDate) fallbackDate = d;
  };

  for (const file of files) {
    const lower = file.name.toLowerCase();
    const meta = EXPORT_NAME.exec(file.name);
    if (meta) {
      owner ??= meta[1].toLowerCase();
      date ??= meta[2];
    }

    if (lower.endsWith(".zip")) {
      try {
        const entries = (await listZip(file)).filter((e) => RELEVANT.test(e.name));
        for (const e of entries) {
          const inner = EXPORT_NAME.exec(e.name);
          if (inner) {
            owner ??= inner[1].toLowerCase();
            date ??= inner[2];
          }
          if (e.name.toLowerCase().endsWith(".html")) {
            sawHtml = true;
            continue;
          }
          later(e.modified);
          take(e.name.split("/").pop()!, await readZipText(file, e));
        }
        if (entries.length === 0) errors.push(`${file.name}: 팔로워/팔로잉 파일이 들어 있지 않아요.`);
      } catch (err) {
        errors.push(`${file.name}: ${(err as Error).message}`);
      }
    } else if (lower.endsWith(".json")) {
      later(new Date(file.lastModified));
      take(file.name, await file.text());
    } else if (lower.endsWith(".html")) {
      sawHtml = true;
    } else {
      errors.push(`${file.name}: ZIP 또는 JSON 파일만 올릴 수 있어요.`);
    }
  }

  if (sawHtml && followers.size + following.size === 0) {
    errors.push("HTML 형식으로 내보낸 파일이에요. 내보내기 형식을 'JSON'으로 선택해 다시 받아주세요.");
  }

  return {
    followers: [...followers],
    following: [...following],
    sources,
    owner,
    date: date ?? (fallbackDate ? toDateString(fallbackDate) : null),
    errors,
  };
}
