import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getSessionUser();
  if (!user) redirect("/login?redirect=/dashboard");

  return (
    <div className="min-h-dvh bg-muted/30">
      <DashboardNav
        name={user.name}
        email={user.email}
        avatar={user.avatar}
        plan={user.plan}
      />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
