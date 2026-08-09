import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { requireOwnedInstance } from "@/lib/dashboard";
import { jsonResponse } from "@/lib/http";

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; wordId: string }> },
) {
  try {
    const { id, wordId } = await context.params;
    await requireOwnedInstance(id);
    await prisma.sensitiveWord.deleteMany({
      where: { id: wordId, instanceId: id },
    });
    return jsonResponse({ errno: 0, data: { ok: true } }, 200);
  } catch (error) {
    return apiError(error);
  }
}
