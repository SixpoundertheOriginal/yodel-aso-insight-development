export type DemoPreset = {
  country: string;
  app: {
    appId: string;
    name: string;
    developer?: string;
    icon?: string;
    rating?: number;
    reviews?: number;
    applicationCategory?: string;
  };
};

export const DEMO_PRESETS: Record<string, DemoPreset> = {
  // Demo preset for the "Next" organization
  next: {
    country: 'us',
    app: {
      appId: '310633997',
      name: 'Next: Shop Fashion & Homeware',
      developer: 'NEXT Retail Ltd',
    }
  }
};

export function getDemoPresetForSlug(slug?: string | null): DemoPreset | null {
  if (!slug) return null;
  const key = slug.toLowerCase();
  return DEMO_PRESETS[key] || null;
}

