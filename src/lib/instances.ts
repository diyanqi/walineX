import type { Instance, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verifyWalineToken } from "@/lib/auth";
import type { NextRequest } from "next/server";

export async function getInstanceBySlug(slug: string): Promise<Instance | null> {
  return prisma.instance.findUnique({
    where: { slug },
  });
}

export async function resolveInstance(slug: string): Promise<
  | { instance: Instance; error: null }
  | { instance: null; error: { errno: number; errmsg: string } }
> {
  const instance = await getInstanceBySlug(slug);
  if (!instance || instance.deletedAt) {
    return { instance: null, error: { errno: 404, errmsg: "评论实例不存在。" } };
  }
  if (instance.status !== "active") {
    return { instance: null, error: { errno: 403, errmsg: "评论实例已停用。" } };
  }
  return { instance, error: null };
}

export async function authOwnerFromRequest(
  request: NextRequest,
  slug: string,
): Promise<{ isOwner: boolean; user: User | null }> {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const payload = token ? await verifyWalineToken(token, slug) : null;
  if (!payload) return { isOwner: false, user: null };
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || user.deletedAt) return { isOwner: false, user: null };
  const instance = await prisma.instance.findUnique({ where: { slug } });
  return { isOwner: instance?.userId === user.id, user };
}
