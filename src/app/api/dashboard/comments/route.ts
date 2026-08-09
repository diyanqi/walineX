import type { NextRequest } from "next/server";
import { apiError, requireApiUser } from "@/lib/api";
import { listDashboardComments } from "@/lib/dashboard";
import { jsonResponse } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const search = request.nextUrl.searchParams;
    const data = await listDashboardComments(user, {
      page: Number(search.get("page")) || 1,
      pageSize: Number(search.get("pageSize")) || 20,
      keyword: search.get("keyword") || undefined,
      status: search.get("status") || undefined,
      instanceId: search.get("instanceId") || undefined,
    });
    return jsonResponse({ errno: 0, ...data }, 200, request);
  } catch (error) {
    return apiError(error);
  }
}
