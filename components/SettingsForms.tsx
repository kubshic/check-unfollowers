"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient, authErrorMessage } from "@/lib/auth-client";

export function ChangePasswordForm() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setPending(true);
    setError(null);
    setDone(false);
    const res = await authClient.changePassword({
      currentPassword: String(fd.get("current")),
      newPassword: String(fd.get("next")),
      revokeOtherSessions: true,
    });
    setPending(false);
    if (res.error) return setError(authErrorMessage(res.error));
    form.reset();
    setDone(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <label className="label" htmlFor="current">
          현재 비밀번호
        </label>
        <input id="current" name="current" type="password" autoComplete="current-password" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="next">
          새 비밀번호 (8자 이상)
        </label>
        <input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required className="input" />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      {done && <p className="text-sm text-good">비밀번호를 바꿨어요. 다른 기기에서는 로그아웃됐어요.</p>}
      <button disabled={pending} className="btn btn-primary">
        {pending ? "변경 중…" : "비밀번호 변경"}
      </button>
    </form>
  );
}

export function DeleteUserForm({ hasPassword }: { hasPassword: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!confirm("정말 탈퇴할까요? 등록한 계정과 모든 체크 기록이 삭제되고 되돌릴 수 없어요.")) return;
    const password = hasPassword ? String(new FormData(e.currentTarget).get("password")) : undefined;
    setPending(true);
    setError(null);
    const res = await authClient.deleteUser(password ? { password } : {});
    setPending(false);
    if (res.error) return setError(authErrorMessage(res.error));
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {hasPassword ? (
        <div>
          <label className="label" htmlFor="del-password">
            비밀번호 확인
          </label>
          <input id="del-password" name="password" type="password" autoComplete="current-password" required className="input" />
        </div>
      ) : (
        <p className="text-sm text-muted">보안을 위해 최근 하루 안에 로그인한 상태에서만 탈퇴할 수 있어요.</p>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      <button disabled={pending} className="btn btn-danger">
        {pending ? "삭제 중…" : "회원 탈퇴"}
      </button>
    </form>
  );
}
