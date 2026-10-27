"use client";

import { useActionState } from "react";
import { addAccount } from "@/app/actions";

export function AddAccountForm({ autoFocus = false }: { autoFocus?: boolean }) {
  const [state, action, pending] = useActionState(addAccount, undefined);
  return (
    <form action={action}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint">@</span>
          <input
            name="username"
            required
            autoFocus={autoFocus}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="인스타그램 아이디"
            aria-label="인스타그램 아이디"
            className="input pl-8"
          />
        </div>
        <button disabled={pending} className="btn btn-primary h-11">
          {pending ? "추가 중…" : "계정 추가"}
        </button>
      </div>
      {state?.error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.error}
        </p>
      )}
    </form>
  );
}
