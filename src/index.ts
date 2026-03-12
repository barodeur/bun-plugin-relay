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
                "BunPluginRelay: Substitutions are not allowed in " +
                  "graphql fragments. Included fragments should be " +
                  "referenced as `...MyModule_propName`.",
              );
            }

            if (body.trim().length === 0) {
              throw new Error("BunPluginRelay: Unexpected empty graphql tag.");
            }

            const ast = parse(body);

            if (ast.definitions.length === 0) {
              throw new Error("BunPluginRelay: Unexpected empty graphql tag.");
            }

            if (ast.definitions.length !== 1) {
              throw new Error(
                "BunPluginRelay: Expected exactly one definition per graphql tag.",
              );
            }

            const definition = ast.definitions[0] as
              | import("graphql").FragmentDefinitionNode
              | import("graphql").OperationDefinitionNode
              | import("graphql").DefinitionNode;

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
