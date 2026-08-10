import { createHash } from "node:crypto";
import type { Plan } from "@prisma/client";
import { env, rootUrl } from "@/lib/env";
import { PLANS } from "@/lib/plans";

export type PlanPeriod = "month" | "year";

export interface EpayConfig {
  pid: string;
  key: string;
  gateway: string;
}

export function epayConfig(): EpayConfig {
  const pid = env("EPAY_PID").trim();
  const key = env("EPAY_KEY").trim();
  const gateway = env("EPAY_GATEWAY").trim().replace(/\/+$/, "");
  if (!pid || !key || !gateway) {
    throw new Error("易支付尚未配置，请联系管理员");
  }
  return { pid, key, gateway };
}

export function epaySign(params: Record<string, string>, key: string): string {
  const entries = Object.entries(params)
    .filter(([name, value]) => value !== "" && name !== "sign" && name !== "sign_type")
    .sort(([a], [b]) => a.localeCompare(b));
  const raw = entries.map(([name, value]) => `${name}=${value}`).join("&");
  return createHash("md5").update(`${raw}${key}`).digest("hex");
}

export function epayOrderUrl(options: {
  outTradeNo: string;
  plan: Plan;
  period: PlanPeriod;
  type?: "wxpay" | "alipay" | "qqpay";
}): string {
  const { outTradeNo, plan, period, type = "wxpay" } = options;
  const config = epayConfig();
  const price = period === "year" ? PLANS[plan].priceYearly : PLANS[plan].priceMonthly;
  const periodLabel = period === "year" ? "年付" : "月付";
  const params: Record<string, string> = {
    pid: config.pid,
    type,
    out_trade_no: outTradeNo,
    notify_url: rootUrl("/api/plans/notify"),
    return_url: rootUrl("/api/plans/return"),
    name: `${PLANS[plan].name} ${periodLabel}`,
    money: price.toFixed(2),
    sign_type: "MD5",
  };
  const sign = epaySign(params, config.key);
  const search = new URLSearchParams({ ...params, sign });
  return `${config.gateway}/submit.php?${search.toString()}`;
}

export function verifyEpayNotify(params: Record<string, string>): boolean {
  const config = epayConfig();
  const sign = params.sign || "";
  return sign !== "" && sign.toLowerCase() === epaySign(params, config.key);
}
