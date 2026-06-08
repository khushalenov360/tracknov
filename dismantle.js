const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function copyDirRecursive(src, dest) {
    if (!fs.existsSync(src)) return;
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
        if (entry.name === 'node_modules' || entry.name === '.next') continue;
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDirRecursive(srcPath, destPath);
        } else {
            // Only overwrite if it doesn't exist, or if we want to force
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

async function run() {
    console.log("1. Moving apps/tracknov-web to root...");
    copyDirRecursive(path.join(__dirname, 'apps', 'tracknov-web'), __dirname);
    
    console.log("2. Moving packages to lib/ and components/...");
    const coreSrc = path.join(__dirname, 'packages', 'tracknov-core', 'src');
    if (fs.existsSync(coreSrc)) {
        copyDirRecursive(coreSrc, path.join(__dirname, 'lib', 'core'));
    }

    const haritaSrc = path.join(__dirname, 'packages', 'harita-engine', 'src');
    if (fs.existsSync(haritaSrc)) {
        copyDirRecursive(haritaSrc, path.join(__dirname, 'lib', 'harita-engine'));
    }

    const uiSrc = path.join(__dirname, 'packages', 'tracknov-ui', 'src');
    if (fs.existsSync(uiSrc)) {
        copyDirRecursive(uiSrc, path.join(__dirname, 'components', 'ui-lib'));
    }

    console.log("3. Merging package.json...");
    const rootPkgPath = path.join(__dirname, 'package.json');
    const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
    
    const webPkgPath = path.join(__dirname, 'apps', 'tracknov-web', 'package.json');
    const webPkg = JSON.parse(fs.readFileSync(webPkgPath, 'utf8'));

    const corePkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'packages', 'tracknov-core', 'package.json'), 'utf8'));
    const haritaPkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'packages', 'harita-engine', 'package.json'), 'utf8'));
    const uiPkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'packages', 'tracknov-ui', 'package.json'), 'utf8'));

    // Merge dependencies
    rootPkg.dependencies = { ...rootPkg.dependencies, ...webPkg.dependencies, ...corePkg.dependencies, ...haritaPkg.dependencies, ...uiPkg.dependencies };
    rootPkg.devDependencies = { ...rootPkg.devDependencies, ...webPkg.devDependencies, ...corePkg.devDependencies, ...haritaPkg.devDependencies, ...uiPkg.devDependencies };
    
    // Remove internal packages
    delete rootPkg.dependencies['@tracknov/core'];
    delete rootPkg.dependencies['@tracknov/harita-engine'];
    delete rootPkg.dependencies['@tracknov/ui'];

    // Remove workspaces
    delete rootPkg.workspaces;

    fs.writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2));

    console.log("4. Updating imports...");
    // We will use a regex approach to find and replace across all .ts/.tsx files
    function replaceInFiles(dir) {
        if (!fs.existsSync(dir)) return;
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            if (file.name === 'node_modules' || file.name === '.next' || file.name === '.git') continue;
            const res = path.resolve(dir, file.name);
            if (file.isDirectory()) {
                replaceInFiles(res);
            } else if (file.isFile() && (res.endsWith('.ts') || res.endsWith('.tsx'))) {
                let content = fs.readFileSync(res, 'utf8');
                let changed = false;
                
                if (content.includes('@tracknov/core')) {
                    content = content.replace(/@tracknov\/core/g, '@/lib/core');
                    changed = true;
                }
                if (content.includes('@tracknov/harita-engine')) {
                    content = content.replace(/@tracknov\/harita-engine/g, '@/lib/harita-engine');
                    changed = true;
                }
                if (content.includes('@tracknov/ui')) {
                    content = content.replace(/@tracknov\/ui/g, '@/components/ui-lib');
                    changed = true;
                }

                if (changed) {
                    fs.writeFileSync(res, content, 'utf8');
                }
            }
        }
    }

    replaceInFiles(path.join(__dirname, 'app'));
    replaceInFiles(path.join(__dirname, 'components'));
    replaceInFiles(path.join(__dirname, 'lib'));
    replaceInFiles(path.join(__dirname, 'scripts'));
    replaceInFiles(path.join(__dirname, 'bin'));

    console.log("Done. Please delete apps/ and packages/ manually to ensure safety.");
}

run();
