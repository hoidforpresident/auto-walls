declare const canvas: any;
declare const game: any;
declare const PIXI: any;
declare const CONST: any;

export interface LineSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface CommitOptions {
  behavior: "additive" | "replace";
}

let previewLayer: any | null = null;

export function previewSegments(segments: LineSegment[]): void {
  if (!canvas || !canvas.stage) return;

  clearPreview();

  const graphics = new PIXI.Graphics();
  graphics.name = "auto-walls-preview";
  graphics.lineStyle(2, 0x00ff00, 0.9);

  for (const seg of segments) {
    graphics.moveTo(seg.x1, seg.y1);
    graphics.lineTo(seg.x2, seg.y2);
  }

  canvas.stage.addChild(graphics);
  previewLayer = graphics;
}

export function clearPreview(): void {
  if (!canvas || !canvas.stage || !previewLayer) return;
  try {
    canvas.stage.removeChild(previewLayer);
    previewLayer.destroy({ children: true });
  } catch (error) {
    console.warn("auto-walls | Failed to clear preview layer", error);
  } finally {
    previewLayer = null;
  }
}

export async function commitSegmentsToScene(
  segments: LineSegment[],
  options: CommitOptions
): Promise<void> {
  const scene = game.scenes?.current;
  if (!scene) {
    throw new Error("No active scene to commit walls into.");
  }

  const bounds = boundingBoxOfSegments(segments);

  if (options.behavior === "replace") {
    const existing = scene.walls.contents.filter((wall: any) =>
      wallIntersectsBounds(wall, bounds)
    );
    if (existing.length > 0) {
      const ids = existing.map((w: any) => w.id);
      await scene.deleteEmbeddedDocuments("Wall", ids);
    }
  }

  const wallData = segments.map((seg) => ({
    c: [seg.x1, seg.y1, seg.x2, seg.y2],
    move: CONST.WALL_MOVEMENT_TYPES.NORMAL,
    sense: CONST.WALL_SENSE_TYPES.NORMAL,
    sound: CONST.WALL_SOUND_TYPES.NORMAL,
    dir: CONST.WALL_DIRECTIONS.BOTH,
    door: CONST.WALL_DOOR_TYPES.NONE,
    doorSound: CONST.WALL_DOOR_SOUNDS.NONE,
    light: CONST.WALL_LIGHT_RESTRICTION_TYPES.NORMAL,
    flags: {
      "auto-walls": {
        generated: true
      }
    }
  }));

  if (wallData.length === 0) return;

  await scene.createEmbeddedDocuments("Wall", wallData);
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function boundingBoxOfSegments(segments: LineSegment[]): Bounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const seg of segments) {
    minX = Math.min(minX, seg.x1, seg.x2);
    minY = Math.min(minY, seg.y1, seg.y2);
    maxX = Math.max(maxX, seg.x1, seg.x2);
    maxY = Math.max(maxY, seg.y1, seg.y2);
  }

  if (!Number.isFinite(minX)) {
    minX = minY = maxX = maxY = 0;
  }

  return { minX, minY, maxX, maxY };
}

function wallIntersectsBounds(wall: any, bounds: Bounds): boolean {
  const [x1, y1, x2, y2] = wall.c;
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const maxX = Math.max(x1, x2);
  const maxY = Math.max(y1, y2);

  return !(
    maxX < bounds.minX ||
    minX > bounds.maxX ||
    maxY < bounds.minY ||
    minY > bounds.maxY
  );
}

