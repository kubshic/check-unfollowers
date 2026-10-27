import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { betterAuth, type BetterAuthOptions } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { dbClient, ensureDb } from "./db";
import { LibsqlDialect } from "./kysely-libsql";
import { mailEnabled, sendResetPasswordMail, sendVerificationMail } from "./mail";

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// 메일 서비스가 없는 배포 환경에선 인증 메일을 보낼 수 없으니 가입 시 인증을 요구하지 않는다.
const requireVerification = mailEnabled || process.env.NODE_ENV !== "production";

export const authOptions = {
  baseURL: process.env.BETTER_AUTH_URL || (vercelUrl ? `https://${vercelUrl}` : undefined),
  database: {
    dialect: new LibsqlDialect(dbClient()),
    type: "sqlite",
    // 원격 Turso(HTTP)에선 요청마다 연결이 달라 BEGIN/COMMIT으로 묶을 수 없다.
    transaction: false,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: requireVerification,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => sendResetPasswordMail(user.email, url),
  },
  emailVerification: {
    sendOnSignUp: requireVerification,
    sendOnSignIn: requireVerification,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => sendVerificationMail(user.email, url),
  },
  socialProviders: googleEnabled
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          prompt: "select_account",
        },
      }
    : {},
  account: {
    // 같은 이메일로 가입한 계정에 구글 로그인을 자동으로 연결한다 (구글은 이메일 소유를 확인해 준다).
    accountLinking: { enabled: true, trustedProviders: ["google"] },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  user: {
    deleteUser: {
      enabled: true,
      beforeDelete: async (user) => {
        const { deleteUserData } = await import("./data");
        await deleteUserData(user.id);
      },
    },
  },
  // 서버리스 환경에서도 인스턴스끼리 공유되도록 DB에 기록한다.
  rateLimit: { storage: "database" },
  plugins: [nextCookies()],
} satisfies BetterAuthOptions;

export const auth = betterAuth(authOptions);

export type User = { id: string; email: string; name: string };

export const getUser = cache(async (): Promise<User | null> => {
  await ensureDb();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  return { id: session.user.id, email: session.user.email, name: session.user.name };
});

export async function requireUser(): Promise<User> {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}
