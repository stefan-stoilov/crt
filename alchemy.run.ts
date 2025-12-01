import alchemy from "alchemy";
import { D1Database, Vite, Worker } from "alchemy/cloudflare";
import { GitHubComment } from "alchemy/github";
import { CloudflareStateStore } from "alchemy/state";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "./apps/web/.env" });
config({ path: "./apps/server/.env" });

const app = await alchemy("crt", {
	stateStore:
		process.env.NODE_ENV === "production"
			? (scope) =>
					new CloudflareStateStore(scope, {
						email: process.env.CLOUDFLARE_EMAIL,
						apiToken: alchemy.secret(process.env.CLOUDFLARE_API_TOKEN),
					})
			: undefined, // Uses default FileSystemStateStore
});

const db = await D1Database("database", {
	migrationsDir: "packages/db/src/migrations",
});

export const web = await Vite("web", {
	cwd: "apps/web",
	assets: "dist",
	bindings: {
		VITE_SERVER_URL: process.env.VITE_SERVER_URL || "",
	},
	dev: {
		command: "pnpm run dev",
	},
});

export const server = await Worker("server", {
	cwd: "apps/server",
	entrypoint: "src/index.ts",
	compatibility: "node",
	bindings: {
		DB: db,
		CORS_ORIGIN: process.env.CORS_ORIGIN || "",
		BETTER_AUTH_SECRET: alchemy.secret(process.env.BETTER_AUTH_SECRET),
		BETTER_AUTH_URL: process.env.BETTER_AUTH_URL || "",
		POLAR_ACCESS_TOKEN: alchemy.secret(process.env.POLAR_ACCESS_TOKEN),
		POLAR_SUCCESS_URL: process.env.POLAR_SUCCESS_URL || "",
	},
	dev: {
		port: 3000,
	},
});

console.log(`Web    -> ${web.url}`);
console.log(`Server -> ${server.url}`);

if (process.env.PULL_REQUEST) {
	// if this is a PR, add a comment to the PR with the preview URL
	// it will auto-update with each push
	await GitHubComment("preview-comment", {
		owner: "your-username",
		repository: "your-repo",
		issueNumber: Number(process.env.PULL_REQUEST),
		body: `
     ## 🚀 Preview Deployed

     Your changes have been deployed to a preview environment:

     **🌐 Website:** ${web.url}

     Built from commit ${process.env.GITHUB_SHA?.slice(0, 7)}

     ---
     <sub>🤖 This comment updates automatically with each push.</sub>`,
	});
}

await app.finalize();
