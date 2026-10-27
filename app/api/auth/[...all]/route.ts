import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { ensureDb } from "@/lib/db";

const handler = toNextJsHandler(async (request: Request) => {
  await ensureDb();
  return auth.handler(request);
});

export const { GET, POST } = handler;
