const debugAppIdSet = new Set(
  (import.meta.env.NEXT_PUBLIC_DEBUG_APP_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
);

const debugBundleIdSet = new Set(
  (import.meta.env.NEXT_PUBLIC_DEBUG_BUNDLE_IDS || '')
    .split(',')
    .map(id => id.trim())
    .filter(Boolean)
);

export interface AppLike {
  appId?: string;
  id?: string;
  app_identifier?: string;
  app_store_id?: string;
  bundleId?: string;
  bundle_id?: string;
  [key: string]: unknown;
}

export function isDebugTarget(app: AppLike): boolean {
  const appIds = [
    app.appId,
    app.id,
    app.app_identifier,
    app.app_store_id
  ]
    .filter(Boolean)
    .map(String);

  const bundleIds = [app.bundleId, app.bundle_id]
    .filter(Boolean)
    .map(String);

  return (
    appIds.some(id => debugAppIdSet.has(id)) ||
    bundleIds.some(id => debugBundleIdSet.has(id))
  );
}

