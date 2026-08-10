import type { NextRequest } from "next/server";
import { requireOwnedInstance } from "@/lib/dashboard";
import { apiError } from "@/lib/api";
import { exportWalineData } from "@/lib/waline/io";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const instance = await requireOwnedInstance(id);
    const payload = await exportWalineData(instance.id);
    return Response.json(payload, {
      headers: {
        "content-disposition": `attachment; filename="${instance.slug}-waline-export.json"`,
        "content-type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
