import { randomBytes, randomUUID } from "node:crypto";

const FIXED_API_BASE_URL = "https://ilinkai.weixin.qq.com";
const ILINK_APP_ID = "bot";
const ILINK_APP_CLIENT_VERSION = "131590";
const STATUS_TIMEOUT_MS = 30_000;
const QR_IMAGE_TTL_MS = 10 * 60 * 1000;

const qrImageCache = new Map<
  string,
  { buffer: Buffer; contentType: string; expiresAt: number }
>();

type WechatQrState =
  | "wait"
  | "scaned"
  | "confirmed"
  | "expired"
  | "scaned_but_redirect"
  | "need_verifycode"
  | "verify_code_blocked"
  | "binded_redirect";

export interface WechatQrStart {
  qrcode: string;
  qrcodeImg: string;
}

export interface WechatQrStatus {
  status: WechatQrState;
  botToken?: string;
  botId?: string;
  baseUrl?: string;
  userId?: string;
  redirectHost?: string;
}

function commonHeaders(): Record<string, string> {
  const uint32 = randomBytes(4).readUInt32BE(0);
  return {
    "Content-Type": "application/json",
    "X-WECHAT-UIN": Buffer.from(String(uint32), "utf-8").toString("base64"),
    "iLink-App-Id": ILINK_APP_ID,
    "iLink-App-ClientVersion": ILINK_APP_CLIENT_VERSION,
  };
}

function normalizeQrImage(value: string): string {
  const trimmed = value.trim();
  if (/^\/\//.test(trimmed)) return `https:${trimmed}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const compact = trimmed.replace(/\s+/g, "");
  if (/^data:image\//i.test(compact)) return compact;
  const mime = /^\/9j/.test(compact) ? "image/jpeg" : "image/png";
  return `data:${mime};base64,${compact}`;
}

function cacheQrImage(
  qrcode: string,
  image: { buffer: Buffer; contentType: string },
): void {
  qrImageCache.set(qrcode, {
    ...image,
    expiresAt: Date.now() + QR_IMAGE_TTL_MS,
  });
}

function cachedQrImage(qrcode: string): { buffer: Buffer; contentType: string } | null {
  const entry = qrImageCache.get(qrcode);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    qrImageCache.delete(qrcode);
    return null;
  }
  return { buffer: entry.buffer, contentType: entry.contentType };
}

async function loadQrImage(value: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  const trimmed = value.trim();
  if (/^\/\//.test(trimmed) || /^https?:\/\//i.test(trimmed)) {
    const url = /^\/\//.test(trimmed) ? `https:${trimmed}` : trimmed;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`微信二维码图片获取失败：HTTP ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      buffer,
      contentType: sniffImageType(buffer) || response.headers.get("content-type") || "image/png",
    };
  }
  const compact = trimmed.replace(/\s+/g, "");
  const dataMatch = /^data:image\/([a-z0-9.+-]+);base64,(.*)$/i.exec(compact);
  if (dataMatch) {
    const buffer = Buffer.from(dataMatch[2], "base64");
    return {
      buffer,
      contentType: sniffImageType(buffer) || `image/${dataMatch[1]}`,
    };
  }
  const buffer = Buffer.from(compact, "base64");
  return {
    buffer,
    contentType: sniffImageType(buffer) || "image/png",
  };
}

