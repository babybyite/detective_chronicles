import { createRequire } from "module";
import { fileURLToPath } from "url";

const require = createRequire(import.meta.url);
const fs = require("fs");
const path = require("path");
function requireJimpCompact() {
  try {
    return require("jimp-compact");
  } catch {
    try {
      const expoImageUtilsRoot = path.dirname(require.resolve("@expo/image-utils/package.json"));
      return require(path.join(expoImageUtilsRoot, "node_modules", "jimp-compact"));
    } catch {
      return require("../node_modules/.pnpm/jimp-compact@0.16.1/node_modules/jimp-compact");
    }
  }
}

const Jimp = requireJimpCompact();

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const jobs = [
  {
    label: "background",
    root: path.join(appRoot, "assets", "backgrounds", "optimized"),
    extensions: new Set([".jpg", ".jpeg"]),
    maxWidth: 900,
    quality: 68
  },
  {
    label: "icon",
    root: path.join(appRoot, "assets", "ravenwood", "icons", "optimized"),
    extensions: new Set([".png"]),
    maxSide: 192,
    quality: 80,
    perFileMaxSide(file) {
      const base = path.basename(file).toLowerCase();
      if (base.startsWith("compass_glow")) return 256;
      if (base.startsWith("fog_")) return 320;
      return 192;
    }
  },
  {
    label: "medal",
    root: path.join(appRoot, "assets", "ravenwood", "medals", "optimized"),
    extensions: new Set([".png"]),
    maxSide: 192,
    quality: 82
  },
  {
    label: "portrait",
    root: path.join(appRoot, "assets", "ravenwood", "portraits_optimized"),
    extensions: new Set([".jpg", ".jpeg"]),
    maxHeight: 320,
    quality: 74
  }
];

function walkImages(root, extensions, output = []) {
  if (!fs.existsSync(root)) return output;
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      walkImages(fullPath, extensions, output);
    } else if (extensions.has(path.extname(entry.name).toLowerCase())) {
      output.push(fullPath);
    }
  }
  return output;
}

function targetSize(image, job, file) {
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const maxSide = job.perFileMaxSide ? job.perFileMaxSide(file) : job.maxSide;
  if (job.maxWidth && width > job.maxWidth) {
    return { width: job.maxWidth, height: Jimp.AUTO };
  }
  if (job.maxHeight && height > job.maxHeight) {
    return { width: Jimp.AUTO, height: job.maxHeight };
  }
  if (maxSide && Math.max(width, height) > maxSide) {
    return width >= height ? { width: maxSide, height: Jimp.AUTO } : { width: Jimp.AUTO, height: maxSide };
  }
  return null;
}

async function optimizeFile(file, job) {
  const before = fs.statSync(file).size;
  const image = await Jimp.read(file);
  const originalWidth = image.bitmap.width;
  const originalHeight = image.bitmap.height;
  const size = targetSize(image, job, file);
  if (size) image.resize(size.width, size.height);
  if (typeof image.quality === "function" && job.quality) image.quality(job.quality);
  if (typeof image.deflateLevel === "function") image.deflateLevel(9);
  if (typeof image.filterType === "function") image.filterType(4);

  const temp = `${file}.tmp-${process.pid}${path.extname(file)}`;
  await image.writeAsync(temp);
  const after = fs.statSync(temp).size;
  const shouldReplace = size || after < before;
  if (!shouldReplace) {
    fs.unlinkSync(temp);
    return { file, label: job.label, before, after: before, changed: false, originalWidth, originalHeight, width: originalWidth, height: originalHeight };
  }
  fs.renameSync(temp, file);
  return {
    file,
    label: job.label,
    before,
    after,
    changed: true,
    originalWidth,
    originalHeight,
    width: image.bitmap.width,
    height: image.bitmap.height
  };
}

async function main() {
  const results = [];
  for (const job of jobs) {
    for (const file of walkImages(job.root, job.extensions)) {
      results.push(await optimizeFile(file, job));
    }
  }
  const changed = results.filter((item) => item.changed);
  const beforeTotal = results.reduce((sum, item) => sum + item.before, 0);
  const afterTotal = results.reduce((sum, item) => sum + item.after, 0);
  const byLabel = new Map();
  for (const item of results) {
    const current = byLabel.get(item.label) ?? { count: 0, changed: 0, before: 0, after: 0 };
    current.count += 1;
    current.changed += item.changed ? 1 : 0;
    current.before += item.before;
    current.after += item.after;
    byLabel.set(item.label, current);
  }
  console.log(`Optimized ${changed.length}/${results.length} images.`);
  console.log(`Total ${Math.round(beforeTotal / 1024)} KB -> ${Math.round(afterTotal / 1024)} KB.`);
  for (const [label, item] of byLabel) {
    console.log(`${label}: ${item.changed}/${item.count}, ${Math.round(item.before / 1024)} KB -> ${Math.round(item.after / 1024)} KB`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
