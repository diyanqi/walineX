import { env } from "@/lib/env";

export function adminEmails(): string[] {
  return env("ADMIN_EMAIL")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return adminEmails().includes(normalized);
}
