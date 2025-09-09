export function extractAppId(appUrl: string): string {
  const m = appUrl.match(/id(\d{5,})/);
  if (!m) throw new Error("App URL must include id<digits> (e.g., .../id1234567890)");
  return m[1];
}
export function isAppStoreMatch(link: string, appId: string): boolean {
  try {
    const u = new URL(link);
    if (!u.hostname.endsWith("apps.apple.com")) return false;
    return u.pathname.includes(`id${appId}`);
  } catch { return false; }
}
