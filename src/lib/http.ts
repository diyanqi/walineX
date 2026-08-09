import type { NextRequest } from "next/server";

export function corsHeaders(request?: NextRequest): Record<string, string> {
  const origin = request?.headers.get("origin");
  return {
    "access-control-allow-origin": origin || "*",
    "access-control-allow-methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "Content-Type, Authorization, X-Requested-With",
    "access-control-max-age": "86400",
    "x-content-type-options": "nosniff",
    "cache-control": "no-store",
    ...(origin ? { vary: "Origin" } : {}),
  };
}

export function jsonResponse(
  payload: unknown,
  status = 200,
  request?: NextRequest,
  extraHeaders?: Record<string, string>,
): Response {
  return Response.json(payload, {
    status,
    headers: { ...corsHeaders(request), ...extraHeaders },
  });
}

export function successResponse(data: unknown, request?: NextRequest): Response {
  return jsonResponse({ errno: 0, data }, 200, request);
}

export function errorResponse(
  errno: number,
  errmsg: string,
  request?: NextRequest,
  status = errno === 429 ? 429 : errno === 403 ? 403 : errno === 404 ? 404 : 400,
): Response {
  return jsonResponse({ errno, errmsg }, status, request);
}