function sniffImageType(buffer: Buffer): string | null {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return "image/png";
  }
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 6 &&
    (buffer.toString("ascii", 0, 6) === "GIF87a" || buffer.toString("ascii", 0, 6) === "GIF89a")
  ) {
    return "image/gif";
  }
  if (buffer.length >= 12 && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export async function startWechatQr(): Promise<WechatQrStart> {
  const response = await fetch(
    `${FIXED_API_BASE_URL}/ilink/bot/get_bot_qrcode?bot_type=3`,
    {
      method: "POST",
      headers: commonHeaders(),
      body: JSON.stringify({ local_token_list: [] }),
    },
  );
  if (!response.ok) {
    throw new Error(`微信二维码获取失败：HTTP ${response.status}`);
  }
  const payload = (await response.json()) as {
    qrcode?: string;
    qrcode_img_content?: string;
  };
  if (!payload.qrcode || !payload.qrcode_img_content) {
    throw new Error("微信二维码响应不完整");
  }
  const image = await loadQrImage(payload.qrcode_img_content);
  cacheQrImage(payload.qrcode, image);
  return {
    qrcode: payload.qrcode,
    qrcodeImg: normalizeQrImage(payload.qrcode_img_content),
  };
}

export async function fetchQrImage(
  qrcode: string,
  rawImage?: string,
): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  if (rawImage) {
    const image = await loadQrImage(rawImage);
    cacheQrImage(qrcode, image);
    return image;
  }
  const cached = cachedQrImage(qrcode);
  if (cached) return cached;
  const response = await fetch(
    `${FIXED_API_BASE_URL}/ilink/bot/get_bot_qrcode?bot_type=3`,
    {
      method: "POST",
      headers: commonHeaders(),
      body: JSON.stringify({ local_token_list: [] }),
    },
  );
  if (!response.ok) {
    throw new Error(`微信二维码获取失败：HTTP ${response.status}`);
  }
  const payload = (await response.json()) as {
    qrcode?: string;
    qrcode_img_content?: string;
  };
  if (!payload.qrcode || !payload.qrcode_img_content) {
    throw new Error("微信二维码响应不完整");
  }
  const image = await loadQrImage(payload.qrcode_img_content);
  cacheQrImage(payload.qrcode, image);
  if (payload.qrcode !== qrcode) cacheQrImage(qrcode, image);
  return image;
}

async function fetchQrStatus(baseUrl: string, qrcode: string): Promise<WechatQrStatus> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), STATUS_TIMEOUT_MS);
  try {
    const response = await fetch(
      `${baseUrl}/ilink/bot/get_qrcode_status?qrcode=${encodeURIComponent(qrcode)}`,
      {
        headers: commonHeaders(),
        signal: controller.signal,
        cache: "no-store",
      },
    );
    if (!response.ok) {
      throw new Error(`微信二维码状态请求失败：HTTP ${response.status}`);
    }
    const payload = (await response.json()) as {
      status?: WechatQrState;
      bot_token?: string;
      ilink_bot_id?: string;
      baseurl?: string;
      ilink_user_id?: string;
      redirect_host?: string;
    };
    return {
      status: payload.status || "wait",
      botToken: payload.bot_token,
      botId: payload.ilink_bot_id,
      baseUrl: payload.baseurl,
      userId: payload.ilink_user_id,
      redirectHost: payload.redirect_host,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { status: "wait" };
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

export async function pollWechatQr(
  qrcode: string,
  baseUrl = FIXED_API_BASE_URL,
): Promise<WechatQrStatus> {
  let result = await fetchQrStatus(baseUrl, qrcode);
  if (result.status === "scaned_but_redirect" && result.redirectHost) {
    const redirected = result.redirectHost.startsWith("http")
      ? result.redirectHost
      : `https://${result.redirectHost}`;
    result = await fetchQrStatus(redirected, qrcode);
  }
  return result;
}

export async function sendWechatMessage(params: {
  baseUrl: string;
  botToken: string;
  userId: string;
  text: string;
}): Promise<void> {
  const { baseUrl, botToken, userId, text } = params;
  const response = await fetch(`${baseUrl}/ilink/bot/sendmessage`, {
    method: "POST",
    headers: {
      ...commonHeaders(),
      AuthorizationType: "ilink_bot_token",
      Authorization: `Bearer ${botToken}`,
    },
    body: JSON.stringify({
      msg: {
        from_user_id: "",
        to_user_id: userId,
        client_id: randomUUID(),
        message_type: 2,
        message_state: 2,
        item_list: [{ type: 1, text_item: { text } }],
      },
      base_info: {
        channel_version: "2.4.6",
        bot_agent: "WalineX/1.0",
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`微信消息发送失败：HTTP ${response.status}`);
  }
  const payload = (await response.json().catch(() => ({}))) as {
    ret?: number;
    errmsg?: string;
  };
  if (payload.ret && payload.ret !== 0) {
    throw new Error(payload.errmsg || `微信消息发送失败：ret=${payload.ret}`);
  }
}
