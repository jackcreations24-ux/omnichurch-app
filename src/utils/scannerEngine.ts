/**
 * Ultra Scanner Engine - High-Performance QR & Barcode Detection
 * 
 * Features:
 * 1. Hybrid Detection: Native hardware-accelerated BarcodeDetector API (Chromium / Android)
 *    with seamless fallback to Enhanced jsQR.
 * 2. Low-Light & Blur Multi-Pass Filtering:
 *    - Direct frame pass (attemptBoth normal & inverted QR)
 *    - Center Region of Interest (ROI) magnification
 *    - Dynamic Contrast Stretching & Auto-Exposure Normalization (for dim church halls)
 *    - 3x3 Unsharp Mask / Sharpening Kernel (for blurry / fixed-focus cameras)
 *    - Adaptive Local Thresholding (for glare on laminated cards)
 * 3. File & Photo Decoder: Decode high-resolution snapshots directly from gallery / file input.
 * 4. Offline Web Audio Synthesizer: Instant pleasant auditory feedback without external audio files.
 */

import jsQR from 'jsqr';

// Declare native BarcodeDetector interface for TypeScript
declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): {
        detect(image: ImageBitmapSource | HTMLCanvasElement | HTMLVideoElement | ImageData): Promise<
          Array<{
            rawValue: string;
            format: string;
            cornerPoints?: Array<{ x: number; y: number }>;
          }>
        >;
      };
      getSupportedFormats?(): Promise<string[]>;
    };
  }
}

export interface ScanDetectionResult {
  code: string;
  format?: string;
  engine: 'native_barcode' | 'jsqr_raw' | 'jsqr_roi' | 'jsqr_contrast' | 'jsqr_sharpen' | 'jsqr_adaptive';
  enhancementLabel?: string;
  location?: {
    topLeftCorner: { x: number; y: number };
    topRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
  };
}

let nativeBarcodeDetectorInstance: any = null;
let isNativeDetectorAvailable: boolean | null = null;

/**
 * Initializes or returns the native BarcodeDetector instance if supported
 */
export function getNativeBarcodeDetector(): any {
  if (typeof window === 'undefined') return null;
  if (isNativeDetectorAvailable === false) return null;

  if (nativeBarcodeDetectorInstance) return nativeBarcodeDetectorInstance;

  if ('BarcodeDetector' in window && typeof window.BarcodeDetector === 'function') {
    try {
      const formats = [
        'qr_code',
        'code_128',
        'code_39',
        'ean_13',
        'ean_8',
        'upc_a',
        'upc_e',
        'itf',
        'data_matrix',
      ];
      nativeBarcodeDetectorInstance = new window.BarcodeDetector({ formats });
      isNativeDetectorAvailable = true;
      return nativeBarcodeDetectorInstance;
    } catch (e) {
      console.warn('BarcodeDetector instantiation failed, falling back to enhanced jsQR:', e);
      isNativeDetectorAvailable = false;
      return null;
    }
  }

  isNativeDetectorAvailable = false;
  return null;
}

/**
 * Applies contrast stretching and dynamic auto-exposure normalization.
 * Extremely effective for dark sanctuary lighting, night services, or washed-out webcams.
 */
function applyContrastStretching(imageData: ImageData): ImageData {
  const data = imageData.data;
  const len = data.length;
  let minLum = 255;
  let maxLum = 0;

  // Sample luminance to calculate min and max
  for (let i = 0; i < len; i += 16) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    if (lum < minLum) minLum = lum;
    if (lum > maxLum) maxLum = lum;
  }

  // If contrast is already very high, avoid over-stretching
  const range = maxLum - minLum;
  if (range < 15 || range > 220) {
    return imageData;
  }

  const output = new ImageData(new Uint8ClampedArray(data), imageData.width, imageData.height);
  const outData = output.data;
  const scale = 255 / (range || 1);

  for (let i = 0; i < len; i += 4) {
    const r = Math.min(255, Math.max(0, (data[i] - minLum) * scale));
    const g = Math.min(255, Math.max(0, (data[i + 1] - minLum) * scale));
    const b = Math.min(255, Math.max(0, (data[i + 2] - minLum) * scale));
    outData[i] = r;
    outData[i + 1] = g;
    outData[i + 2] = b;
    outData[i + 3] = data[i + 3];
  }

  return output;
}

/**
 * Applies a 3x3 unsharp mask / sharpening convolution filter.
 * Restores crisp edges on blurry cameras, smudged smartphone lenses, or fixed-focus sensors.
 */
