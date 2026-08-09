import { redirect } from "next/navigation";
import { instanceUrl } from "@/lib/env";

export default async function TenantUiPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`${instanceUrl(slug)}/ui/login`);
}
