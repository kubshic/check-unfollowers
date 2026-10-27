import Link from "next/link";
import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { Logo } from "@/components/Logo";

const FEATURES = [
  {
    title: "맞팔 안 하는 사람",
    body: "내가 팔로우하지만 나를 팔로우하지 않는 사람을 팔로우한 날짜와 함께 보여줘요.",
  },
  {
    title: "새로 언팔한 사람",
    body: "지난번 체크 땐 맞팔이었는데 이번에 끊긴 사람만 따로 골라줘요.",
  },
  {
    title: "날짜별 기록",
    body: "체크할 때마다 팔로워·팔로잉 수와 변화가 쌓여 대시보드로 흐름을 볼 수 있어요.",
  },
  {
    title: "원본 파일은 저장 안 함",
    body: "파일은 내 브라우저에서만 읽고, 비교에 필요한 아이디 목록만 저장해요.",
  },
];

export default async function Home() {
  if (await getUser()) redirect("/accounts");

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <header className="flex h-16 items-center justify-between">
        <Logo />
        <Link href="/login" className="btn btn-ghost btn-sm">
          로그인
        </Link>
      </header>

      <section className="pt-14 pb-16 sm:pt-24 text-center">
        <p className="text-sm font-semibold text-muted">인스타그램 언팔로워 기록장</p>
        <h1 className="mt-3 text-[34px] sm:text-5xl font-extrabold leading-tight tracking-tight">
          누가 나를 <span className="brand-text">언팔</span>했는지
          <br />
          날짜별로 기록해요
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-[15px] sm:text-base text-muted leading-relaxed">
          인스타그램에서 내려받은 팔로워·팔로잉 파일을 올리면 맞팔 안 하는 사람과 지난번 대비 새로 언팔한 사람을
          바로 알려드려요. 비밀번호를 요구하지 않아서 계정이 안전해요.
        </p>
        <div className="mt-8 flex justify-center gap-2">
          <Link href="/signup" className="btn btn-brand h-12 px-6 text-[15px]">
            무료로 시작하기
          </Link>
          <Link href="/login" className="btn btn-ghost h-12 px-6 text-[15px]">
            로그인
          </Link>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 pb-20">
        {FEATURES.map((f) => (
          <div key={f.title} className="card p-5">
            <h2 className="font-bold">{f.title}</h2>
            <p className="mt-1.5 text-sm text-muted leading-relaxed">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
