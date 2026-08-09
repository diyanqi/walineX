import type { NextRequest } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { ApiError, apiError, requireApiUser } from "@/lib/api";
import { canCreateInstance, instanceLimitsFromPlan } from "@/lib/usage";
import { verifyCapToken } from "@/lib/cap";
import { instanceUrl } from "@/lib/env";
import { jsonResponse } from "@/lib/http";

function publicInstance(instance: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: Date;
}) {
  return {
    ...instance,
    url: instanceUrl(instance.slug),
    apiUrl: `${instanceUrl(instance.slug)}/api`,
  };
}

function defaultSlug(): string {
  return `site-${randomBytes(4).toString("hex")}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const instances = await prisma.instance.findMany({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
    return jsonResponse(
      { errno: 0, data: instances.map((instance) => publicInstance(instance)) },
      200,
      request,
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireApiUser();
    const body = (await request.json()) as {
      name?: string;
      slug?: string;
      description?: string;
      capToken?: string;
    };
    const name = String(body.name || "").trim().slice(0, 80);
    if (!name) throw new ApiError("实例名称不能为空");
    if (!body.capToken || !(await verifyCapToken(body.capToken, "instance"))) {
      throw new ApiError("请先完成人机验证");
    }
    const allowed = await canCreateInstance(user);
    if (!allowed.ok) throw new ApiError(allowed.message || "实例数量已达上限", 403);

    const slug = String(body.slug || defaultSlug()).toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) {
      throw new ApiError("实例标识只能包含小写字母、数字和连字符");
    }
    const exists = await prisma.instance.findUnique({ where: { slug } });
    if (exists) throw new ApiError("该实例标识已被占用");

    const limits = instanceLimitsFromPlan(user.plan);
    const instance = await prisma.instance.create({
      data: {
        slug,
        name,
        description: body.description?.trim().slice(0, 500) || null,
        userId: user.id,
        monthlyCommentLimit: limits.monthlyCommentLimit,
        totalCommentLimit: limits.totalCommentLimit,
      },
    });
    return jsonResponse(
      { errno: 0, data: publicInstance(instance) },
      201,
      request,
    );
  } catch (error) {
    return apiError(error);
  }
}
