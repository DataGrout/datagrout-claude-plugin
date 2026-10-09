#!/usr/bin/env node

/**
 * DataGrout-specific submission checks that complement `claude plugin validate`,
 * which checks only that files are well-formed. These cover the directory rows of
 * https://claude.com/docs/plugins/pre-submission-checklist that the CLI skips:
 * .mcp.json limited to type + url, listing metadata, matching versions, a square
 * icon, README length and image references, file names, sizes and types, and no
 * hooks, scripts or package installs shipped inside the plugin.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = process.cwd();
const pluginRel = "plugins/datagrout";
const pluginDir = path.join(repoRoot, pluginRel);
const serverOrigin = "https://gateway.datagrout.ai";
const errors = [];

const imageExts = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);
const fontExts = new Set([".woff", ".woff2", ".ttf", ".otf"]);
const systemFiles = new Set([".ds_store", "thumbs.db", "desktop.ini", "__macosx"]);
const windowsDeviceName = /^(con|prn|aux|nul|com\d|lpt\d)(\..*)?$/i;
const forbiddenEntries = [
  "hooks", "scripts", "bin", "agents", "package.json", "package-lock.json",
  "npm-shrinkwrap.json", "bun.lock", "bun.lockb", ".npmrc", "bunfig.toml", "uv.toml",
];

function addError(message) {
  errors.push(message);
}

async function readJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    addError(`${relativePath} is missing or not valid JSON: ${error.message}`);
    return null;
  }
}

async function pathExists(targetPath) {
  try {
    await fs.lstat(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const results = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    results.push({ fullPath, entry });
    if (entry.isDirectory()) {
      results.push(...(await walk(fullPath)));
    }
  }
  return results;
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function checkMcpConfig(mcp) {
  const servers = Object.keys(mcp?.mcpServers ?? {});
  if (servers.length !== 1 || servers[0] !== "datagrout") {
    addError(`.mcp.json must define exactly one server, "datagrout" (found: ${servers.join(", ") || "none"}).`);
  }
  const server = mcp?.mcpServers?.datagrout;
  if (!server) {
    return;
  }
  if (typeof server.url !== "string" || !server.url.startsWith(`${serverOrigin}/`)) {
    addError(`.mcp.json "datagrout.url" must be an ${serverOrigin}/ URL.`);
  }
  const extraKeys = Object.keys(server).filter((key) => key !== "type" && key !== "url");
  if (extraKeys.length > 0 || server.type !== "http") {
    addError(
      `.mcp.json "datagrout" must be exactly {"type": "http", "url"}: DataGrout uses OAuth 2.1 with automatic DCR, so no headers or secrets (found: ${Object.keys(server).join(", ")}).`,
    );
  }
}

function checkManifest(manifest) {
  if (manifest?.name !== "datagrout") {
    addError('plugin.json "name" must stay "datagrout"; it is the plugin\'s permanent identity.');
  }
  for (const field of ["description", "version", "license"]) {
    if (typeof manifest?.[field] !== "string" || manifest[field].length === 0) {
      addError(`plugin.json must set "${field}".`);
    }
  }
  if (typeof manifest?.author?.name !== "string") {
    addError('plugin.json must set "author.name".');
  }
  for (const field of ["homepage", "documentationUrl", "supportUrl", "privacyPolicyUrl", "termsOfServiceUrl"]) {
    if (field in (manifest ?? {}) && !isHttpsUrl(manifest[field])) {
      addError(`plugin.json "${field}" must be an https:// URL.`);
    }
  }
  if (manifest?.experimental) {
    addError('plugin.json must not use "experimental"; component keys there are blocked.');
  }
}

function checkVersions(manifest, marketplace) {
  if (manifest?.version !== marketplace?.version) {
    addError(
      `plugin.json version (${manifest?.version}) and marketplace.json version (${marketplace?.version}) must match.`,
    );
  }
  for (const entry of marketplace?.plugins ?? []) {
    if ("version" in entry) {
      addError(`marketplace.json entry "${entry.name}" sets "version"; keep it only in plugin.json, which wins at install.`);
    }
  }
}

async function checkIcon(manifest) {
  if (typeof manifest?.icon !== "string" || !manifest.icon.endsWith(".png")) {
    addError('plugin.json "icon" must reference a .png file inside the plugin.');
    return;
  }
  const iconPath = path.resolve(pluginDir, manifest.icon);
  if (!iconPath.startsWith(`${pluginDir}${path.sep}`)) {
    addError(`plugin.json "icon" (${manifest.icon}) points outside the plugin folder.`);
    return;
  }
  const icon = await fs.readFile(iconPath).catch(() => null);
  if (icon === null) {
    addError(`plugin.json "icon" (${manifest.icon}) does not exist.`);
    return;
  }
  // Width and height are big-endian uint32s in the IHDR chunk at bytes 16-23.
  const isPng = icon.subarray(1, 4).toString("ascii") === "PNG";
  if (!isPng || icon.readUInt32BE(16) !== icon.readUInt32BE(20)) {
    addError(`${manifest.icon} must be a square PNG.`);
  }
}

async function checkReadme() {
  const readme = await fs.readFile(path.join(pluginDir, "README.md"), "utf8").catch(() => null);
  if (readme === null) {
    addError(`${pluginRel}/README.md is missing.`);
    return;
  }
  const prose = readme.replace(/```[\s\S]*?```/g, " ");
  const words = prose.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word)).length;
  if (words < 40) {
    addError(`${pluginRel}/README.md has ${words} words outside code blocks; the directory needs at least 40.`);
  }
}

// A bundled image named in backticks, a code block, or a command is held for a reviewer.
async function checkImageReferences(files) {
  const imageNames = files
    .filter(({ entry, fullPath }) => entry.isFile() && imageExts.has(path.extname(fullPath).toLowerCase()))
    .map(({ fullPath }) => path.basename(fullPath));
  if (imageNames.length === 0) {
    return;
  }

  for (const { fullPath, entry } of files) {
    if (!entry.isFile() || path.extname(fullPath) !== ".md") {
      continue;
    }
    const relative = path.relative(repoRoot, fullPath);
    const text = await fs.readFile(fullPath, "utf8");
    const codeSpans = [...text.matchAll(/```[\s\S]*?```|`[^`\n]+`/g)].map((match) => match[0]);
    const isCommand = relative.startsWith(`${pluginRel}/commands/`);
    for (const name of imageNames) {
      if (codeSpans.some((span) => span.includes(name)) || (isCommand && text.includes(name))) {
        addError(`${relative} names the bundled image ${name} in code or a command; use Markdown image syntax in the README instead.`);
      }
    }
  }
}

async function checkFiles(files) {
  const seen = new Map();
  let fileCount = 0;

  for (const { fullPath, entry } of files) {
    const relative = path.relative(repoRoot, fullPath);
    const name = entry.name;

    if (systemFiles.has(name.toLowerCase())) {
      addError(`${relative} is a macOS or Windows system file; remove it.`);
    }
    if (/[:<>"|?*]/.test(name) || /[. ]$/.test(name) || windowsDeviceName.test(name)) {
      addError(`${relative} is not a valid file name on both Windows and macOS.`);
    }
    const folded = path.relative(pluginDir, fullPath).toLowerCase();
    if (seen.has(folded)) {
      addError(`${relative} and ${seen.get(folded)} differ only by capitalization.`);
    }
    seen.set(folded, relative);

    if (entry.isSymbolicLink()) {
      addError(`${relative} is a symbolic link; commit a regular file instead.`);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }

    fileCount += 1;
    const ext = path.extname(name).toLowerCase();
    const isImageOrFont = imageExts.has(ext) || fontExts.has(ext);
    const content = await fs.readFile(fullPath);

    if (content.length >= 5 * 1024 * 1024) {
      addError(`${relative} is 5 MiB or larger.`);
    } else if (!isImageOrFont && content.length >= 256 * 1024) {
      addError(`${relative} is 256 KiB or larger; the directory holds it for a reviewer.`);
    }
    if (!isImageOrFont && content.includes(0)) {
      addError(`${relative} is a binary file; only text, images and fonts pass without a reviewer hold.`);
    }
    // A complete PNG ends with the 12-byte IEND chunk.
    if (ext === ".png" && content.subarray(-8, -4).toString("ascii") !== "IEND") {
      addError(`${relative} is not a complete PNG.`);
    }
  }

  if (fileCount > 512) {
    addError(`${pluginRel} has ${fileCount} files; the directory holds plugins with more than 512.`);
  }
}

async function checkNoExecutables() {
  for (const name of forbiddenEntries) {
    if (await pathExists(path.join(pluginDir, name))) {
      addError(`${pluginRel}/${name} exists; v1 ships no hooks, agents, scripts or package installs.`);
    }
  }
}

async function main() {
  const marketplace = await readJson(".claude-plugin/marketplace.json");
  const manifest = await readJson(`${pluginRel}/.claude-plugin/plugin.json`);
  const mcp = await readJson(`${pluginRel}/.mcp.json`);
  const files = await walk(pluginDir);

  checkMcpConfig(mcp);
  checkManifest(manifest);
  checkVersions(manifest, marketplace);
  await checkIcon(manifest);
  await checkReadme();
  await checkImageReferences(files);
  await checkFiles(files);
  await checkNoExecutables();
  if (!(await pathExists(path.join(pluginDir, "LICENSE")))) {
    addError(`${pluginRel}/LICENSE is missing.`);
  }

  if (errors.length > 0) {
    console.error("DataGrout checks failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exit(1);
  }

  console.log("DataGrout checks passed.");
}

await main();
