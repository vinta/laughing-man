import { afterAll, afterEach, beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { delimiter, join } from "node:path";
import * as childProcessModule from "node:child_process";
import * as buildModule from "../../src/commands/build";

// Snapshot before mocking: the namespaces are live bindings, so spreading them later
// would capture the mocked exports instead of the real ones
const realChildProcess = { ...childProcessModule };
const realBuild = { ...buildModule };

const mockSpawnSync = mock(() => ({ status: 0 })) as any;
const mockRunBuild = mock(async () => ({
  config: {
    env: { CLOUDFLARE_API_TOKEN: "cf_test_123" },
    web_hosting: { project: "test-newsletter" },
    url: "https://newsletter.example.com",
  },
  outputDir: "/tmp/lm-output",
})) as any;

mock.module("node:child_process", () => ({
  spawnSync: mockSpawnSync,
}));

mock.module("../../src/commands/build", () => ({
  runBuild: mockRunBuild,
}));

// Bun module mocks persist across test files; restore the real modules for later files
afterAll(() => {
  mock.module("node:child_process", () => realChildProcess);
  mock.module("../../src/commands/build", () => realBuild);
});

const { runDeploy } = await import("../../src/commands/deploy");

describe("runDeploy", () => {
  let logs: string[];

  beforeEach(() => {
    logs = [];
    spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      logs.push(args.join(" "));
    });
    mockRunBuild.mockReset().mockImplementation(async () => ({
      config: {
        env: { CLOUDFLARE_API_TOKEN: "cf_test_123" },
        web_hosting: { project: "test-newsletter" },
        url: "https://newsletter.example.com",
      },
      outputDir: "/tmp/lm-output",
    }));
    mockSpawnSync.mockReset().mockImplementation(() => ({ status: 0 }));
  });

  afterEach(() => {
    mock.restore();
  });

  it("runs the bundled wrangler binary from this package", async () => {
    await runDeploy({ configDir: "/tmp/config" });

    const [command, args, options] = mockSpawnSync.mock.calls[0];
    const expectedBinDir = join(process.cwd(), "node_modules", ".bin");

    expect(command).toBe(process.platform === "win32" ? "wrangler.cmd" : "wrangler");
    expect(args).toEqual([
      "pages",
      "deploy",
      "website",
      "--project-name=test-newsletter",
      "--commit-dirty=true",
      "--branch=main",
    ]);
    expect(options.cwd).toBe("/tmp/lm-output");
    expect(options.stdio).toBe("inherit");
    expect(options.env.CLOUDFLARE_API_TOKEN).toBe("cf_test_123");
    expect(options.env.PATH.startsWith(`${expectedBinDir}${delimiter}`)).toBe(true);
    expect(options.env.WRANGLER_HIDE_BANNER).toBe("true");
    expect(logs.some((line) => line.includes("Deploy complete"))).toBe(true);
  });

  it("throws a reinstall hint when the bundled wrangler executable is missing", async () => {
    const error = new Error("spawn wrangler ENOENT") as NodeJS.ErrnoException;
    error.code = "ENOENT";
    mockSpawnSync.mockReset().mockImplementation(() => ({ status: null, error }));

    await expect(runDeploy({ configDir: "/tmp/config" })).rejects.toThrow(
      /Bundled wrangler executable was not found/,
    );
  });
});
