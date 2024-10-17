const { build } = require("esbuild");

const baseConfig = {
  bundle: true,
  minify: process.env.NODE_ENV === "production",
  sourcemap: process.env.NODE_ENV !== "production",
};

const extensionConfig = {
  ...baseConfig,
  platform: "node",
  mainFields: ["module", "main"],
  format: "cjs",
  entryPoints: ["./extension.js"],
  outfile: "./out/extension.js",
  external: ["vscode"],
};

const createPromptConfig = {
  ...baseConfig,
  target: "es2020",
  format: "esm",
  entryPoints: ["./panels/main.ts"],
  outfile: "./out/webview.js"
};

const watchConfig = {
  watch: {
    onRebuild(error, result) {
      console.log("[watch] build started");
      if (error) {
        error.errors.forEach((error) =>
            console.error(
                `> ${error.location.file}:${error.location.line}:${error.location.column}: error: ${error.text}`
            )
        );
      } else {
        console.log("[watch] build finished");
      }
    },
  },
};

(async () => {
  const args = process.argv.slice(2);
  try {
    if (args.includes("--watch")) {
      // Build and watch extension and webview code
      console.log("[watch] build started");
      await build({
        ...extensionConfig,
        ...watchConfig,
      });
      await build({
        ...createPromptConfig,
        ...watchConfig,
      });
      console.log("[watch] build finished");
    } else {
      // Build extension and webview code
      await build(extensionConfig);
      await build(createPromptConfig);
      console.log("build complete");
    }
  } catch (err) {
    console.log({err});
    //process.stderr.write(err.stderr);
    process.exit(1);
  }
})();