declare const game: any;
declare const canvas: any;
declare const ui: any;
declare const Application: any;
type JQuery = any;

const MODULE_ID = "auto-walls";

import type { LineSegment } from "../foundry/walls";
import { detectWallsFromBackground } from "../detect/detector";
import { postprocessSegments } from "../detect/postprocess";
import { previewSegments, clearPreview, commitSegmentsToScene } from "../foundry/walls";

export interface AutoWallsOptions {
  sensitivity: number;
  minWallLength: number;
  snapToGrid: boolean;
  mergeSegments: boolean;
  invert: boolean;
}

export class AutoWallsApp extends Application {
  #segments: LineSegment[] = [];

  static get defaultOptions(): any {
    const options = super.defaultOptions;
    options.id = "auto-walls-app";
    options.title = "Auto Walls";
    options.template = "modules/auto-walls/templates/autowalls-app.hbs";
    options.width = 420;
    options.height = "auto";
    options.resizable = true;
    return options;
  }

  getData(): any {
    const sensitivity = game.settings.get(MODULE_ID, "defaultSensitivity");
    const minWallLength = game.settings.get(MODULE_ID, "minWallLength");
    const snapToGrid = game.settings.get(MODULE_ID, "snapToGrid");

    return {
      hasSceneBackground: this._hasSceneBackground(),
      sensitivity,
      minWallLength,
      snapToGrid,
      mergeSegments: true,
      invert: false
    };
  }

  activateListeners(html: JQuery): void {
    super.activateListeners(html);

    html.find("button[name='detect']").on("click", (event: any) => {
      event.preventDefault();
      this._onDetect(html);
    });

    html.find("button[name='clearPreview']").on("click", (event: any) => {
      event.preventDefault();
      this._onClearPreview();
    });

    html.find("button[name='commit']").on("click", (event: any) => {
      event.preventDefault();
      this._onCommit(html);
    });

    html.find("button[name='cancel']").on("click", (event: any) => {
      event.preventDefault();
      this.close();
    });
  }

  close(options?: any): Promise<void> {
    clearPreview();
    return super.close(options);
  }

  private _hasSceneBackground(): boolean {
    const scene = game.scenes?.current;
    if (!scene) return false;
    const bg = (scene as any).background;
    return !!(bg && bg.src);
  }

  private _collectOptions(html: JQuery): AutoWallsOptions {
    const sensitivity = Number(html.find("input[name='sensitivity']").val()) || 0.5;
    const minWallLength = Number(html.find("input[name='minWallLength']").val()) || 32;
    const snapToGrid = Boolean(html.find("input[name='snapToGrid']").prop("checked"));
    const mergeSegments = Boolean(html.find("input[name='mergeSegments']").prop("checked"));
    const invert = Boolean(html.find("input[name='invert']").prop("checked"));

    return { sensitivity, minWallLength, snapToGrid, mergeSegments, invert };
  }

  private async _onDetect(html: JQuery): Promise<void> {
    if (!this._hasSceneBackground()) {
      ui.notifications?.warn("No scene background image found for auto wall detection.");
      return;
    }

    const scene = game.scenes.current;
    const options = this._collectOptions(html);
    const maxResolution = game.settings.get(MODULE_ID, "maxImageResolution");

    try {
      ui.notifications?.info("Running auto wall detection...");
      const rawSegments = await detectWallsFromBackground(scene, {
        sensitivity: options.sensitivity,
        maxResolution,
        invert: options.invert
      });

      const processed = postprocessSegments(rawSegments, {
        minWallLength: options.minWallLength,
        snapToGrid: options.snapToGrid,
        mergeSegments: options.mergeSegments,
        scene
      });

      this.#segments = processed;
      previewSegments(processed);

      ui.notifications?.info(`Auto wall detection found ${processed.length} segments.`);
    } catch (error) {
      console.error(`${MODULE_ID} | Detection failed`, error);
      ui.notifications?.error("Auto wall detection failed. See console for details.");
    }
  }

  private _onClearPreview(): void {
    this.#segments = [];
    clearPreview();
  }

  private async _onCommit(html: JQuery): Promise<void> {
    if (!this.#segments.length) {
      ui.notifications?.warn("No detected walls to commit. Run detection first.");
      return;
    }

    const commitBehavior = game.settings.get(MODULE_ID, "commitBehavior") as "additive" | "replace";

    try {
      await commitSegmentsToScene(this.#segments, {
        behavior: commitBehavior
      });
      ui.notifications?.info(`Committed ${this.#segments.length} walls to the scene.`);
      this.close();
    } catch (error) {
      console.error(`${MODULE_ID} | Commit failed`, error);
      ui.notifications?.error("Failed to create walls on the scene. See console for details.");
    }
  }
}

