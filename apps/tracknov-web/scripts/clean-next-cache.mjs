import { rm } from "node:fs/promises";
import { join, resolve } from "node:path";

const repoRoot = resolve(process.cwd());
const nextDir = resolve(join(repoRoot, ".next"));

if (!nextDir.startsWith(repoRoot)) {
  throw new Error(`Refusing to remove unexpected path: ${nextDir}`);
}

await rm(nextDir, { recursive: true, force: true });
