const fs = require('fs');
const path = require('path');

function replaceRoster(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceRoster(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            if (content.includes("import { ROSTER } from")) {
                // Find the exact import statement
                content = content.replace(/import \{ ROSTER \} from ['"].*?constants\/roster['"];?/g, "import { getAllPlayers } from '@/utils/teamLoader';");
                
                // Add `const ROSTER = getAllPlayers();` after imports
                // Let's just replace `ROSTER` with `getAllPlayers()` directly in the code, or inject the const.
                // Actually, replacing `ROSTER` with `getAllPlayers()` everywhere might be safer if it's used in functions.
                // But some places use `ROSTER.map`, so `getAllPlayers().map` works.
                content = content.replace(/\bROSTER\b/g, "getAllPlayers()");
                
                // Fix the import path if we use alias or relative
                // Let's use a relative path trick or just use the alias if configured.
                // Vite usually supports `@/` if configured, but let's use relative paths by counting depth.
                const depth = fullPath.split(path.sep).length - 2; // -1 for file, -1 for root
                const prefix = depth === 0 ? './' : '../'.repeat(depth);
                content = content.replace(/@\/utils\/teamLoader/g, prefix + 'utils/teamLoader');
                
                fs.writeFileSync(fullPath, content);
            }
        }
    }
}

replaceRoster('./components');
replaceRoster('./utils');
replaceRoster('./services');
