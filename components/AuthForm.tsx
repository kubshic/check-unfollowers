"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, authErrorMessage } from "@/lib/auth-client";

type Props = { mode: "login" | "signup"; googleEnabled: boolean; notice?: string };

export function AuthForm({ mode, googleEnabled, notice }: Props) {
  const router = useRouter();
  const isSignup = mode === "signup";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email")).trim().toLowerCase();
    const password = String(fd.get("password"));
    setError(null);

    if (isSignup && password !== String(fd.get("confirm"))) {
      setError("비밀번호 확인이 일치하지 않아요.");
      return;
    }

    setPending(true);
    const res = isSignup
      ? await authClient.signUp.email({ email, password, name: email.split("@")[0], callbackURL: "/accounts" })
      : await authClient.signIn.email({ email, password, callbackURL: "/accounts" });
    setPending(false);

    if (res.error) return setError(authErrorMessage(res.error));
    // 이메일 인증이 필요하면 가입 직후엔 로그인 상태가 아니다.
    if (isSignup && !res.data?.token) return setSentTo(email);
    router.push("/accounts");
    router.refresh();
  }

  async function google() {
    setError(null);
    const res = await authClient.signIn.social({ provider: "google", callbackURL: "/accounts", errorCallbackURL: "/login" });
    if (res.error) setError(authErrorMessage(res.error));
  }

  if (sentTo) {
    return (
      <div className="card w-full max-w-sm p-6 text-center sm:p-7">
        <p className="text-3xl" aria-hidden>
          ✉️
        </p>
        <h1 className="mt-3 text-xl font-bold">메일함을 확인해 주세요</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          <b className="text-ink">{sentTo}</b>로 인증 메일을 보냈어요. 메일의 버튼을 누르면 가입이 완료되고 바로
          로그인돼요.
        </p>
        <p className="mt-4 text-xs text-faint">메일이 안 보이면 스팸함도 확인해 주세요.</p>
        <Link href="/login" className="btn btn-ghost mt-6 w-full">
          로그인 화면으로
        </Link>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-sm p-6 sm:p-7">
      <h1 className="text-xl font-bold">{isSignup ? "회원가입" : "로그인"}</h1>
      <p className="mt-1 text-sm text-muted">
        {isSignup ? "가입하고 언팔로워 기록을 쌓아보세요." : "다시 오신 걸 환영해요."}
      </p>

      {notice && <p className="mt-4 rounded-lg bg-good-soft px-3 py-2 text-sm text-good">{notice}</p>}

      {googleEnabled && (
        <>
          <button type="button" onClick={google} className="btn btn-ghost mt-6 h-11 w-full">
            <GoogleIcon />
            Google로 {isSignup ? "가입하기" : "로그인"}
          </button>
          <div className="my-5 flex items-center gap-3 text-xs text-faint">
            <span className="h-px flex-1 bg-line" />
            또는 이메일로
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={onSubmit} className={googleEnabled ? "" : "mt-6"}>
        <div className="space-y-4">
          <div>
            <label className="label" htmlFor="email">
              이메일
            </label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input" />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="password">
                비밀번호
              </label>
              {!isSignup && (
                <Link href="/forgot-password" className="mb-1.5 text-xs font-medium text-muted hover:text-ink">
                  비밀번호를 잊으셨나요?
                </Link>
              )}
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={isSignup ? 8 : undefined}
              required
              className="input"
            />
            {isSignup && <p className="mt-1.5 text-xs text-faint">8자 이상 · 인스타그램 비밀번호와 다르게 정해주세요</p>}
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

        {error && (
          <p role="alert" className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className="btn btn-primary mt-5 h-11 w-full">
          {pending ? "잠시만요…" : isSignup ? "가입하기" : "로그인"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {isSignup ? "이미 계정이 있나요? " : "처음이신가요? "}
        <Link href={isSignup ? "/login" : "/signup"} className="font-semibold text-ink underline underline-offset-4">
          {isSignup ? "로그인" : "회원가입"}
        </Link>
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
