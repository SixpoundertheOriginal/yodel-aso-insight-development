export const MFP_BUNDLE = 'com.myfitnesspal.mfp';
export const MFP_TRACK_ID = 341232718;
export function isMFP(app: { bundleId?: string; trackId?: number; trackName?: string }) {
  return app?.bundleId === MFP_BUNDLE || app?.trackId === MFP_TRACK_ID || /myfitnesspal/i.test(app?.trackName ?? '');
}
export const CA_DEBUG = import.meta.env.VITE_CA_DEBUG_MFP === 'true';
export function cid() {
  return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 10);
}
