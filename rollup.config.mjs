import path from "node:path";
import typescript from "rollup-plugin-typescript2";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";

const ROOT = process.cwd();

export default {
  input: path.join(ROOT, "src/main.ts"),
  output: {
    file: path.join(ROOT, "dist/module.js"),
    format: "es",
    sourcemap: true
  },
  plugins: [
    resolve(),
    commonjs(),
    typescript({
      tsconfig: path.join(ROOT, "tsconfig.json"),
      clean: true
    })
  ]
};

