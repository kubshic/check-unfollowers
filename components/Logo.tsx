import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-bold text-[17px] tracking-tight">
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-lg text-white text-[13px]"
        style={{ background: "var(--brand)" }}
      >
        ⇄
      </span>
      맞팔체크
    </Link>
  );
}
