/* Copy site/ → dist/ so Vercel serves index.html at /. */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const src = path.join(root, "site");
const dest = path.join(root, "dist");

if (!fs.existsSync(src)) {
  console.error("Missing folder:", src);
  process.exit(1);
}
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync(src, dest, { recursive: true });

/* JSON + תמונות מחוץ ל־site/ — הנתיב בדפדפן הוא ../shibumi_properties מתוך site */
const propsSrc = path.join(root, "shibumi_properties");
const propsDest = path.join(dest, "shibumi_properties");
if (fs.existsSync(propsSrc)) {
  fs.cpSync(propsSrc, propsDest, { recursive: true });
  console.log("Copied shibumi_properties/ into dist/");
} else {
  console.warn("No shibumi_properties/ at repo root — נתוני נכסים מרוחקים עלולים לא לעבוד");
}

console.log("Built dist from site/");
