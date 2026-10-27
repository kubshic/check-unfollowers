import { ResetPasswordForm } from "@/components/PasswordForms";

export const metadata = { title: "새 비밀번호 설정 — 맞팔체크" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;
  return <ResetPasswordForm token={token ?? null} invalid={Boolean(error)} />;
}
