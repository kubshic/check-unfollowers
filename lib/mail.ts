import "server-only";

const FROM = process.env.EMAIL_FROM || "맞팔체크 <onboarding@resend.dev>";

export const mailEnabled = Boolean(process.env.RESEND_API_KEY);

function layout(title: string, body: string, cta: { label: string; url: string }) {
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f6f6f8;font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Malgun Gothic',sans-serif;color:#17171c">
<div style="max-width:440px;margin:0 auto;padding:40px 20px">
  <p style="font-weight:700;font-size:17px;margin:0 0 24px">맞팔체크</p>
  <div style="background:#fff;border:1px solid #e4e4ea;border-radius:16px;padding:28px">
    <h1 style="font-size:20px;margin:0 0 12px">${title}</h1>
    <p style="font-size:15px;line-height:1.6;color:#4a4a55;margin:0 0 24px">${body}</p>
    <a href="${cta.url}" style="display:inline-block;background:#17171c;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 20px;border-radius:10px">${cta.label}</a>
    <p style="font-size:12px;line-height:1.6;color:#9b9ba7;margin:24px 0 0">버튼이 안 눌리면 아래 주소를 브라우저에 붙여넣으세요.<br>${cta.url}</p>
  </div>
  <p style="font-size:12px;color:#9b9ba7;margin:16px 4px 0">직접 요청하지 않았다면 이 메일은 무시하셔도 돼요.</p>
</div></body></html>`;
}

async function send(to: string, subject: string, html: string, url: string) {
  if (!mailEnabled) {
    // 메일 서비스를 연결하기 전(로컬 개발)에는 서버 로그로 링크를 확인한다.
    console.info(`[mail] to=${to} subject="${subject}"\n  ${url}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) throw new Error(`메일 발송 실패 (${res.status}): ${await res.text()}`);
}

export function sendVerificationMail(to: string, url: string) {
  return send(
    to,
    "[맞팔체크] 이메일 주소를 인증해 주세요",
    layout("이메일 인증", "아래 버튼을 누르면 가입이 완료되고 바로 로그인돼요. 링크는 1시간 동안 유효해요.", {
      label: "이메일 인증하기",
      url,
    }),
    url,
  );
}

export function sendResetPasswordMail(to: string, url: string) {
  return send(
    to,
    "[맞팔체크] 비밀번호 재설정 안내",
    layout("비밀번호 재설정", "아래 버튼을 눌러 새 비밀번호를 설정하세요. 링크는 1시간 동안 유효해요.", {
      label: "새 비밀번호 설정하기",
      url,
    }),
    url,
  );
}
