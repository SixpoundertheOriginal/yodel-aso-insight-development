/**
 * Color Extractor Utility
 *
 * Extracts dominant colors from screenshot images using Canvas API.
 * Uses downscaling (50x50) and simple color clustering for performance.
 *
 * Phase 1B: Screenshot Analysis Integration
 */

export interface ColorInfo {
  hex: string;
  rgb: { r: number; g: number; b: number };
  percentage: number;
}

export interface ColorExtractionResult {
  dominantColors: ColorInfo[];
  averageBrightness: number;
  averageSaturation: number;
  colorCount: number;
}

/**
 * Extract dominant colors from an image URL
 */
export async function extractColors(
  imageUrl: string,
  maxColors: number = 5
): Promise<ColorExtractionResult> {
  try {
    // Load image
    const img = await loadImage(imageUrl);

    // Create canvas and downscale for performance
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Downscale to 50x50 for fast processing
    const targetSize = 50;
    canvas.width = targetSize;
    canvas.height = targetSize;

    // Draw downscaled image
    ctx.drawImage(img, 0, 0, targetSize, targetSize);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
    const pixels = imageData.data;

    // Extract colors
    const colors: Array<{ r: number; g: number; b: number }> = [];
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      // Skip transparent pixels
      if (a < 128) continue;

      colors.push({ r, g, b });
    }

    // Cluster colors
    const clusters = clusterColors(colors, maxColors);

    // Calculate brightness and saturation
    const { brightness, saturation } = calculateColorMetrics(colors);

    return {
      dominantColors: clusters,
      averageBrightness: brightness,
      averageSaturation: saturation,
      colorCount: clusters.length
    };
  } catch (error) {
    console.error('[ColorExtractor] Failed to extract colors:', error);
    throw error;
  }
}

/**
 * Load image from URL
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';

    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));

    img.src = url;
  });
}

/**
 * Simple k-means color clustering
 */
function clusterColors(
  colors: Array<{ r: number; g: number; b: number }>,
  k: number
): ColorInfo[] {
  if (colors.length === 0) {
    return [];
  }

  // Initialize centroids with random colors
  const centroids = colors
    .sort(() => Math.random() - 0.5)
    .slice(0, k)
    .map(c => ({ ...c }));

  // Run k-means for 5 iterations (balance speed vs accuracy)
  for (let iter = 0; iter < 5; iter++) {
    // Assign each color to nearest centroid
    const clusters: Array<Array<{ r: number; g: number; b: number }>> = Array.from(
      { length: k },
      () => []
    );

    for (const color of colors) {
      let minDist = Infinity;
      let closestIdx = 0;

      for (let i = 0; i < centroids.length; i++) {
        const dist = colorDistance(color, centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          closestIdx = i;
        }
      }

      clusters[closestIdx].push(color);
    }

    // Update centroids
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue;

      const sum = clusters[i].reduce(
        (acc, c) => ({
          r: acc.r + c.r,
          g: acc.g + c.g,
          b: acc.b + c.b
        }),
        { r: 0, g: 0, b: 0 }
      );

      centroids[i] = {
        r: Math.round(sum.r / clusters[i].length),
        g: Math.round(sum.g / clusters[i].length),
        b: Math.round(sum.b / clusters[i].length)
      };
    }
  }

  // Calculate percentages
  const totalPixels = colors.length;
  const results: ColorInfo[] = [];

  for (const centroid of centroids) {
    const count = colors.filter(
      c => colorDistance(c, centroid) < 50
    ).length;

    if (count === 0) continue;

    results.push({
      hex: rgbToHex(centroid.r, centroid.g, centroid.b),
      rgb: centroid,
      percentage: (count / totalPixels) * 100
    });
  }

  // Sort by percentage
  return results.sort((a, b) => b.percentage - a.percentage);
}

/**
 * Calculate Euclidean distance between two colors
 */
function colorDistance(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Calculate average brightness and saturation
 */
function calculateColorMetrics(
  colors: Array<{ r: number; g: number; b: number }>
): { brightness: number; saturation: number } {
  if (colors.length === 0) {
    return { brightness: 0, saturation: 0 };
  }

  let totalBrightness = 0;
  let totalSaturation = 0;

  for (const color of colors) {
    // Brightness (perceived luminance)
    const brightness = (0.299 * color.r + 0.587 * color.g + 0.114 * color.b) / 255;
    totalBrightness += brightness;

    // Saturation
    const max = Math.max(color.r, color.g, color.b);
    const min = Math.min(color.r, color.g, color.b);
    const saturation = max === 0 ? 0 : (max - min) / max;
    totalSaturation += saturation;
  }

  return {
    brightness: totalBrightness / colors.length,
    saturation: totalSaturation / colors.length
  };
}
