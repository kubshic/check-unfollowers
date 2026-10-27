import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "로그인 — 맞팔체크" };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
