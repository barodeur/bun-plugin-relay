import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { relayPlugin } from "../src/index.ts";

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
