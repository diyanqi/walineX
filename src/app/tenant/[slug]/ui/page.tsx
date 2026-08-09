import { redirect } from "next/navigation";

export default async function TenantUiPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/tenant/${slug}/ui/login`);
}
