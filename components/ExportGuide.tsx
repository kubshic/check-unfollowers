const STEPS = [
  "인스타그램 앱 → 프로필 → 오른쪽 위 ☰ → 계정 센터",
  "내 정보 및 권한 → 내 정보 내보내기 → 내보내기 만들기",
  "체크할 인스타그램 계정 선택 → 기기로 내보내기",
  "정보 맞춤 설정에서 '팔로워 및 팔로잉'만 선택",
  "기간: 전체 기간 · 형식: JSON 으로 설정 후 내보내기 시작",
  "준비 완료 알림이 오면(보통 몇 분~몇 시간) ZIP 파일을 내려받기",
];

export function ExportGuide({ open = false }: { open?: boolean }) {
  return (
    <details open={open} className="card group p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
        인스타그램에서 파일 받는 방법
        <span className="text-faint transition group-open:rotate-180">▾</span>
      </summary>
      <ol className="mt-4 space-y-2.5 text-sm">
        {STEPS.map((s, i) => (
          <li key={s} className="flex gap-3">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold">
              {i + 1}
            </span>
            <span className="pt-0.5 leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>
      <div className="mt-4 rounded-xl bg-warn-soft px-4 py-3 text-[13px] leading-relaxed text-warn">
        <b>기간은 꼭 '전체 기간'</b>으로 선택하세요. 기본값(최근 1년 등)으로 받으면 오래전에 팔로우한 사람이 빠져서
        언팔로워가 실제보다 많게 나와요. 형식이 HTML이면 읽을 수 없어요.
      </div>
    </details>
  );
}
