import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions";
import { Logo } from "@/components/Logo";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <Logo href="/accounts" />
          <nav className="flex items-center gap-1 text-sm">
            <Link href="/accounts" className="rounded-lg px-3 py-2 font-medium hover:bg-surface-2">
              내 계정
            </Link>
            <Link href="/settings" className="rounded-lg px-3 py-2 font-medium hover:bg-surface-2">
              설정
            </Link>
            <form action={logout}>
              <button className="rounded-lg px-3 py-2 font-medium text-muted hover:bg-surface-2">로그아웃</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pt-6 pb-20 sm:px-6 sm:pt-8">{children}</main>
    </div>
  );
}
