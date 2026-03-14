const MODULE_ID = "auto-walls";

declare const game: any;
declare const Hooks: any;

import { AutoWallsApp } from "./ui/AutoWallsApp";

Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing module`);

  game.settings.register(MODULE_ID, "defaultSensitivity", {
    name: "Default Detection Sensitivity",
    hint: "Base threshold used during edge detection for auto walls.",
    scope: "world",
    config: true,
    type: Number,
    default: 0.5,
    range: {
      min: 0.1,
      max: 1.0,
      step: 0.05
    }
  });

  game.settings.register(MODULE_ID, "minWallLength", {
    name: "Minimum Wall Length (pixels)",
    hint: "Segments shorter than this will be discarded.",
    scope: "world",
    config: true,
    type: Number,
    default: 32
  });

  game.settings.register(MODULE_ID, "snapToGrid", {
    name: "Snap Walls to Grid",
    hint: "Snap detected wall endpoints to the scene grid.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, "maxImageResolution", {
    name: "Maximum Detection Resolution",
    hint: "Larger images will be downscaled so that width or height does not exceed this value.",
    scope: "world",
    config: true,
    type: Number,
    default: 2048
  });

  game.settings.register(MODULE_ID, "commitBehavior", {
    name: "Commit Behavior",
    hint: "Choose whether to add walls or replace existing walls in the map area.",
    scope: "world",
    config: true,
    type: String,
    choices: {
      additive: "Additive (keep existing walls)",
      replace: "Replace walls in map area"
    },
    default: "additive"
  });
});

Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Ready`);
});

Hooks.on("getSceneControlButtons", (controls: any[]) => {
  const walls = controls.find((c) => c.name === "walls");
  if (!walls) return;

  walls.tools.push({
    name: "autoWalls",
    title: "Auto Walls",
    icon: "fas fa-border-style",
    visible: true,
    onClick: () => {
      const app = new AutoWallsApp();
      app.render(true);
    },
    button: true
  });
});

