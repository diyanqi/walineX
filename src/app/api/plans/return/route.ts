import { NextResponse, type NextRequest } from "next/server";
import { rootUrl } from "@/lib/env";
import { verifyEpayNotify } from "@/lib/epay";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const paid = verifyEpayNotify(params) && params.trade_status === "TRADE_SUCCESS";
  return NextResponse.redirect(
    new URL(`/dashboard/plans?paid=${paid ? "1" : "0"}`, rootUrl("/")),
  );
}
