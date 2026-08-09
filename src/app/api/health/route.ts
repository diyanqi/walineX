import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", service: "waline-x" });
  } catch {
    return Response.json({ status: "degraded", service: "waline-x" }, { status: 503 });
  }
}
