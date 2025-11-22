/**
 * OCR Estimator Utility
 *
 * Estimates text presence and density in screenshots using edge detection.
 * Does NOT extract actual text (no Tesseract.js dependency).
 * Uses Canvas ImageData for lightweight analysis.
 *
 * Phase 1B: Screenshot Analysis Integration
 */

export interface TextRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface TextEstimationResult {
  textRegions: TextRegion[];
  textDensity: number; // 0-1 scale
  estimatedTextPercentage: number;
  hasTopText: boolean;
  hasBottomText: boolean;
  hasCenterText: boolean;
}

/**
 * Estimate text presence in an image
 */
export async function estimateText(imageUrl: string): Promise<TextEstimationResult> {
  try {
    // Load image
    const img = await loadImage(imageUrl);

    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Use moderate size for edge detection
    const targetWidth = 200;
    const targetHeight = Math.round((img.height / img.width) * targetWidth);
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Draw image
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Get pixel data
    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);

    // Convert to grayscale and detect edges
    const edges = detectEdges(imageData);

    // Analyze text regions
    const textRegions = analyzeTextRegions(edges, targetWidth, targetHeight);

    // Calculate text density
    const textDensity = calculateTextDensity(edges);

    // Detect text positions
    const { hasTopText, hasBottomText, hasCenterText } = detectTextPositions(
      textRegions,
      targetHeight
    );

    return {
      textRegions,
      textDensity,
      estimatedTextPercentage: textDensity * 100,
      hasTopText,
      hasBottomText,
      hasCenterText
    };
  } catch (error) {
    console.error('[OCREstimator] Failed to estimate text:', error);
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
 * Detect edges using simple Sobel operator
 */
function detectEdges(imageData: ImageData): number[] {
  const width = imageData.width;
  const height = imageData.height;
  const pixels = imageData.data;

  // Convert to grayscale
  const gray: number[] = [];
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i];
    const g = pixels[i + 1];
    const b = pixels[i + 2];
    const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;
    gray.push(grayscale);
  }

  // Simple edge detection (horizontal + vertical gradients)
  const edges: number[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      // Horizontal gradient
      const gx =
        -gray[idx - 1 - width] + gray[idx + 1 - width] +
        -2 * gray[idx - 1] + 2 * gray[idx + 1] +
        -gray[idx - 1 + width] + gray[idx + 1 + width];

      // Vertical gradient
      const gy =
        -gray[idx - 1 - width] - 2 * gray[idx - width] - gray[idx + 1 - width] +
        gray[idx - 1 + width] + 2 * gray[idx + width] + gray[idx + 1 + width];

      // Gradient magnitude
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges.push(magnitude);
    }
  }

  return edges;
}

/**
 * Analyze edge data to find text-like regions
 */
function analyzeTextRegions(
  edges: number[],
  width: number,
  height: number
): TextRegion[] {
  const textRegions: TextRegion[] = [];

  // Divide image into grid (10x10 cells)
  const cellsX = 10;
  const cellsY = 10;
  const cellWidth = width / cellsX;
  const cellHeight = height / cellsY;

  for (let cy = 0; cy < cellsY; cy++) {
    for (let cx = 0; cx < cellsX; cx++) {
      const x = Math.floor(cx * cellWidth);
      const y = Math.floor(cy * cellHeight);

      // Calculate average edge density in this cell
      let edgeSum = 0;
      let count = 0;

      for (let py = y; py < y + cellHeight && py < height; py++) {
        for (let px = x; px < x + cellWidth && px < width; px++) {
          const idx = py * (width - 2) + (px - 1);
          if (idx >= 0 && idx < edges.length) {
            edgeSum += edges[idx];
            count++;
          }
        }
      }

      const avgEdgeDensity = count > 0 ? edgeSum / count : 0;

      // Text typically has high edge density (40+ threshold)
      if (avgEdgeDensity > 40) {
        textRegions.push({
          x: (x / width) * 100,
          y: (y / height) * 100,
          width: (cellWidth / width) * 100,
          height: (cellHeight / height) * 100,
          confidence: Math.min(avgEdgeDensity / 100, 1)
        });
      }
    }
  }

  return textRegions;
}

/**
 * Calculate overall text density
 */
function calculateTextDensity(edges: number[]): number {
  if (edges.length === 0) return 0;

  // Count pixels with high edge values (text-like)
  let highEdgeCount = 0;
  for (const edge of edges) {
    if (edge > 40) {
      highEdgeCount++;
    }
  }

  return highEdgeCount / edges.length;
}

/**
 * Detect text positions (top/center/bottom)
 */
function detectTextPositions(
  textRegions: TextRegion[],
  height: number
): { hasTopText: boolean; hasBottomText: boolean; hasCenterText: boolean } {
  let hasTopText = false;
  let hasBottomText = false;
  let hasCenterText = false;

  for (const region of textRegions) {
    const centerY = region.y + region.height / 2;

    if (centerY < 33) {
      hasTopText = true;
    } else if (centerY > 66) {
      hasBottomText = true;
    } else {
      hasCenterText = true;
    }
  }

  return { hasTopText, hasBottomText, hasCenterText };
}
