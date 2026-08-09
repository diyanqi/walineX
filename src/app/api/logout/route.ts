import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { destroySession } from "@/lib/auth";
import { jsonResponse } from "@/lib/http";

export async function POST(request: NextRequest) {
  await destroySession();
  const store = await cookies();
  store.delete("walinex_session");
  return jsonResponse({ errno: 0, data: { ok: true } }, 200, request);
}
