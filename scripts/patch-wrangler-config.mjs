#!/usr/bin/env node
/**
 * Patch dist/server/wrangler.json with deployer-supplied binding ids.
 *
 * Why: wrangler.jsonc at the repo root ships without real D1/KV ids so the
 * starter stays multi-tenant. The Astro adapter copies bindings into
 * dist/server/wrangler.json at build time. Wrangler then requires a valid
 * database_id / KV id — or the binding must be omitted so the Worker keeps
 * the dashboard ("inherited") binding.
 *
 * Expected env vars (set them on the Cloudflare Worker project for CI):
 *   CF_D1_DATABASE_ID  — UUID from `wrangler d1 create <name>` / dashboard
 *   CF_KV_SESSION_ID   — id from `wrangler kv namespace create SESSION`
 *   CF_R2_BUCKET       — optional override
 *   CF_R2_PUBLIC_URL   — optional override (compiled in at build time)
 *
 * Runs as part of `build:cf`.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const CONFIG_PATH = "dist/server/wrangler.json";
const PLACEHOLDER_RE = /REPLACE|TODO|CHANGEME|YOUR_/i;
const UUID_RE =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidId(value) {
	return typeof value === "string" && UUID_RE.test(value) && !PLACEHOLDER_RE.test(value);
}

if (!existsSync(CONFIG_PATH)) {
	console.error(
		`[patch-wrangler] ${CONFIG_PATH} not found — run \`astro build\` with DEPLOY_TARGET=cloudflare first.`,
	);
	process.exit(1);
}

const config = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
const patches = [];

const d1Id = process.env.CF_D1_DATABASE_ID;
if (Array.isArray(config.d1_databases)) {
	if (isValidId(d1Id)) {
		for (const db of config.d1_databases) {
			if (db.binding === "DB") {
				db.database_id = d1Id;
				patches.push(`d1.DB.database_id = ${d1Id.slice(0, 8)}…`);
			}
		}
	} else {
		// Drop D1 from deploy config so Workers Builds keeps the dashboard binding
		// (shown as "inherited"), same as SESSION when no KV id is present.
		const had = config.d1_databases.length;
		delete config.d1_databases;
		patches.push(`d1 omitted (${had}) — inherit dashboard DB binding`);
	}
}

const kvId = process.env.CF_KV_SESSION_ID;
if (Array.isArray(config.kv_namespaces)) {
	if (isValidId(kvId)) {
		for (const ns of config.kv_namespaces) {
			if (ns.binding === "SESSION") {
				ns.id = kvId;
				patches.push(`kv.SESSION.id = ${kvId.slice(0, 8)}…`);
			}
		}
	} else {
		// Keep namespaces without ids only if they already lack ids; strip any
		// placeholder ids so wrangler can inherit.
		for (const ns of config.kv_namespaces) {
			if (ns.id && !isValidId(ns.id)) {
				delete ns.id;
				patches.push(`kv.${ns.binding}.id cleared — inherit`);
			}
		}
	}
}

const r2Bucket = process.env.CF_R2_BUCKET;
if (r2Bucket && Array.isArray(config.r2_buckets)) {
	for (const b of config.r2_buckets) {
		if (b.binding === "MEDIA") {
			b.bucket_name = r2Bucket;
			patches.push(`r2.MEDIA.bucket_name = ${r2Bucket}`);
		}
	}
}

const r2PublicUrl = process.env.CF_R2_PUBLIC_URL;
if (r2PublicUrl) {
	patches.push(`r2.publicUrl = ${r2PublicUrl} (compiled in)`);
}

writeFileSync(CONFIG_PATH, JSON.stringify(config, null, "\t") + "\n");

// Cloudflare Workers Builds runs `npx wrangler deploy` with no --config flag, so
// it would otherwise read root wrangler.jsonc (source entry + placeholder ids).
// Emit a root wrangler.json (preferred over .jsonc) that matches the patched
// dist config so plain deploy uses the built worker + inherited bindings.
writeFileSync("wrangler.json", JSON.stringify(config, null, "\t") + "\n");
console.log(`[patch-wrangler] Patched: ${patches.join(", ") || "(no-op)"}`);
console.log("[patch-wrangler] Wrote wrangler.json for plain `wrangler deploy`");
