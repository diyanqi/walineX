export function env(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

export const isProduction = process.env.NODE_ENV === "production";

export const appUrl = env("NEXT_PUBLIC_APP_URL", "http://localhost:3000");
export const rootDomain = env("NEXT_PUBLIC_ROOT_DOMAIN", "waline.infvar.com");
export const instanceDomain = env("NEXT_PUBLIC_INSTANCE_DOMAIN", "instance.waline.infvar.com");

export function instanceUrl(slug: string): string {
  if (isProduction) return `https://${instanceDomain}/${slug}`;
  return `${appUrl}/tenant/${slug}`;
}

export function dashboardUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return rootUrl(`/dashboard${normalized === "/" ? "" : normalized}`);
}

export function rootUrl(path = "/"): string {
  if (isProduction) return `https://${rootDomain}${path}`;
  return `${appUrl}${path}`;
}
