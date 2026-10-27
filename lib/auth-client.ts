import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

type AuthError = { code?: string; status?: number; message?: string } | null | undefined;

const MESSAGES: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "이메일 또는 비밀번호가 올바르지 않아요.",
  INVALID_PASSWORD: "비밀번호가 올바르지 않아요.",
  USER_ALREADY_EXISTS: "이미 가입된 이메일이에요.",
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: "이미 가입된 이메일이에요.",
  PASSWORD_TOO_SHORT: "비밀번호는 8자 이상이어야 해요.",
  PASSWORD_TOO_LONG: "비밀번호가 너무 길어요.",
  INVALID_EMAIL: "올바른 이메일 주소를 입력해 주세요.",
  EMAIL_NOT_VERIFIED: "이메일 인증이 필요해요. 인증 메일을 다시 보냈으니 메일함을 확인해 주세요.",
  INVALID_TOKEN: "링크가 만료되었거나 올바르지 않아요. 다시 요청해 주세요.",
  SESSION_EXPIRED: "보안을 위해 다시 로그인한 뒤 시도해 주세요.",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "비밀번호로 가입한 계정이 아니에요.",
};

export function authErrorMessage(error: AuthError) {
  if (!error) return "알 수 없는 오류가 발생했어요.";
  if (error.status === 429) return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  return (error.code && MESSAGES[error.code]) || "요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.";
}
