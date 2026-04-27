import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createInterface } from "node:readline/promises";
import { setTimeout as delay } from "node:timers/promises";
import { stdin, stdout } from "node:process";
import { resolveBunExecutable } from "./runtime";

const rl = createInterface({ input: stdin, output: stdout });
const requestedBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3010";

function openBrowser(url: string) {
  const platform = process.platform;
  if (platform === "win32") {
    spawn("cmd", ["/c", "start", "", url], { stdio: "ignore", shell: false, detached: true });
    return;
  }
  if (platform === "darwin") {
    spawn("open", [url], { stdio: "ignore", shell: false, detached: true });
    return;
  }
  spawn("xdg-open", [url], { stdio: "ignore", shell: false, detached: true });
}

async function waitForServer(url: string, attempts = 90) {
  for (let index = 0; index < attempts; index += 1) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 307 || response.status === 308) {
        return;
      }
    } catch {
      // server not ready yet
    }
    await delay(1_000);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function isPortFree(port: number) {
  return new Promise<boolean>((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

async function pickPort(startPort: number) {
  for (let port = startPort; port < startPort + 20; port += 1) {
    if (await isPortFree(port)) {
      return port;
    }
  }
  throw new Error(`Could not find a free port starting from ${startPort}.`);
}

async function confirm(question: string, defaultYes = true) {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = (await rl.question(`${question} (${hint}): `)).trim().toLowerCase();
  if (!answer) {
    return defaultYes;
  }
  return answer === "y" || answer === "yes";
}

async function main() {
  console.log("Starting HaritaDocs local studio...");
  const requestedUrl = new URL(requestedBaseUrl);
  const port = await pickPort(Number(requestedUrl.port || "3010"));
  const baseUrl = `${requestedUrl.protocol}//${requestedUrl.hostname}:${port}`;
  const bun = resolveBunExecutable();

  const devServer = spawn(bun, ["run", "dev", "--", "--port", String(port)], {
    stdio: "inherit",
    shell: false,
    env: process.env,
  });

  const stopServer = () => {
    devServer.kill("SIGINT");
    rl.close();
  };

  process.on("SIGINT", stopServer);
  process.on("SIGTERM", stopServer);

  try {
    await waitForServer(`${baseUrl}/login`);
    console.log(`\nHaritaDocs is ready at ${baseUrl}`);
    console.log("The smoke test walks through dashboard, project workspace, and submission flow.");

    openBrowser(`${baseUrl}/login`);
    console.log("The browser should open to the login page automatically.");

    if (await confirm("Run the Playwright smoke test now?", true)) {
      const smoke = spawn(
        process.platform === "win32" ? "npx.cmd" : "npx",
        ["playwright", "test", "tests/onboarding-smoke.spec.ts"],
        {
          stdio: "inherit",
          shell: false,
          env: {
            ...process.env,
            PLAYWRIGHT_BASE_URL: baseUrl,
          },
        },
      );

      await new Promise<void>((resolve, reject) => {
        smoke.on("exit", (code) => {
          if (code === 0) {
            resolve();
            return;
          }
          reject(new Error(`Playwright smoke test failed with exit code ${code ?? "unknown"}.`));
        });
        smoke.on("error", reject);
      });

      console.log("\nSmoke test passed.");
    }

    console.log("\nLocal studio is still running. Press Ctrl+C when you are done.");
    await new Promise<void>((resolve) => {
      devServer.on("exit", () => resolve());
    });
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  rl.close();
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
