"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup } from "@/app/actions";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);
  const isSignup = mode === "signup";

  return (
    <form action={action} className="card w-full max-w-sm p-6 sm:p-7">
      <h1 className="text-xl font-bold">{isSignup ? "회원가입" : "로그인"}</h1>
      <p className="mt-1 text-sm text-muted">
        {isSignup ? "이메일로 가입하고 언팔로워 기록을 쌓아보세요." : "다시 오신 걸 환영해요."}
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="email">
            이메일
          </label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            비밀번호
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={isSignup ? "new-password" : "current-password"}
            minLength={isSignup ? 8 : undefined}
            required
            className="input"
          />
          {isSignup && <p className="mt-1.5 text-xs text-faint">8자 이상</p>}
        </div>
        {isSignup && (
          <div>
            <label className="label" htmlFor="confirm">
              비밀번호 확인
            </label>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" />
          </div>
        )}
      </div>

      <p className="mt-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-muted leading-relaxed">
        인스타그램 비밀번호가 아니라 이 사이트에서 쓸 비밀번호예요.
      </p>

      {state?.error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary mt-5 h-11 w-full">
        {pending ? "잠시만요…" : isSignup ? "가입하기" : "로그인"}
      </button>

      <p className="mt-5 text-center text-sm text-muted">
        {isSignup ? "이미 계정이 있나요? " : "처음이신가요? "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-ink underline underline-offset-4">
          {isSignup ? "로그인" : "회원가입"}
        </Link>
      </p>
    </form>
  );
}
