"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export function ForgotPasswordForm() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const email = String(new FormData(e.currentTarget).get("email")).trim().toLowerCase();
    setPending(true);
    setError(null);
    const res = await authClient.requestPasswordReset({ email, redirectTo: "/reset-password" });
    setPending(false);
    if (res.error) return setError(authErrorMessage(res.error));
    setSent(true);
  }

  if (sent) {
    return (
      <div className="card w-full max-w-sm p-6 text-center sm:p-7">
        <h1 className="text-xl font-bold">메일을 보냈어요</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          가입된 이메일이라면 비밀번호 재설정 링크가 도착해요. 링크는 1시간 동안 유효해요.
        </p>
        <p className="mt-3 text-xs text-faint">
          구글로 가입했다면 비밀번호 없이 Google 로그인을 이용해 주세요.
        </p>
        <Link href="/login" className="btn btn-ghost mt-6 w-full">
          로그인 화면으로
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-sm p-6 sm:p-7">
      <h1 className="text-xl font-bold">비밀번호 찾기</h1>
      <p className="mt-1 text-sm text-muted">가입한 이메일로 재설정 링크를 보내드려요.</p>
      <div className="mt-6">
        <label className="label" htmlFor="email">
          이메일
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      {error && <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <button disabled={pending} className="btn btn-primary mt-5 h-11 w-full">
        {pending ? "보내는 중…" : "재설정 링크 받기"}
      </button>
      <p className="mt-5 text-center text-sm">
        <Link href="/login" className="text-muted hover:text-ink">
          ← 로그인으로 돌아가기
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token, invalid }: { token: string | null; invalid: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (invalid || !token) {
    return (
      <div className="card w-full max-w-sm p-6 text-center sm:p-7">
        <h1 className="text-xl font-bold">링크가 만료되었어요</h1>
        <p className="mt-2 text-sm text-muted">재설정 링크는 1시간 동안만 쓸 수 있어요. 다시 요청해 주세요.</p>
        <Link href="/forgot-password" className="btn btn-primary mt-6 w-full">
          재설정 링크 다시 받기
        </Link>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const newPassword = String(fd.get("password"));
    if (newPassword !== String(fd.get("confirm"))) return setError("비밀번호 확인이 일치하지 않아요.");
    setPending(true);
    setError(null);
    const res = await authClient.resetPassword({ newPassword, token: token! });
    setPending(false);
    if (res.error) return setError(authErrorMessage(res.error));
    router.push("/login?reset=1");
  }

  return (
    <form onSubmit={onSubmit} className="card w-full max-w-sm p-6 sm:p-7">
      <h1 className="text-xl font-bold">새 비밀번호 설정</h1>
      <p className="mt-1 text-sm text-muted">바꾸면 다른 기기에서는 모두 로그아웃돼요.</p>
      <div className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="password">
            새 비밀번호 (8자 이상)
          </label>
          <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="confirm">
            새 비밀번호 확인
          </label>
          <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className="input" />
        </div>
      </div>
      {error && <p className="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <button disabled={pending} className="btn btn-primary mt-5 h-11 w-full">
        {pending ? "변경 중…" : "비밀번호 변경"}
      </button>
    </form>
  );
}
