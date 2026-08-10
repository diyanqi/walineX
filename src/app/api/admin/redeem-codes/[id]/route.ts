import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError, requireAdmin } from "@/lib/api";
import { jsonResponse } from "@/lib/http";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    await requireAdmin();
    await prisma.redeemCode.delete({ where: { id } });
    return jsonResponse({ errno: 0, data: { ok: true } }, 200, request);
  } catch (error) {
    return apiError(error);
  }
}
