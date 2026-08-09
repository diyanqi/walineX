import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { instanceUrl } from "@/lib/env";
import { planLimits } from "@/lib/plans";
import {
  InstancesManager,
  type DashboardInstance,
} from "@/components/dashboard/instances-manager";

export const metadata: Metadata = {
  title: "实例",
};

export default async function InstancesPage() {
  const user = await getSessionUser();
  if (!user) return null;
  const instances = await prisma.instance.findMany({
    where: { userId: user.id, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  const data: DashboardInstance[] = instances.map((instance) => ({
    id: instance.id,
    slug: instance.slug,
    name: instance.name,
    description: instance.description,
    targetOrigins: instance.targetOrigins,
    status: instance.status,
    createdAt: instance.createdAt,
    url: instanceUrl(instance.slug),
    apiUrl: `${instanceUrl(instance.slug)}/api`,
  }));
  return (
    <InstancesManager
      instances={data}
      planInstances={planLimits(user.plan).instances}
      urlPrefix={instanceUrl("")}
    />
  );
}
