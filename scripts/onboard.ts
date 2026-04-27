import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import { resolveBunExecutable } from "./runtime";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const projectRoot = resolve(currentDir, "..");
const envLocalPath = resolve(projectRoot, ".env.local");

const rl = createInterface({ input: stdin, output: stdout });

type EnvMap = Record<string, string>;

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

function parseEnvFile(filePath: string) {
  const map: EnvMap = {};
  if (!existsSync(filePath)) {
    return map;
  }

  const lines = readFileSync(filePath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    map[key] = value;
  }
  return map;
}

function writeEnvFile(values: EnvMap) {
  const preferredOrder = [
    "GEMINI_API_KEY",
    "AI_PROVIDER",
    "AI_MODEL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_PROJECT_REF",
    "SUPABASE_DB_PASSWORD",
    "SUPABASE_ACCESS_TOKEN",
    "SEED_PROJECT_NAME",
    "SEED_PROJECT_TARGET_RATING",
    "SEED_OWNER_USER_ID",
    "PLAYWRIGHT_BASE_URL",
  ];

  const lines = preferredOrder.map((key) => `${key}=${values[key] ?? ""}`);
  writeFileSync(envLocalPath, `${lines.join("\n")}\n`, "utf8");
}

async function ask(question: string, currentValue = "", secret = false) {
  const suffix = currentValue ? ` [current: ${secret ? "••••••" : currentValue}]` : "";
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || currentValue;
}

async function confirm(question: string, defaultYes = true) {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = (await rl.question(`${question} (${hint}): `)).trim().toLowerCase();
  if (!answer) {
    return defaultYes;
  }
  return answer === "y" || answer === "yes";
}

async function installDependencies() {
  section("Dependencies");
  console.log("This runs bun install so the app, onboarding tooling, and smoke test are ready.");
  if (await confirm("Run bun install now?", true)) {
    const bun = resolveBunExecutable();
    const result = spawnSync(bun, ["install"], { cwd: projectRoot, stdio: "inherit", shell: false });
    if (result.status !== 0) {
      throw new Error(`bun install failed with exit code ${result.status ?? "unknown"}.`);
    }
  }
}

async function configureEnv() {
  section("Environment");
  const envValues = parseEnvFile(envLocalPath);
  envValues.GEMINI_API_KEY = await ask("Paste your Gemini API key", envValues.GEMINI_API_KEY ?? "", true);
  envValues.AI_PROVIDER = "gemini";
  envValues.AI_MODEL = envValues.AI_MODEL || "gemini-2.5-flash";
  envValues.NEXT_PUBLIC_SUPABASE_URL = await ask(
    "Paste your Supabase project URL",
    envValues.NEXT_PUBLIC_SUPABASE_URL ?? "",
  );
  envValues.NEXT_PUBLIC_SUPABASE_ANON_KEY = await ask(
    "Paste your Supabase anon key",
    envValues.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    true,
  );
  envValues.SUPABASE_SERVICE_ROLE_KEY = envValues.SUPABASE_SERVICE_ROLE_KEY || "";
  envValues.SUPABASE_PROJECT_REF = "";
  envValues.SUPABASE_DB_PASSWORD = "";
  envValues.SUPABASE_ACCESS_TOKEN = "";
  envValues.SEED_PROJECT_NAME = envValues.SEED_PROJECT_NAME || "HaritaDocs Seed Project";
  envValues.SEED_PROJECT_TARGET_RATING = envValues.SEED_PROJECT_TARGET_RATING || "Gold";
  envValues.SEED_OWNER_USER_ID = "";
  envValues.PLAYWRIGHT_BASE_URL = envValues.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3010";

  writeEnvFile(envValues);
  console.log(".env.local updated.");
  return envValues;
}

async function main() {
  console.log("HaritaDocs onboarding");
  console.log("This flow asks for your Gemini API key and the Supabase settings needed to run the live workspace.");

  try {
    await installDependencies();
    await configureEnv();

    section("Launch");
    console.log("The guided dev launcher starts Next.js and can run the smoke test.");
    if (await confirm("Launch the local studio now?", true)) {
      const bun = resolveBunExecutable();
      const result = spawnSync(bun, ["run", "dev:guided"], { cwd: projectRoot, stdio: "inherit", shell: false, env: process.env });
      if (result.status !== 0) {
        throw new Error(`bun run dev:guided failed with exit code ${result.status ?? "unknown"}.`);
      }
    }
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  rl.close();
  console.error("\nOnboarding stopped.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
