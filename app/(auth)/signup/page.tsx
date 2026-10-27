import { AuthForm } from "@/components/AuthForm";
import { googleEnabled } from "@/lib/auth";

export const metadata = { title: "회원가입 — 맞팔체크" };

export default function SignupPage() {
  return <AuthForm mode="signup" googleEnabled={googleEnabled} />;
}
