import type { NextRequest } from "next/server";
import type { Instance, User } from "@prisma/client";
import { authOwnerFromRequest, resolveInstance } from "@/lib/instances";
import { errorResponse, jsonResponse } from "@/lib/http";

export async function tenantContext(request: NextRequest, slug: string) {
  const resolved = await resolveInstance(slug);
  if (resolved.error) {
    return {
      instance: null as Instance | null,
      isOwner: false,
      user: null as User | null,
      response: errorResponse(resolved.error.errno, resolved.error.errmsg, request),
    };
  }
  const auth = await authOwnerFromRequest(request, slug);
  return {
    instance: resolved.instance,
    isOwner: auth.isOwner,
    user: auth.user,
    response: null as Response | null,
  };
}

export function tenantJson(payload: unknown, request: NextRequest, status = 200): Response {
  return jsonResponse(payload, status, request);
}
