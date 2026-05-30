import { Project } from "ts-morph";
import * as path from "path";

const CORE_FOLDERS = ["dtos", "database", "auth", "workflow", "events", "api", "telemetry", "webhooks"];
const ENGINE_FOLDERS = ["assistant", "harita", "intelligence", "governance", "document-intelligence", "replay", "benchmarking", "orchestration", "services", "workers", "assignment", "customer-health", "customer-intelligence", "integrations", "marketplace", "productivity", "reporting", "reviewer", "security", "suppliers", "support", "uploads", "evidence"];

const project = new Project();
project.addSourceFilesAtPaths("apps/tracknov-web/**/*.ts");
project.addSourceFilesAtPaths("apps/tracknov-web/**/*.tsx");
project.addSourceFilesAtPaths("packages/**/*.ts");
project.addSourceFilesAtPaths("packages/**/*.tsx");

console.log(`Loaded ${project.getSourceFiles().length} files.`);

for (const sourceFile of project.getSourceFiles()) {
    let changed = false;
    for (const importDecl of sourceFile.getImportDeclarations()) {
        const specifier = importDecl.getModuleSpecifierValue();
        
        // Rewrite Core folders
        for (const folder of CORE_FOLDERS) {
            if (specifier.startsWith(`@/lib/${folder}`) || specifier.includes(`/lib/${folder}`)) {
                const newSpecifier = specifier.replace(new RegExp(`.*\\/?lib\\/${folder}`), `@tracknov/core/${folder}`);
                importDecl.setModuleSpecifier(newSpecifier);
                changed = true;
            }
        }
        
        // Rewrite Engine folders
        for (const folder of ENGINE_FOLDERS) {
            if (specifier.startsWith(`@/lib/${folder}`) || specifier.includes(`/lib/${folder}`)) {
                const newSpecifier = specifier.replace(new RegExp(`.*\\/?lib\\/${folder}`), `@tracknov/harita-engine/${folder}`);
                importDecl.setModuleSpecifier(newSpecifier);
                changed = true;
            }
        }
        
        // Rewrite UI
        if (specifier.startsWith("@/components/ui") || specifier.includes("/components/ui")) {
            const newSpecifier = specifier.replace(/.*\/components\/ui/, "@tracknov/ui/ui");
            importDecl.setModuleSpecifier(newSpecifier);
            changed = true;
        }
    }
    
    if (changed) {
        console.log(`Updated ${sourceFile.getFilePath()}`);
        sourceFile.saveSync();
    }
}
console.log("Refactoring complete.");
