# bun-plugin-relay

Bun build plugin that replaces `graphql` tagged template literals with `require()` calls to relay-compiler generated artifacts — doing what the Relay Babel plugin does, but for Bun's bundler.

## Install

```sh
bun add -d bun-plugin-relay
```

## Usage

Use with `Bun.build()` in a build script:

```ts
import { relayPlugin } from "bun-plugin-relay";

await Bun.build({
  entrypoints: ["./src/index.ts"],
  outdir: "./build",
  plugins: [relayPlugin()],
});
```

For standalone binaries, compile in a second step:

```ts
import { relayPlugin } from "bun-plugin-relay";

// Step 1: bundle with relay transform
await Bun.build({
  entrypoints: ["./src/cli.ts"],
  outdir: "./build",
  target: "bun",
  plugins: [relayPlugin()],
});

// Step 2: compile to standalone binary
await Bun.$`bun build build/cli.js --compile --outfile build/app`;
```

Then write your Relay code the standard way:

```tsx
import { graphql } from "relay-runtime";
import { useLazyLoadQuery } from "react-relay";

function App() {
  const data = useLazyLoadQuery(
    graphql`query AppQuery { viewer { id name } }`,
    {},
  );
  // ...
}
```

The plugin transforms `graphql` tagged templates into `require()` calls at bundle time:

```ts
// before (source)
const query = graphql`query AppQuery { viewer { id name } }`;

// after (bundled)
const query = require("./__generated__/AppQuery.graphql");
```

## Options

```ts
relayPlugin({
  // Directory name where relay-compiler outputs artifacts
  // Default: "__generated__"
  artifactDirectory: "__generated__",
});
```

## Validation

The plugin parses each `graphql` tagged template with the `graphql` library (matching babel-plugin-relay's behavior) and will fail the build with a clear error if it encounters:

- Empty graphql tags
- Template literal substitutions (`${}`) — fragments should be referenced as `...MyModule_propName`
- Multiple definitions in a single tag
- Unnamed operations or fragments
- Invalid GraphQL syntax
- Non-operation/fragment definitions (e.g. schema definitions)

## How it works

1. `relay-compiler` scans your source for `graphql` tagged templates and generates artifacts in `__generated__/`
2. At bundle time, this plugin replaces those same `graphql` tags with `require()` calls pointing to the generated artifacts
3. Bun's bundler resolves and bundles the artifacts

This means the `graphql` tag from `relay-runtime` is never called at runtime (it throws without a Babel transform). The plugin intercepts it at build time instead.

## License

MIT
