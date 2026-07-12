import fs from "fs";
import path from "path";

const CONFIG_PATH = path.join(process.cwd(), ".amber-config.json");
const DEFAULT_VAULT = path.join(process.cwd(), "vault");

interface AmberConfig {
  vaultPath: string;
}

export function getVaultPath(): string {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
    const config = JSON.parse(raw) as AmberConfig;
    if (config.vaultPath && fs.existsSync(config.vaultPath)) {
      return config.vaultPath;
    }
  } catch {
    // no config yet, fall through to default
  }
  return DEFAULT_VAULT;
}

export function setVaultPath(vaultPath: string): void {
  const config: AmberConfig = { vaultPath };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}
