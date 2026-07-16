import fs from "fs";
import path from "path";

const PLUGINS_DIR = path.join(".amber", "plugins");
const SETTINGS_FILE = path.join(".amber", "plugin-settings.json");

export interface PluginFile {
  filename: string;
  enabled: boolean;
}

function pluginsDirPath(root: string): string {
  return path.join(root, PLUGINS_DIR);
}

function settingsPath(root: string): string {
  return path.join(root, SETTINGS_FILE);
}

function readSettings(root: string): Record<string, boolean> {
  try {
    const raw = fs.readFileSync(settingsPath(root), "utf-8");
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeSettings(root: string, settings: Record<string, boolean>): void {
  fs.mkdirSync(path.join(root, ".amber"), { recursive: true });
  fs.writeFileSync(settingsPath(root), JSON.stringify(settings, null, 2), "utf-8");
}

/** Plugins are just .js files dropped into <vault>/.amber/plugins/ - no marketplace, no install
 * step, matching where the project actually is right now. Enabled by default the first time
 * they're seen, so dropping a file in and reloading is enough to try it. */
export function listPluginFiles(root: string): PluginFile[] {
  const dir = pluginsDirPath(root);
  let entries: string[] = [];
  try {
    entries = fs.readdirSync(dir).filter((f) => f.endsWith(".js"));
  } catch {
    return [];
  }
  const settings = readSettings(root);
  return entries.sort().map((filename) => ({
    filename,
    enabled: settings[filename] ?? true,
  }));
}

export function pluginsDirAbsolute(root: string): string {
  return pluginsDirPath(root);
}

/** Validates the filename is a plain .js file with no path segments, so this can never be used
 * to read arbitrary files outside the plugins folder. */
function isSafePluginFilename(filename: string): boolean {
  return /^[^/\\]+\.js$/.test(filename);
}

export function readPluginSource(root: string, filename: string): string | null {
  if (!isSafePluginFilename(filename)) return null;
  try {
    return fs.readFileSync(path.join(pluginsDirPath(root), filename), "utf-8");
  } catch {
    return null;
  }
}

export function setPluginEnabled(root: string, filename: string, enabled: boolean): void {
  if (!isSafePluginFilename(filename)) return;
  const settings = readSettings(root);
  settings[filename] = enabled;
  writeSettings(root, settings);
}
