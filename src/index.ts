import type { BunPlugin } from "bun";
import { parse } from "graphql";

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
          /\bgraphql\s*`([^`]*)`/g,
          (_match: string, body: string) => {
            if (body.includes("${")) {
              throw new Error(
                "BabelPluginRelay: Substitutions are not allowed in " +
                  "graphql fragments. Included fragments should be " +
                  "referenced as `...MyModule_propName`.",
              );
            }

            if (body.trim().length === 0) {
              throw new Error(
                "BabelPluginRelay: Unexpected empty graphql tag.",
              );
            }

            const ast = parse(body);

            if (ast.definitions.length === 0) {
              throw new Error(
                "BabelPluginRelay: Unexpected empty graphql tag.",
              );
            }

            if (ast.definitions.length !== 1) {
              throw new Error(
                "BabelPluginRelay: Expected exactly one definition per graphql tag.",
              );
            }

            // Safe: we checked definitions.length === 1 above
            const definition = ast.definitions[0]!;

            if (
              definition.kind !== "FragmentDefinition" &&
              definition.kind !== "OperationDefinition"
            ) {
              throw new Error(
                "BabelPluginRelay: Expected a fragment, mutation, query, or " +
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
