import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getUser()) redirect("/accounts");
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-4 sm:px-6">
      <header className="flex h-16 items-center">
        <Logo />
      </header>
      <main className="flex flex-1 items-start justify-center pt-8 pb-16 sm:pt-16">{children}</main>
    </div>
  );
}
