import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AdminRedeemCodes } from "@/components/dashboard/admin-redeem-codes";

export const metadata: Metadata = {
  title: "管理",
};

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/dashboard/admin");
  if (!user.isAdmin) redirect("/dashboard");
  const codes = await prisma.redeemCode.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return (
    <AdminRedeemCodes
      initialItems={codes.map((code) => ({
        id: code.id,
        code: code.code,
        plan: code.plan as "starter" | "pro",
        durationDays: code.durationDays,
        maxUses: code.maxUses,
        usedCount: code.usedCount,
        expiresAt: code.expiresAt?.toISOString() || null,
        createdAt: code.createdAt.toISOString(),
      }))}
    />
  );
}
