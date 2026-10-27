"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { dotDate } from "@/lib/format";

export function SnapshotPicker({
  accountId,
  dates,
  selectedId,
}: {
  accountId: number;
  dates: { id: number; date: string }[];
  selectedId: number;
}) {
  const router = useRouter();
  return (
    <select
      aria-label="기준 날짜 선택"
      value={selectedId}
      onChange={(e) => router.push(`/accounts/${accountId}?s=${e.target.value}`)}
      className="input h-9 w-auto pr-8 text-sm font-semibold"
    >
      {[...dates].reverse().map((d, i) => (
        <option key={d.id} value={d.id}>
          {dotDate(d.date)}
          {i === 0 ? " (최신)" : ""}
        </option>
      ))}
    </select>
  );
}

export function ConfirmButton({
  action,
  message,
  children,
  className = "btn btn-danger btn-sm",
}: {
  action: () => Promise<void>;
  message: string;
  children: React.ReactNode;
  className?: string;
}) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      className={className}
      onClick={() => {
        if (confirm(message)) start(() => action());
      }}
    >
      {pending ? "처리 중…" : children}
    </button>
  );
}
