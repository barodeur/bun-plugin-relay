import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { findRelayConfig, relayPlugin } from "../src/index.ts";

const FIXTURES = join(import.meta.dir, "fixtures");

describe("relayPlugin", () => {
  test("transforms graphql tagged templates into require calls", async () => {
    const result = await Bun.build({
      entrypoints: [join(FIXTURES, "basic.ts")],
      outdir: join(import.meta.dir, ".out"),
      plugins: [relayPlugin()],
    });
    expect(result.success).toBe(true);
    const output = await result.outputs[0]?.text();
    expect(output).toContain("__generated__/MyQuery.graphql");
    expect(output).not.toContain("graphql`");
  });

  test("transforms mutations and fragments", async () => {
    const result = await Bun.build({
      entrypoints: [join(FIXTURES, "mutations.ts")],
      outdir: join(import.meta.dir, ".out"),
      plugins: [relayPlugin()],
    });
    expect(result.success).toBe(true);
    const output = await result.outputs[0]?.text();
    expect(output).toContain("__generated__/CreateUserMutation.graphql");
    expect(output).toContain("__generated__/UserFragment.graphql");
  });

  test("respects custom artifactDirectory", async () => {
    const result = await Bun.build({
      entrypoints: [join(FIXTURES, "basic.ts")],
      outdir: join(import.meta.dir, ".out"),
      plugins: [relayPlugin({ artifactDirectory: "__relay__" })],
    });
    expect(result.success).toBe(true);
    const output = await result.outputs[0]?.text();
    expect(output).toContain("__relay__/MyQuery.graphql");
  });

  test("leaves non-graphql files unchanged", async () => {
    const result = await Bun.build({
      entrypoints: [join(FIXTURES, "no-graphql.ts")],
      outdir: join(import.meta.dir, ".out"),
      plugins: [relayPlugin()],
    });
    expect(result.success).toBe(true);
    const output = await result.outputs[0]?.text();
    expect(output).toContain("hello");
    expect(output).not.toContain("__generated__");
  });

  test("handles multiline graphql tags", async () => {
    const result = await Bun.build({
      entrypoints: [join(FIXTURES, "multiline.ts")],
      outdir: join(import.meta.dir, ".out"),
      plugins: [relayPlugin()],
    });
    expect(result.success).toBe(true);
    const output = await result.outputs[0]?.text();
    expect(output).toContain("__generated__/LongQuery.graphql");
  });

  test("errors on empty graphql tags", async () => {
    const result = await Bun.build({
      entrypoints: [join(FIXTURES, "empty-tag.ts")],
      outdir: join(import.meta.dir, ".out"),
      plugins: [relayPlugin()],
      throw: false,
    });
    expect(result.success).toBe(false);
    expect(
      result.logs.some((l) =>
        l.message.includes("Unexpected empty graphql tag"),
      ),
    ).toBe(true);
  });

  test("errors on template substitutions", async () => {
    const result = await Bun.build({
      entrypoints: [join(FIXTURES, "substitution.ts")],
      outdir: join(import.meta.dir, ".out"),
      plugins: [relayPlugin()],
      throw: false,
    });
    expect(result.success).toBe(false);
    expect(
      result.logs.some((l) =>
        l.message.includes("Substitutions are not allowed"),
      ),
    ).toBe(true);
  });

  test("errors on multiple definitions in a single tag", async () => {
    const result = await Bun.build({
      entrypoints: [join(FIXTURES, "multiple-definitions.ts")],
      outdir: join(import.meta.dir, ".out"),
      plugins: [relayPlugin()],
      throw: false,
    });
    expect(result.success).toBe(false);
    expect(
      result.logs.some((l) =>
        l.message.includes("Expected exactly one definition"),
      ),
    ).toBe(true);
  });

  test("errors on unnamed operations", async () => {
    const result = await Bun.build({
      entrypoints: [join(FIXTURES, "unnamed-query.ts")],
      outdir: join(import.meta.dir, ".out"),
      plugins: [relayPlugin()],
      throw: false,
    });
    expect(result.success).toBe(false);
    expect(
      result.logs.some((l) => l.message.includes("must contain names")),
    ).toBe(true);
  });

  test("errors on invalid definition kinds", async () => {
    const result = await Bun.build({
      entrypoints: [join(FIXTURES, "invalid-definition.ts")],
      outdir: join(import.meta.dir, ".out"),
      plugins: [relayPlugin()],
      throw: false,
    });
    expect(result.success).toBe(false);
    expect(
      result.logs.some((l) =>
        l.message.includes(
          "Expected a fragment, mutation, query, or subscription",
        ),
      ),
    ).toBe(true);
  });

  test("errors on invalid graphql syntax", async () => {
    const result = await Bun.build({
      entrypoints: [join(FIXTURES, "invalid-graphql.ts")],
      outdir: join(import.meta.dir, ".out"),
      plugins: [relayPlugin()],
      throw: false,
    });
    expect(result.success).toBe(false);
  });
});

describe("findRelayConfig", () => {
  test("reads from relay.config.json", () => {
    const config = findRelayConfig(join(FIXTURES, "config-json"));
    expect(config.artifactDirectory).toBe("__relay__");
  });

  test("reads from relay.config.js", () => {
    const config = findRelayConfig(join(FIXTURES, "config-js"));
    expect(config.artifactDirectory).toBe("__relay__");
  });

  test("reads from package.json relay key", () => {
    const config = findRelayConfig(join(FIXTURES, "config-pkg"));
    expect(config.artifactDirectory).toBe("__relay__");
  });

  test("returns empty object when no config found", () => {
    const config = findRelayConfig(join(FIXTURES, "config-none"));
    expect(config).toEqual({});
  });
});
