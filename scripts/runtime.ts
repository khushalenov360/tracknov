import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { homedir } from "node:os";

function firstNonEmptyLine(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
}

export function resolveBunExecutable() {
  if (process.platform !== "win32") {
    return "bun";
  }

  const whereResult = spawnSync("where.exe", ["bun"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  if (whereResult.status === 0) {
    const resolved = firstNonEmptyLine(whereResult.stdout);
    if (resolved) {
      return resolved;
    }
  }

  const homeBun = resolve(homedir(), ".bun", "bin", "bun.exe");
  const localAppData = process.env.LOCALAPPDATA ? resolve(process.env.LOCALAPPDATA, "bun", "bin", "bun.exe") : "";
  const programFiles = process.env["ProgramFiles"] ? resolve(process.env["ProgramFiles"], "Bun", "bun.exe") : "";
  const programFilesX86 = process.env["ProgramFiles(x86)"] ? resolve(process.env["ProgramFiles(x86)"], "Bun", "bun.exe") : "";
  const candidates = [homeBun, localAppData, programFiles, programFilesX86].filter((candidate) => candidate.length > 0);

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    "Bun was not found. Install Bun or add it to PATH, then rerun the launcher. On Windows, common locations are %USERPROFILE%\\.bun\\bin\\bun.exe and %LOCALAPPDATA%\\bun\\bin\\bun.exe.",
  );
}
