import { runBuild } from "./build.js";

interface DeployOptions {
  configDir: string;
}

export async function runDeploy(options: DeployOptions): Promise<void> {
  const { configDir } = options;

  const { config, outputDir } = await runBuild({ configDir, includeDrafts: false });

  console.log(`Deploying to Cloudflare Pages (${config.web_hosting.project})...`);

  if (!config.env.CLOUDFLARE_API_TOKEN) {
    throw new Error(
      "CLOUDFLARE_API_TOKEN is not configured. Set CLOUDFLARE_API_TOKEN env var or add it to laughing-man.yaml."
    );
  }

  const proc = Bun.spawn([
    "bunx", "wrangler", "pages", "deploy", "website",
    `--project-name=${config.web_hosting.project}`,
  ], {
    cwd: outputDir,
    stdout: "inherit",
    stderr: "inherit",
    env: { ...process.env, CLOUDFLARE_API_TOKEN: config.env.CLOUDFLARE_API_TOKEN },
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(
      `wrangler pages deploy failed with exit code ${exitCode}.\n` +
      `If wrangler is not installed, run: bun add -D wrangler`
    );
  }

  console.log("Deploy complete.");
}
