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
      "no-restricted-imports": ["error", {
        "patterns": [
          {
            "group": ["**/document-intelligence/**"],
            "message": "Direct imports from document-intelligence inside governance modules is restricted to prevent cycles. Use types or services."
          },
          {
            "group": ["**/governance/**"],
            "message": "Direct imports from governance inside UI components or raw pipelines are prohibited. Use high-level orchestration hooks."
          }
        ]
      }]
    },
  },
];
