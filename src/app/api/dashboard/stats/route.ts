import type { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/api";
import { apiError } from "@/lib/api";
import { dashboardStats } from "@/lib/dashboard";
import { jsonResponse } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const data = await dashboardStats(user);
    return jsonResponse({ errno: 0, data }, 200, request);
  } catch (error) {
    return apiError(error);
  }
}