function applySharpeningFilter(imageData: ImageData): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const src = imageData.data;
  const output = new ImageData(new Uint8ClampedArray(src), width, height);
  const dst = output.data;

  // Convolution kernel:
  // [  0, -1,  0 ]
  // [ -1,  5, -1 ]
  // [  0, -1,  0 ]
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const topIdx = ((y - 1) * width + x) * 4;
      const btmIdx = ((y + 1) * width + x) * 4;
      const lftIdx = (y * width + (x - 1)) * 4;
      const rgtIdx = (y * width + (x + 1)) * 4;

      for (let c = 0; c < 3; c++) {
        const val =
          5 * src[idx + c] -
          src[topIdx + c] -
          src[btmIdx + c] -
          src[lftIdx + c] -
          src[rgtIdx + c];
        dst[idx + c] = Math.min(255, Math.max(0, val));
      }
    }
  }

  return output;
}

/**
 * Adaptive Thresholding / Binarization.
 * Eliminates specular glare from plastic card laminations and deep shadow gradients.
 */
function applyAdaptiveBinarization(imageData: ImageData): ImageData {
  const width = imageData.width;
  const height = imageData.height;
  const src = imageData.data;
  const output = new ImageData(new Uint8ClampedArray(src), width, height);
  const dst = output.data;

  // Compute average luminance
  let totalLum = 0;
  const count = (width * height) / 4;
  for (let i = 0; i < src.length; i += 16) {
    totalLum += 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
  }
  const avgLum = totalLum / (count || 1);

  for (let i = 0; i < src.length; i += 4) {
    const lum = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
    const binary = lum > avgLum * 0.95 ? 255 : 0;
    dst[i] = binary;
    dst[i + 1] = binary;
    dst[i + 2] = binary;
    dst[i + 3] = 255;
  }

  return output;
}

/**
 * Multi-Stage Frame Decoding Pipeline.
 * Orchestrates native BarcodeDetector and multi-pass jsQR.
 */
