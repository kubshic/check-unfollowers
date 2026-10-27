import { AuthForm } from "@/components/AuthForm";
import { googleEnabled } from "@/lib/auth";

export const metadata = { title: "로그인 — 맞팔체크" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string; error?: string }> }) {
  const { reset, error } = await searchParams;
  const notice = reset ? "비밀번호를 바꿨어요. 새 비밀번호로 로그인하세요." : undefined;
  return (
    <div className="w-full max-w-sm">
      {error && (
        <p role="alert" className="mb-3 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
          {error.toLowerCase().includes("token")
            ? "인증 링크가 만료되었거나 올바르지 않아요. 로그인하면 인증 메일을 다시 보내드려요."
            : "로그인을 완료하지 못했어요. 다시 시도해 주세요."}
        </p>
      )}
      <AuthForm mode="login" googleEnabled={googleEnabled} notice={notice} />
    </div>
  );
}
