import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "회원가입 — 맞팔체크" };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
