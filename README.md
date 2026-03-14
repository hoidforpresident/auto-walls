# Auto Walls – Foundry VTT V13 Module

Auto Walls is a Foundry VTT module for V13 that automatically detects and places walls on map images.

## Features

- Detects walls from the current scene background using a lightweight, client-side image-processing pipeline.
- Lets you tune detection sensitivity, minimum wall length, grid snapping, segment merging, and inversion.
- Previews detected walls as a bright green overlay before committing.
- Commits walls to the scene either additively or by replacing existing walls in the detected area.

## Usage

1. Install or link this folder into your Foundry `Data/modules` directory.
2. Enable **Auto Walls** in the Foundry module configuration.
3. Open a scene that has a background image configured.
4. Select the **Walls** scene control and click the **Auto Walls** tool button.
5. Adjust parameters in the Auto Walls window and click **Detect**.
6. Inspect the preview, then click **Commit Walls** to create real walls on the scene.

## Development

```bash
npm install
npm run build
```

During development you can run:

```bash
npm run watch
```

and point your Foundry world at this module directory.

