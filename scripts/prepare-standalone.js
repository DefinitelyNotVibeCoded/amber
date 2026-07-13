const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const standalone = path.join(root, ".next", "standalone");

function copyDir(from, to) {
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(to, { recursive: true });
  fs.cpSync(from, to, { recursive: true });
}

copyDir(path.join(root, ".next", "static"), path.join(standalone, ".next", "static"));
copyDir(path.join(root, "public"), path.join(standalone, "public"));

// Never ship the developer machine's own vault-path config or scratch files.
const staleConfig = path.join(standalone, ".amber-config.json");
if (fs.existsSync(staleConfig)) fs.rmSync(staleConfig);

console.log("Standalone build prepared:", standalone);
