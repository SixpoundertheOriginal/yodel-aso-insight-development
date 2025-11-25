/**
 * Brand & Noise Helpers (shared across engine + KPI + competitor surfaces)
 */

export interface BrandRatioStats {
  branded: number;
  generic: number;
  lowValue: number;
  totalMeaningful: number;
  brandRatio: number;
  genericRatio: number;
}

export function computeBrandRatioStats(
  classifiedCombos: { text: string; type?: string; brandClassification?: string }[] = [],
  lowValueCombos: { text: string }[] = []
): BrandRatioStats {
  const meaningful = classifiedCombos.filter((combo) => combo.type !== 'low_value');
  const branded = meaningful.filter(
    (combo) => combo.brandClassification === 'brand' || combo.type === 'branded'
  ).length;
  const generic = meaningful.filter(
    (combo) => combo.brandClassification === 'generic' || combo.type === 'generic'
  ).length;
  const totalMeaningful = branded + generic;
  const lowValue = (lowValueCombos || []).length;

  return {
    branded,
    generic,
    lowValue,
    totalMeaningful,
    brandRatio: totalMeaningful > 0 ? branded / totalMeaningful : 0,
    genericRatio: totalMeaningful > 0 ? generic / totalMeaningful : 0,
  };
}

export function getNoiseSeverity(noiseRatio: number) {
  if (noiseRatio > 0.5) {
    return { level: 'severe' as const, penalty: 30 };
  }
  if (noiseRatio > 0.3) {
    return { level: 'warning' as const, penalty: 15 };
  }
  return { level: 'ok' as const, penalty: 0 };
}
