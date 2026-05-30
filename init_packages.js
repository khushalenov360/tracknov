const fs = require('fs');

const pkgs = [
    { dir: 'packages/tracknov-core', name: '@tracknov/core' },
    { dir: 'packages/harita-engine', name: '@tracknov/harita-engine' },
    { dir: 'packages/tracknov-ui', name: '@tracknov/ui' }
];

pkgs.forEach(p => {
    fs.writeFileSync(`${p.dir}/package.json`, JSON.stringify({
        name: p.name,
        version: "0.1.0",
        main: "src/index.ts",
        types: "src/index.ts",
        dependencies: {}
    }, null, 2));

    fs.writeFileSync(`${p.dir}/tsconfig.json`, JSON.stringify({
        compilerOptions: {
            target: "ES2022",
            module: "ESNext",
            moduleResolution: "node",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            forceConsistentCasingInFileNames: true,
            declaration: true,
            outDir: "dist"
        },
        include: ["src/**/*"]
    }, null, 2));
    
    // create index.ts
    fs.writeFileSync(`${p.dir}/src/index.ts`, `export * from './dummy';\n`);
    fs.writeFileSync(`${p.dir}/src/dummy.ts`, `export const hello = 'world';\n`);
});
