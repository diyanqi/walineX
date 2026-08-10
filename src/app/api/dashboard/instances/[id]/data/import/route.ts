import type { NextRequest } from "next/server";
import { requireOwnedInstance } from "@/lib/dashboard";
import { ApiError, apiError } from "@/lib/api";
import { importWalineComments } from "@/lib/waline/io";
import { jsonResponse } from "@/lib/http";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const instance = await requireOwnedInstance(id);
    const contentType = request.headers.get("content-type") || "";
    let payload: unknown;
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!file || typeof file !== "object" || !("text" in file)) {
        throw new ApiError("请上传 JSON 文件");
      }
      try {
        payload = JSON.parse(await (file as File).text());
      } catch {
        throw new ApiError("JSON 文件格式不正确");
      }
    } else {
      payload = await request.json().catch(() => {
        throw new ApiError("JSON 格式不正确");
      });
    }
    const result = await importWalineComments(instance.id, payload);
    return jsonResponse({ errno: 0, data: result }, 200, request);
  } catch (error) {
    return apiError(error);
  }
}
