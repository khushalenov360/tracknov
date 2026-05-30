const fs = require('fs');
const path = require('path');

const CORE_FOLDERS = ["dtos", "database", "auth", "workflow", "events", "api", "telemetry", "webhooks"];
const ENGINE_FOLDERS = ["assistant", "harita", "intelligence", "governance", "document-intelligence", "replay", "benchmarking", "orchestration", "services", "workers", "assignment", "customer-health", "customer-intelligence", "integrations", "marketplace", "productivity", "reporting", "reviewer", "security", "suppliers", "support", "uploads", "evidence"];

// 1. Move core folders
CORE_FOLDERS.forEach(f => {
    const src = `apps/tracknov-web/lib/${f}`;
    const dest = `packages/tracknov-core/src/${f}`;
    if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
    }
});

// 2. Move engine folders
ENGINE_FOLDERS.forEach(f => {
    const src = `apps/tracknov-web/lib/${f}`;
    const dest = `packages/harita-engine/src/${f}`;
    if (fs.existsSync(src)) {
        fs.renameSync(src, dest);
    }
});

// 3. Move ui
if (fs.existsSync('apps/tracknov-web/components/ui')) {
    fs.mkdirSync('packages/tracknov-ui/src', { recursive: true });
    fs.renameSync('apps/tracknov-web/components/ui', 'packages/tracknov-ui/src/ui');
}

console.log("Move complete.");
