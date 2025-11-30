import alchemy from "alchemy";
import { Vite } from "alchemy/cloudflare";
import { Worker } from "alchemy/cloudflare";
import { D1Database } from "alchemy/cloudflare";
import { config } from "dotenv";

config({ path: "./.env" });
config({ path: "./apps/web/.env" });
config({ path: "./apps/server/.env" });

const app = await alchemy("crt");

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

await app.finalize();
