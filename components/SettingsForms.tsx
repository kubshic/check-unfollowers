"use client";

import { useActionState } from "react";
import { changePassword, deleteUser } from "@/app/actions";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-3">
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
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      {state?.ok && <p className="text-sm text-good">비밀번호를 바꿨어요.</p>}
      <button disabled={pending} className="btn btn-primary">
        {pending ? "변경 중…" : "비밀번호 변경"}
      </button>
    </form>
  );
}

export function DeleteUserForm() {
  const [state, action, pending] = useActionState(deleteUser, undefined);
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("정말 탈퇴할까요? 등록한 계정과 모든 체크 기록이 삭제되고 되돌릴 수 없어요.")) e.preventDefault();
      }}
      className="space-y-3"
    >
      <div>
        <label className="label" htmlFor="del-password">
          비밀번호 확인
        </label>
        <input id="del-password" name="password" type="password" autoComplete="current-password" required className="input" />
      </div>
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button disabled={pending} className="btn btn-danger">
        {pending ? "삭제 중…" : "회원 탈퇴"}
      </button>
    </form>
  );
}
