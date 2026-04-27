#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { createInterface } from "node:readline/promises";
import { dirname, resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const cwd = process.cwd();
const envPath = resolve(cwd, ".env.local");
const envExamplePath = resolve(cwd, ".env.example");

const rl = createInterface({ input: stdin, output: stdout });

function commandExists(command) {
  const checker = process.platform === "win32" ? "where.exe" : "which";
  return spawnSync(checker, [command], { stdio: "ignore" }).status === 0;
}

function packageManager() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function parseEnvFile(filePath) {
  const values = {};
  if (!existsSync(filePath)) {
    return values;
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
    values[trimmed.slice(0, separatorIndex)] = trimmed.slice(separatorIndex + 1);
  }
  return values;
}

function writeEnvFile(values) {
  const preferredOrder = [
    "GEMINI_API_KEY",
    "AI_PROVIDER",
    "AI_MODEL",
    "HARITA_TOUR_SEEN",
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
  writeFileSync(envPath, `${lines.join("\n")}\n`, "utf8");
}

async function ask(question, currentValue = "", secret = false) {
  const suffix = currentValue ? ` [current: ${secret ? "******" : currentValue}]` : "";
  const answer = (await rl.question(`${question}${suffix}: `)).trim();
  return answer || currentValue;
}

async function confirm(question, defaultYes = true) {
  const hint = defaultYes ? "Y/n" : "y/N";
  const answer = (await rl.question(`${question} (${hint}): `)).trim().toLowerCase();
  if (!answer) {
    return defaultYes;
  }
  return answer === "y" || answer === "yes";
}

async function chooseMode() {
  console.log("");
  console.log("What do you want to do today?");
  console.log("1) Review project files");
  console.log("2) Upload supporting evidence");
  console.log("3) Prepare the final package");
  console.log("4) Learn what Harita can do");
  console.log("5) Exit");

  const answer = (await rl.question("Select 1, 2, 3, 4, or 5: ")).trim();
  if (!answer || answer === "1") {
    return "review";
  }
  if (answer === "2") {
    return "upload";
  }
  if (answer === "3") {
    return "package";
  }
  if (answer === "4") {
    return "learn";
  }
  return "exit";
}

function run(command, args) {
  const result =
    process.platform === "win32"
      ? spawnSync("cmd.exe", ["/d", "/s", "/c", command, ...args], { cwd, stdio: "inherit", shell: false, env: process.env })
      : spawnSync(command, args, { cwd, stdio: "inherit", shell: false, env: process.env });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

function isEmptyWorkspace() {
  const entries = ["package.json", "app", "components", "lib", "data", "public", "scripts", "supabase", "tests"];
  return !entries.some((entry) => existsSync(resolve(cwd, entry)));
}

function scaffoldWorkspace() {
  const ignore = new Set(["node_modules", ".next", "playwright-report", "test-results", ".git", ".DS_Store", ".env.local"]);
  const items = [
    "app",
    "bin",
    "components",
    "data",
    "lib",
    "public",
    "scripts",
    "supabase",
    "tests",
    ".eslintrc.json",
    ".gitignore",
    ".mcp.json",
    "components.json",
    "middleware.ts",
    "next.config.mjs",
    "package.json",
    "package-lock.json",
    "playwright.config.ts",
    "postcss.config.mjs",
    "README.md",
    "tailwind.config.ts",
    "tsconfig.json",
  ];

  for (const item of items) {
    const source = resolve(packageRoot, "..", item);
    const destination = resolve(cwd, item);
    if (!existsSync(source) || ignore.has(item)) {
      continue;
    }
    if (existsSync(destination)) {
      continue;
    }
    cpSync(source, destination, { recursive: true });
  }

  mkdirSync(resolve(cwd, "bin"), { recursive: true });
  mkdirSync(resolve(cwd, "scripts"), { recursive: true });
}

function printBanner() {
  console.log("");
  console.log("Harita by Enov360");
  console.log("Consultant workspace, guided by AI.");
  console.log("");
}

function printCapabilities() {
  console.log("What Harita can do:");
  console.log("- Keep each project in a simple checklist");
  console.log("- Collect notes, uploads, and review actions in one place");
  console.log("- Prepare a final submission package when the work is ready");
  console.log("- Show a local studio so non-technical users are not lost");
  console.log("");
}

function printNextStep(mode) {
  if (mode === "review") {
    console.log("Recommended path: open the dashboard, choose the project with the most open notes, and review the checklist first.");
    return;
  }

  if (mode === "upload") {
    console.log("Recommended path: open the project checklist, use the file panel on the right, and upload the required evidence only.");
    return;
  }

  if (mode === "package") {
    console.log("Recommended path: open the submission page and check whether all must-complete items are finished before exporting.");
    return;
  }

  printCapabilities();
}

async function showFirstRunTour(envValues) {
  if (envValues.HARITA_TOUR_SEEN === "1") {
    return envValues;
  }

  console.log("First-time tour:");
  printCapabilities();
  console.log("How to use Harita:");
  console.log("1. Open a project and look for items that still need attention.");
  console.log("2. Add notes or supporting files only where they are needed.");
  console.log("3. Use the checklist to move work toward completion.");
  console.log("4. When the project is ready, generate the final package.");
  console.log("");

  if (await confirm("Show this tour only once and continue?", true)) {
    envValues.HARITA_TOUR_SEEN = "1";
    writeEnvFile(envValues);
  }

  return envValues;
}

async function main() {
  printBanner();

  if (!existsSync(resolve(cwd, "package.json"))) {
    if (!isEmptyWorkspace()) {
      console.error("This folder already has files, but no package.json. Run the launcher from the Harita project folder or scaffold into a clean folder.");
      process.exit(1);
    }

    if (!(await confirm("Scaffold a new Harita workspace here?", true))) {
      process.exit(0);
    }

    scaffoldWorkspace();
    console.log("Workspace scaffolded.");
  }

  const pm = packageManager();
  if (!commandExists("npm")) {
    console.error("npm is not installed.");
    process.exit(1);
  }

  if (await confirm("Install project dependencies now?", true)) {
    run(pm, ["install"]);
  }

  const envValues = parseEnvFile(existsSync(envPath) ? envPath : envExamplePath);
  envValues.GEMINI_API_KEY = await ask("Paste your Gemini API key", envValues.GEMINI_API_KEY ?? "", true);
  envValues.AI_PROVIDER = "gemini";
  envValues.AI_MODEL = envValues.AI_MODEL || "gemini-2.5-flash";
  envValues.NEXT_PUBLIC_SUPABASE_URL = await ask("Paste your Supabase project URL", envValues.NEXT_PUBLIC_SUPABASE_URL ?? "");
  envValues.NEXT_PUBLIC_SUPABASE_ANON_KEY = await ask("Paste your Supabase anon key", envValues.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "", true);
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
  await showFirstRunTour(envValues);

  const mode = await chooseMode();
  if (mode === "exit") {
    return;
  }

  if (mode === "learn") {
    printCapabilities();
    if (!(await confirm("Start the guided localhost studio now?", true))) {
      return;
    }
  }

  printNextStep(mode);
  console.log("Starting the guided local studio on localhost...");
  console.log("When the server is ready, open the URL printed in the terminal.");
  run(pm, ["run", "dev:guided"]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
