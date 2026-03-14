import type { LineSegment } from "../foundry/walls";

declare const Image: any;

export interface DetectionOptions {
  sensitivity: number;
  maxResolution: number;
  invert: boolean;
}

export async function detectWallsFromBackground(
  scene: any,
  options: DetectionOptions
): Promise<LineSegment[]> {
  const bg = scene?.background;
  if (!bg || !bg.src) {
    throw new Error("Scene has no background image for detection.");
  }

  const image = await loadImage(bg.src);
  const { canvas, context } = prepareCanvas(image, options.maxResolution);

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

  const grayscale = toGrayscale(imageData, options.invert);
  const edges = sobelEdges(grayscale, canvas.width, canvas.height, options.sensitivity);
  const segments = extractAxisAlignedSegments(edges, canvas.width, canvas.height);

  const sceneWidth = scene.width ?? canvas.width;
  const sceneHeight = scene.height ?? canvas.height;

  const scaledSegments: LineSegment[] = segments.map((seg) => {
    const x1 = (seg.x1 / canvas.width) * sceneWidth;
    const y1 = (seg.y1 / canvas.height) * sceneHeight;
    const x2 = (seg.x2 / canvas.width) * sceneWidth;
    const y2 = (seg.y2 / canvas.height) * sceneHeight;
    return { x1, y1, x2, y2 };
  });

  return scaledSegments;
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

function prepareCanvas(
  image: HTMLImageElement,
  maxResolution: number
): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Failed to acquire 2D canvas context for detection.");
  }

  const largestSide = Math.max(image.width, image.height);
  const scale = largestSide > maxResolution ? maxResolution / largestSide : 1;

  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  return { canvas, context };
}

function toGrayscale(imageData: ImageData, invert: boolean): Float32Array {
  const { data, width, height } = imageData;
  const gray = new Float32Array(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      let value = 0.299 * r + 0.587 * g + 0.114 * b;
      if (invert) value = 255 - value;
      gray[y * width + x] = value;
    }
  }

  return gray;
}

function sobelEdges(
  gray: Float32Array,
  width: number,
  height: number,
  sensitivity: number
): Uint8Array {
  const edges = new Uint8Array(width * height);

  const threshold = 40 + (1 - sensitivity) * 80;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;

      const gx =
        -gray[(y - 1) * width + (x - 1)] -
        2 * gray[y * width + (x - 1)] -
        gray[(y + 1) * width + (x - 1)] +
        gray[(y - 1) * width + (x + 1)] +
        2 * gray[y * width + (x + 1)] +
        gray[(y + 1) * width + (x + 1)];

      const gy =
        -gray[(y - 1) * width + (x - 1)] -
        2 * gray[(y - 1) * width + x] -
        gray[(y - 1) * width + (x + 1)] +
        gray[(y + 1) * width + (x - 1)] +
        2 * gray[(y + 1) * width + x] +
        gray[(y + 1) * width + (x + 1)];

      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[idx] = magnitude >= threshold ? 1 : 0;
    }
  }

  return edges;
}

function extractAxisAlignedSegments(
  edges: Uint8Array,
  width: number,
  height: number
): LineSegment[] {
  const segments: LineSegment[] = [];

  const minRun = 4;

  for (let y = 0; y < height; y++) {
    let runStart = -1;
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (edges[idx]) {
        if (runStart === -1) runStart = x;
      } else if (runStart !== -1) {
        const runLength = x - runStart;
        if (runLength >= minRun) {
          segments.push({ x1: runStart, y1: y, x2: x - 1, y2: y });
        }
        runStart = -1;
      }
    }
    if (runStart !== -1) {
      const runLength = width - runStart;
      if (runLength >= minRun) {
        segments.push({ x1: runStart, y1: y, x2: width - 1, y2: y });
      }
    }
  }

  for (let x = 0; x < width; x++) {
    let runStart = -1;
    for (let y = 0; y < height; y++) {
      const idx = y * width + x;
      if (edges[idx]) {
        if (runStart === -1) runStart = y;
      } else if (runStart !== -1) {
        const runLength = y - runStart;
        if (runLength >= minRun) {
          segments.push({ x1: x, y1: runStart, x2: x, y2: y - 1 });
        }
        runStart = -1;
      }
    }
    if (runStart !== -1) {
      const runLength = height - runStart;
      if (runLength >= minRun) {
        segments.push({ x1: x, y1: runStart, x2: x, y2: height - 1 });
      }
    }
  }

  return segments;
}

