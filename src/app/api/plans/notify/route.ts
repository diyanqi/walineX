import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { epayConfig, verifyEpayNotify } from "@/lib/epay";
import { activatePaymentOrder } from "@/lib/billing";

function text(value: string): NextResponse {
  return new NextResponse(value, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

async function parseParams(request: NextRequest): Promise<Record<string, string>> {
  const fromSearch = Object.fromEntries(request.nextUrl.searchParams.entries());
  if (Object.keys(fromSearch).length > 0) return fromSearch;
  const form = await request.formData().catch(() => null);
  if (!form) return {};
  return Object.fromEntries(form.entries()) as Record<string, string>;
}

async function handle(request: NextRequest): Promise<NextResponse> {
  try {
    const params = await parseParams(request);
    if (!verifyEpayNotify(params)) return text("fail");
    const config = epayConfig();
    if (params.pid !== config.pid) return text("fail");
    if (params.trade_status !== "TRADE_SUCCESS") return text("success");

    const order = await prisma.paymentOrder.findUnique({
      where: { outTradeNo: params.out_trade_no || "" },
    });
    if (!order) return text("fail");
    if (Math.abs(Number(params.money || 0) - order.amount) > 0.01) {
      return text("fail");
    }
    await activatePaymentOrder(order.id, params.trade_no || "");
    return text("success");
  } catch (error) {
    console.error("EPay notify failed", error);
    return text("fail");
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  return handle(request);
}
