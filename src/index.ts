import type { BunPlugin } from "bun";
import { cosmiconfigSync } from "cosmiconfig";

export interface RelayPluginOptions {
  /**
   * Directory name where relay-compiler outputs artifacts.
   * @default "__generated__"
   */
  artifactDirectory?: string;
}

/**
 * Search for a relay config file (`relay.config.js`, `relay.config.json`,
 * or the `"relay"` key in `package.json`).
 *
 * @param searchFrom - Directory to search from (defaults to `process.cwd()`)
 */
export function findRelayConfig(
  searchFrom?: string,
): Partial<RelayPluginOptions> {
  const explorer = cosmiconfigSync("relay", {
    searchPlaces: [
      "package.json",
      "relay.config.json",
      "relay.config.js",
    ],
  });
  const result = explorer.search(searchFrom);
  if (!result || result.isEmpty) return {};
  return result.config as Partial<RelayPluginOptions>;
}

/**
 * Bun build plugin that replaces `graphql` tagged template literals with
 * require() calls to relay-compiler generated artifacts.
 *
 * This does what the Relay Babel plugin does, but for Bun's bundler.
 *
 * Options passed directly take precedence over values found in config files.
 * Config is resolved via cosmiconfig from `relay.config.js`,
 * `relay.config.json`, or the `"relay"` key in `package.json`.
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
  const fileConfig = findRelayConfig();
  const artifactDir =
    options?.artifactDirectory ??
    fileConfig.artifactDirectory ??
    "__generated__";

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
