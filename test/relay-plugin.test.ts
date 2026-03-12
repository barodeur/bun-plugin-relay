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
