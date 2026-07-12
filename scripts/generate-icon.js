const path = require("path");
const fs = require("fs");
const sharp = require("sharp");

const svgPath = path.join(__dirname, "..", "src", "app", "icon.svg");
const outPath = path.join(__dirname, "..", "build", "icon.png");

async function main() {
  const svg = fs.readFileSync(svgPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  await sharp(svg, { density: 384 }).resize(1024, 1024).png().toFile(outPath);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
