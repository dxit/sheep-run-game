import { defineConfig } from "vitest/config";

function resolveBasePath(): string {
    if (!process.env.GITHUB_ACTIONS) {
        return "/";
    }

    const repository = process.env.GITHUB_REPOSITORY ?? "";
    const repositoryName = repository.split("/")[1] ?? "";

    // User/organization pages (repo: <name>.github.io) are served from root.
    if (!repositoryName || repositoryName.endsWith(".github.io")) {
        return "/";
    }

    return `/${repositoryName}/`;
}

export default defineConfig({
    base: resolveBasePath(),
    test: {
        globals: false,
        environment: "node",
        include: ["tests/**/*.test.ts"],
    },
});
