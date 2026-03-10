import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const sourceAssetsDir = resolve(root, "assets");
const publicAssetsDir = resolve(root, "public", "assets");

if (!existsSync(sourceAssetsDir)) {
    console.warn("assets directory not found. Skipping sync.");
    process.exit(0);
}

mkdirSync(publicAssetsDir, { recursive: true });

for (const entry of ["fonts", "sounds"]) {
    const source = resolve(sourceAssetsDir, entry);
    if (!existsSync(source)) {
        continue;
    }
    const target = resolve(publicAssetsDir, entry);
    cpSync(source, target, { recursive: true, force: true });
}

console.log("Assets synced to public/assets");
