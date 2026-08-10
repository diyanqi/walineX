import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { PlansManager } from "@/components/dashboard/plans-manager";

export const metadata: Metadata = {
  title: "计划",
};

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/dashboard/plans");
  const params = await searchParams;
  const paidMessage =
    params.paid === "1"
      ? "支付成功，套餐已生效。"
      : params.paid === "0"
        ? "支付未完成，可重新下单。"
        : null;
  return (
    <PlansManager
      currentPlan={user.plan}
      planExpiresAt={user.planExpiresAt?.toISOString() || null}
      paidMessage={paidMessage}
    />
  );
}
