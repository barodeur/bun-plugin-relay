import type { BunPlugin } from "bun";
import { cosmiconfigSync } from "cosmiconfig";
import { parse } from "graphql";

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
    searchPlaces: ["package.json", "relay.config.json", "relay.config.js"],
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
          /\bgraphql\s*`([^`]*)`/g,
          (_match: string, body: string) => {
            if (body.includes("${")) {
              throw new Error(
                "BunPluginRelay: Substitutions are not allowed in " +
                  "graphql fragments. Included fragments should be " +
                  "referenced as `...MyModule_propName`.",
              );
            }

            if (body.trim().length === 0) {
              throw new Error("BunPluginRelay: Unexpected empty graphql tag.");
            }

            const ast = parse(body);
            const [definition, ...otherDefinitions] = ast.definitions ?? [];

            if (!definition) {
              throw new Error("BunPluginRelay: Unexpected empty graphql tag.");
            }

            if (otherDefinitions.length > 0) {
              throw new Error(
                "BunPluginRelay: Expected exactly one definition per graphql tag.",
              );
            }

            if (
              definition.kind !== "FragmentDefinition" &&
              definition.kind !== "OperationDefinition"
            ) {
              throw new Error(
                "BunPluginRelay: Expected a fragment, mutation, query, or " +
                  `subscription, got \`${definition.kind}\`.`,
              );
            }

            const definitionName = definition.name?.value;
            if (!definitionName) {
              throw new Error(
                "GraphQL operations and fragments must contain names",
              );
            }

            return `require("./${artifactDir}/${definitionName}.graphql")`;
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
