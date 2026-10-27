import { headers } from "next/headers";
import { auth, requireUser } from "@/lib/auth";
import { ChangePasswordForm, DeleteUserForm } from "@/components/SettingsForms";

export const metadata = { title: "설정 — 맞팔체크" };

export default async function SettingsPage() {
  const user = await requireUser();
  const linked = await auth.api.listUserAccounts({ headers: await headers() });
  const hasPassword = linked.some((a) => a.providerId === "credential");
  const hasGoogle = linked.some((a) => a.providerId === "google");
  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-2xl font-bold">설정</h1>
      <section className="card p-5">
        <h2 className="text-sm font-semibold text-muted">로그인 이메일</h2>
        <p className="mt-1 font-semibold">{user.email}</p>
        <p className="mt-1 text-sm text-muted">
          {[hasPassword && "이메일·비밀번호", hasGoogle && "Google"].filter(Boolean).join(", ")}로 로그인할 수 있어요.
        </p>
      </section>
      {hasPassword && (
        <section className="card p-5">
          <h2 className="mb-4 font-bold">비밀번호 변경</h2>
          <ChangePasswordForm />
        </section>
      )}
      <section className="card p-5">
        <h2 className="font-bold">개인정보</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          올린 파일 원본은 서버에 저장하지 않아요. 비교에 필요한 인스타그램 아이디와 팔로우 날짜만 체크 기록으로
          저장되고, 기록이나 계정을 삭제하면 함께 지워져요.
        </p>
      </section>
      <section className="card p-5">
        <h2 className="mb-1 font-bold text-danger">회원 탈퇴</h2>
        <p className="mb-4 text-sm text-muted">모든 계정과 체크 기록이 즉시 삭제돼요.</p>
        <DeleteUserForm hasPassword={hasPassword} />
      </section>
    </div>
  );
}
