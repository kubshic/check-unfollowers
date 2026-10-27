"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { parseUploads, toDateString, type ParsedUpload } from "@/lib/instagram";
import { saveSnapshot } from "@/app/actions";
import { dotDate, num } from "@/lib/format";

type Props = {
  accountId: number;
  username: string;
  existingDates: string[];
  latest: { date: string; followers: number; following: number } | null;
};

export function UploadFlow({ accountId, username, existingDates, latest }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [parsed, setParsed] = useState<ParsedUpload | null>(null);
  const [date, setDate] = useState("");
  const [parsing, setParsing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const today = toDateString(new Date());

  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    // 팔로워 파일과 팔로잉 파일을 따로 끌어다 놓아도 합쳐서 해석한다.
    const next = [...files.filter((f) => ![...list].some((n) => n.name === f.name)), ...list];
    setFiles(next);
    setParsing(true);
    setSaveError(null);
    try {
      const result = await parseUploads(next);
      setParsed(result);
      setDate((d) => d || (result.date && result.date <= today ? result.date : today));
    } finally {
      setParsing(false);
    }
  }

  function reset() {
    setFiles([]);
    setParsed(null);
    setDate("");
    setSaveError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  const hasFollowers = parsed?.sources.some((s) => s.kind === "followers") ?? false;
  const hasFollowing = parsed?.sources.some((s) => s.kind === "following") ?? false;
  const ready = parsed && hasFollowers && hasFollowing && date;
  const overwrite = existingDates.includes(date);

  const warnings: string[] = [];
  if (parsed?.owner && parsed.owner !== username) {
    warnings.push(`이 파일은 @${parsed.owner} 계정에서 내보낸 것 같아요. @${username}의 파일이 맞는지 확인하세요.`);
  }
  if (parsed && latest && hasFollowers && parsed.followers.length < latest.followers * 0.6) {
    warnings.push(
      `팔로워 수가 지난 기록(${num(latest.followers)}명)보다 크게 줄었어요. 내보내기 기간을 '전체 기간'으로 했는지 확인하세요.`,
    );
  }

  function submit() {
    if (!parsed || !ready) return;
    setSaveError(null);
    startSaving(async () => {
      const res = await saveSnapshot(accountId, {
        date,
        followers: parsed.followers,
        following: parsed.following,
        overwrite,
      });
      if (res.ok) router.push(`/accounts/${accountId}?s=${res.id}`);
      else setSaveError(res.error);
    });
  }

  return (
    <div className="card p-5">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept=".zip,.json,application/zip,application/json"
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`grid cursor-pointer place-items-center rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
          dragging ? "border-ink bg-surface-2" : "border-line hover:bg-surface-2"
        }`}
      >
        <div>
          <p className="font-semibold">{files.length ? "파일 더 추가하기" : "ZIP 또는 JSON 파일을 끌어다 놓기"}</p>
          <p className="mt-1 text-sm text-muted">또는 눌러서 선택 · 여러 개를 함께 올릴 수 있어요</p>
          <p className="mt-3 text-xs text-faint">파일은 이 브라우저에서만 읽고 서버로 보내지 않아요</p>
        </div>
      </div>

      {parsing && <p className="mt-4 text-sm text-muted">파일을 읽는 중…</p>}

      {parsed && !parsing && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Found label="팔로워" ok={hasFollowers} count={parsed.followers.length} missing="followers_1.json" />
            <Found label="팔로잉" ok={hasFollowing} count={parsed.following.length} missing="following.json" />
          </div>

          <ul className="space-y-1 text-[13px] text-muted">
            {parsed.sources.map((s, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span className="truncate">{s.name}</span>
                <span className="shrink-0">
                  {s.kind === "followers" ? `팔로워 ${num(s.count)}명` : s.kind === "following" ? `팔로잉 ${num(s.count)}명` : "사용 안 함"}
                </span>
              </li>
            ))}
          </ul>

          {[...parsed.errors].map((e) => (
            <Notice key={e} tone="danger">
              {e}
            </Notice>
          ))}
          {warnings.map((w) => (
            <Notice key={w} tone="warn">
              {w}
            </Notice>
          ))}

          {hasFollowers && hasFollowing && (
            <div>
              <label htmlFor="snapshot-date" className="label">
                기준 날짜
              </label>
              <input
                id="snapshot-date"
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                className="input max-w-[200px]"
              />
              <p className="mt-1.5 text-xs text-faint">
                {parsed.date ? "파일 날짜로 자동 입력했어요. 실제로 내보낸 날짜와 다르면 고쳐주세요. " : ""}
                같은 날짜에는 기록이 하나만 저장돼요.
              </p>
              {overwrite && (
                <p className="mt-2 text-sm font-medium text-warn">
                  {dotDate(date)} 기록이 이미 있어요. 저장하면 이 파일로 덮어써요.
                </p>
              )}
            </div>
          )}

          {saveError && <Notice tone="danger">{saveError}</Notice>}

          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={submit} disabled={!ready || saving} className="btn btn-brand h-11 px-5">
              {saving ? "저장 중…" : overwrite ? "덮어쓰고 결과 보기" : "저장하고 결과 보기"}
            </button>
            <button onClick={reset} disabled={saving} className="btn btn-ghost h-11">
              다시 선택
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Found({ label, ok, count, missing }: { label: string; ok: boolean; count: number; missing: string }) {
  return (
    <div className={`rounded-xl px-4 py-3 ${ok ? "bg-good-soft" : "bg-danger-soft"}`}>
      <p className={`text-[13px] font-semibold ${ok ? "text-good" : "text-danger"}`}>
        {ok ? "✓ " : "✕ "}
        {label}
      </p>
      <p className="tabular mt-0.5 text-lg font-bold">{ok ? `${num(count)}명` : "파일 없음"}</p>
      {!ok && <p className="text-xs text-danger">{missing}이 필요해요</p>}
    </div>
  );
}

function Notice({ tone, children }: { tone: "warn" | "danger"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "danger" ? "alert" : undefined}
      className={`rounded-lg px-3 py-2 text-sm leading-relaxed ${
        tone === "danger" ? "bg-danger-soft text-danger" : "bg-warn-soft text-warn"
      }`}
    >
      {children}
    </p>
  );
}
