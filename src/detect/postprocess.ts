import type { LineSegment } from "../foundry/walls";

export interface PostprocessOptions {
  minWallLength: number;
  snapToGrid: boolean;
  mergeSegments: boolean;
  scene: any;
}

export function postprocessSegments(
  segments: LineSegment[],
  options: PostprocessOptions
): LineSegment[] {
  const { minWallLength, snapToGrid, mergeSegments, scene } = options;

  let result = segments.slice();

  result = result.filter((seg) => lengthOf(seg) >= minWallLength);

  if (snapToGrid) {
    const gridSize = scene?.grid?.size || 1;
    result = result.map((seg) => snapSegmentToGrid(seg, gridSize));
  }

  if (mergeSegments) {
    result = mergeCollinearSegments(result);
  }

  return result;
}

function lengthOf(seg: LineSegment): number {
  const dx = seg.x2 - seg.x1;
  const dy = seg.y2 - seg.y1;
  return Math.hypot(dx, dy);
}

function snap(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

function snapSegmentToGrid(seg: LineSegment, gridSize: number): LineSegment {
  return {
    x1: snap(seg.x1, gridSize),
    y1: snap(seg.y1, gridSize),
    x2: snap(seg.x2, gridSize),
    y2: snap(seg.y2, gridSize)
  };
}

function mergeCollinearSegments(segments: LineSegment[]): LineSegment[] {
  const merged: LineSegment[] = [];

  const used = new Array<boolean>(segments.length).fill(false);
  const angleTolerance = (10 * Math.PI) / 180;
  const distanceTolerance = 8;

  for (let i = 0; i < segments.length; i++) {
    if (used[i]) continue;
    let base = segments[i];

    for (let j = i + 1; j < segments.length; j++) {
      if (used[j]) continue;
      const candidate = segments[j];

      if (!areCollinear(base, candidate, angleTolerance, distanceTolerance)) continue;

      base = mergeTwoSegments(base, candidate);
      used[j] = true;
    }

    merged.push(base);
    used[i] = true;
  }

  return merged;
}

function angleOf(seg: LineSegment): number {
  return Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
}

function areCollinear(
  a: LineSegment,
  b: LineSegment,
  angleTolerance: number,
  distanceTolerance: number
): boolean {
  const angleA = angleOf(a);
  const angleB = angleOf(b);
  const angleDiff = Math.abs(normalizeAngle(angleA - angleB));
  if (angleDiff > angleTolerance) return false;

  const dist1 = pointToSegmentDistance(a.x1, a.y1, b);
  const dist2 = pointToSegmentDistance(a.x2, a.y2, b);
  const dist3 = pointToSegmentDistance(b.x1, b.y1, a);
  const dist4 = pointToSegmentDistance(b.x2, b.y2, a);

  return (
    dist1 <= distanceTolerance &&
    dist2 <= distanceTolerance &&
    dist3 <= distanceTolerance &&
    dist4 <= distanceTolerance
  );
}

function normalizeAngle(angle: number): number {
  while (angle <= -Math.PI) angle += 2 * Math.PI;
  while (angle > Math.PI) angle -= 2 * Math.PI;
  return angle;
}

function pointToSegmentDistance(x: number, y: number, seg: LineSegment): number {
  const { x1, y1, x2, y2 } = seg;
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.hypot(x - x1, y - y1);
  }

  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));

  const projX = x1 + clampedT * dx;
  const projY = y1 + clampedT * dy;

  return Math.hypot(x - projX, y - projY);
}

function mergeTwoSegments(a: LineSegment, b: LineSegment): LineSegment {
  const points = [
    { x: a.x1, y: a.y1 },
    { x: a.x2, y: a.y2 },
    { x: b.x1, y: b.y1 },
    { x: b.x2, y: b.y2 }
  ];

  let minPoint = points[0];
  let maxPoint = points[0];

  for (const p of points) {
    if (p.x + p.y < minPoint.x + minPoint.y) minPoint = p;
    if (p.x + p.y > maxPoint.x + maxPoint.y) maxPoint = p;
  }

  return {
    x1: minPoint.x,
    y1: minPoint.y,
    x2: maxPoint.x,
    y2: maxPoint.y
  };
}

