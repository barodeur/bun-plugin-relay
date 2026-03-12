import type { BunPlugin } from "bun";

export interface RelayPluginOptions {
  /**
   * Directory name where relay-compiler outputs artifacts.
   * @default "__generated__"
   */
  artifactDirectory?: string;
}

/**
 * Bun build plugin that replaces `graphql` tagged template literals with
 * require() calls to relay-compiler generated artifacts.
 *
 * This does what the Relay Babel plugin does, but for Bun's bundler.
 *
 * @example
 * ```ts
 * import { relayPlugin } from "bun-plugin-relay";
 *
 * await Bun.build({
 *   entrypoints: ["./src/index.ts"],
 *   outdir: "./build",
 *   plugins: [relayPlugin()],
 * });
 * ```
 */
export function relayPlugin(options?: RelayPluginOptions): BunPlugin {
  const artifactDir = options?.artifactDirectory ?? "__generated__";

  return {
    name: "bun-plugin-relay",
    setup(build) {
      build.onLoad({ filter: /\.tsx?$/, namespace: "file" }, async (args) => {
        if (
          args.path.includes("node_modules") ||
          args.path.includes(artifactDir)
        )
          return;

        const text = await Bun.file(args.path).text();
        if (!text.includes("graphql`")) return;

        const transformed = text.replace(
          /\bgraphql\s*`([^`]+)`/g,
          (_match: string, body: string) => {
            const m = body.match(
              /(query|mutation|fragment|subscription)\s+(\w+)/,
            );
            if (!m) return _match;
            return `require("./${artifactDir}/${m[2]}.graphql")`;
          },
        );

        if (transformed === text) return;

        return {
          contents: transformed,
          loader: args.path.endsWith(".tsx") ? "tsx" : "ts",
        };
      });
    },
  };
}
