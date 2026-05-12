import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  {
    ignores: [".next/", "node_modules/", "dist/", "build/", "coverage/", "supabase/.temp/", "scratch/"],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      // Add any specific rule overrides here
    },
  },
];
