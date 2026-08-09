import { getSessionUser } from "@/lib/auth";
import type { User } from "@prisma/client";

export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function requireApiUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new ApiError("请先登录", 401);
  return user;
}

export function apiError(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json({ errno: error.status, errmsg: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ errno: 500, errmsg: "服务器内部错误" }, { status: 500 });
}
