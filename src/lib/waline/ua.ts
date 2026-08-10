import { UAParser } from "ua-parser-js";

export function parseUserAgent(
  ua?: string | null,
): { browser?: string; os?: string } {
  if (!ua) return {};
  const parsed = new UAParser(ua).getResult();
  const browser = [parsed.browser.name, parsed.browser.version]
    .filter(Boolean)
    .join(" ");
  const os = [parsed.os.name, parsed.os.version].filter(Boolean).join(" ");
  return { browser, os };
}