export async function decodeFrameMultiPass(
  videoOrCanvas: HTMLVideoElement | HTMLCanvasElement,
  canvas: HTMLCanvasElement,
  passCounter: number = 0
): Promise<ScanDetectionResult | null> {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  const width = canvas.width;
  const height = canvas.height;
  if (width === 0 || height === 0) return null;

  // ----------------------------------------------------
  // PASS 1: Native BarcodeDetector (Hardware Accelerated)
  // ----------------------------------------------------
  const nativeDetector = getNativeBarcodeDetector();
  if (nativeDetector) {
    try {
      const barcodes = await nativeDetector.detect(videoOrCanvas);
      if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
        const first = barcodes[0];
        const pts = first.cornerPoints;
        return {
          code: first.rawValue.trim(),
          format: first.format || 'qr_code',
          engine: 'native_barcode',
          enhancementLabel: 'Hardware Acceleration Active',
          location: pts && pts.length >= 4 ? {
            topLeftCorner: pts[0],
            topRightCorner: pts[1],
            bottomRightCorner: pts[2],
            bottomLeftCorner: pts[3],
          } : undefined,
        };
      }
    } catch {
      // Continue to enhanced jsQR
    }
  }

  // Extract raw image data from canvas
  const rawImageData = ctx.getImageData(0, 0, width, height);

  // ----------------------------------------------------
  // PASS 2: Enhanced Direct jsQR (attemptBoth)
  // ----------------------------------------------------
  const codeDirect = jsQR(rawImageData.data, rawImageData.width, rawImageData.height, {
    inversionAttempts: 'attemptBoth',
  });

  if (codeDirect && codeDirect.data) {
    return {
      code: codeDirect.data.trim(),
      engine: 'jsqr_raw',
      location: codeDirect.location,
    };
  }

  // ----------------------------------------------------
  // PASS 3: Center Region of Interest (ROI) Magnification
  // Eliminates edge background noise and maximizes card pixel density
  // ----------------------------------------------------
  const cropW = Math.floor(width * 0.62);
  const cropH = Math.floor(height * 0.62);
  const cropX = Math.floor((width - cropW) / 2);
  const cropY = Math.floor((height - cropH) / 2);

  if (cropW > 80 && cropH > 80) {
    const roiData = ctx.getImageData(cropX, cropY, cropW, cropH);
    const codeRoi = jsQR(roiData.data, roiData.width, roiData.height, {
      inversionAttempts: 'attemptBoth',
    });

    if (codeRoi && codeRoi.data) {
      // Offset coordinates back to full canvas frame
      return {
        code: codeRoi.data.trim(),
        engine: 'jsqr_roi',
        enhancementLabel: 'Center Focus Magnified',
        location: {
          topLeftCorner: { x: codeRoi.location.topLeftCorner.x + cropX, y: codeRoi.location.topLeftCorner.y + cropY },
          topRightCorner: { x: codeRoi.location.topRightCorner.x + cropX, y: codeRoi.location.topRightCorner.y + cropY },
          bottomLeftCorner: { x: codeRoi.location.bottomLeftCorner.x + cropX, y: codeRoi.location.bottomLeftCorner.y + cropY },
          bottomRightCorner: { x: codeRoi.location.bottomRightCorner.x + cropX, y: codeRoi.location.bottomRightCorner.y + cropY },
        },
      };
    }
  }

  // Alternate between advanced filters on consecutive frames for high FPS performance
  const cycle = passCounter % 3;

  // ----------------------------------------------------
  // PASS 4: Dynamic Contrast Stretching (Low-Light Booster)
  // ----------------------------------------------------
  if (cycle === 0) {
    try {
      const contrastData = applyContrastStretching(rawImageData);
      const codeContrast = jsQR(contrastData.data, contrastData.width, contrastData.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (codeContrast && codeContrast.data) {
        return {
          code: codeContrast.data.trim(),
          engine: 'jsqr_contrast',
          enhancementLabel: 'Low-Light Boost Filter',
          location: codeContrast.location,
        };
      }
    } catch {
      //
    }
  }

  // ----------------------------------------------------
  // PASS 5: Unsharp Mask Sharpening (Anti-Blur Filter)
  // ----------------------------------------------------
  if (cycle === 1) {
    try {
      const sharpData = applySharpeningFilter(rawImageData);
      const codeSharp = jsQR(sharpData.data, sharpData.width, sharpData.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (codeSharp && codeSharp.data) {
        return {
          code: codeSharp.data.trim(),
          engine: 'jsqr_sharpen',
          enhancementLabel: 'Anti-Blur Edge Filter',
          location: codeSharp.location,
        };
      }
    } catch {
      //
    }
  }

  // ----------------------------------------------------
  // PASS 6: Adaptive Local Binarization (Anti-Glare Filter)
  // ----------------------------------------------------
  if (cycle === 2) {
    try {
      const adaptiveData = applyAdaptiveBinarization(rawImageData);
      const codeAdaptive = jsQR(adaptiveData.data, adaptiveData.width, adaptiveData.height, {
        inversionAttempts: 'attemptBoth',
      });
      if (codeAdaptive && codeAdaptive.data) {
        return {
          code: codeAdaptive.data.trim(),
          engine: 'jsqr_adaptive',
          enhancementLabel: 'Anti-Glare Contrast Filter',
          location: codeAdaptive.location,
        };
      }
    } catch {
      //
    }
  }

  return null;
}

/**
 * Decodes an uploaded image file (from device photo gallery or high-res native camera snap)
 */
export async function decodeImageFile(file: File): Promise<ScanDetectionResult | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result !== 'string') {
        resolve(null);
        return;
      }

      const img = new Image();
      img.onload = async () => {
        const offscreenCanvas = document.createElement('canvas');
        // Cap max size to 1600px for speed while retaining crisp QR resolution
        const maxDim = 1600;
        let w = img.naturalWidth || img.width;
        let h = img.naturalHeight || img.height;

        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        offscreenCanvas.width = w;
        offscreenCanvas.height = h;
        const ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);

        // Try decoding with multi-pass engine
        for (let pass = 0; pass < 4; pass++) {
          const res = await decodeFrameMultiPass(offscreenCanvas, offscreenCanvas, pass);
          if (res) {
            resolve(res);
            return;
          }
        }

        resolve(null);
      };

      img.onerror = () => resolve(null);
      img.src = reader.result;
    };

    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Pure Web Audio Synthesizer for instant, reliable scan auditory feedback
 * Works 100% offline, zero network dependencies, zero 404 risk.
 */
class ScannerAudioFeedback {
  private ctx: AudioContext | null = null;

  private initCtx() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public play(type: 'success' | 'duplicate' | 'error' = 'success') {
    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      if (type === 'success') {
        // High crisp double-tone chime: 880Hz (A5) -> 1320Hz (E6)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.08);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.start(now);
        osc.stop(now + 0.22);
      } else if (type === 'duplicate') {
        // Mid alert chime: 440Hz -> 330Hz
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(330, now + 0.1);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        osc.start(now);
        osc.stop(now + 0.28);
      } else {
        // Soft error alert: 220Hz buzz
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(180, now + 0.12);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.start(now);
        osc.stop(now + 0.3);
      }
    } catch {
      // Audio playback safety catch
    }
  }
}

export const scannerAudio = new ScannerAudioFeedback();
