const sharp = require("sharp");
const path = require("path");

const assetsDir = path.join(__dirname, "..", "assets");
const sourceIcon = path.join(
  __dirname,
  "..",
  ".context",
  "attachments",
  "river-plate (2).png"
);

// The wave SVG for generating from scratch (white waves on transparent)
// This matches the 3-wave pattern from the source icon
const WAVE_SVG = `<svg width="432" height="432" viewBox="0 0 432 432" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(76, 136)">
    <path d="M0 40 Q35 10 70 40 Q105 70 140 40 Q175 10 210 40 Q245 70 280 40"
          fill="none" stroke="white" stroke-width="22" stroke-linecap="round"/>
    <path d="M0 100 Q35 70 70 100 Q105 130 140 100 Q175 70 210 100 Q245 130 280 100"
          fill="none" stroke="white" stroke-width="22" stroke-linecap="round"/>
    <path d="M0 160 Q35 130 70 160 Q105 190 140 160 Q175 130 210 160 Q245 190 280 160"
          fill="none" stroke="white" stroke-width="22" stroke-linecap="round"/>
  </g>
</svg>`;

// Same waves but in black for monochrome
const WAVE_SVG_MONO = WAVE_SVG;

// Full icon SVG with background
function fullIconSvg(size) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="#0c1220"/>
    <g transform="scale(${size / 432})">
      <g transform="translate(76, 136)">
        <path d="M0 40 Q35 10 70 40 Q105 70 140 40 Q175 10 210 40 Q245 70 280 40"
              fill="none" stroke="white" stroke-width="22" stroke-linecap="round"/>
        <path d="M0 100 Q35 70 70 100 Q105 130 140 100 Q175 70 210 100 Q245 130 280 100"
              fill="none" stroke="white" stroke-width="22" stroke-linecap="round"/>
        <path d="M0 160 Q35 130 70 160 Q105 190 140 160 Q175 130 210 160 Q245 190 280 160"
              fill="none" stroke="white" stroke-width="22" stroke-linecap="round"/>
      </g>
    </g>
  </svg>`;
}

async function generate() {
  console.log("Generating icons...");

  // 1. icon.png (1024x1024) — main app icon with background + rounded corners
  await sharp(Buffer.from(fullIconSvg(1024)))
    .png()
    .toFile(path.join(assetsDir, "icon.png"));
  console.log("  icon.png (1024x1024)");

  // 2. favicon.png (48x48)
  await sharp(Buffer.from(fullIconSvg(48)))
    .png()
    .toFile(path.join(assetsDir, "favicon.png"));
  console.log("  favicon.png (48x48)");

  // 3. splash-icon.png (200x200)
  await sharp(Buffer.from(fullIconSvg(200)))
    .png()
    .toFile(path.join(assetsDir, "splash-icon.png"));
  console.log("  splash-icon.png (200x200)");

  // 4. android-icon-background.png (432x432) — solid color
  await sharp({
    create: {
      width: 432,
      height: 432,
      channels: 4,
      background: { r: 12, g: 18, b: 32, alpha: 1 },
    },
  })
    .png()
    .toFile(path.join(assetsDir, "android-icon-background.png"));
  console.log("  android-icon-background.png (432x432)");

  // 5. android-icon-foreground.png (432x432) — waves on transparent
  await sharp(Buffer.from(WAVE_SVG))
    .png()
    .toFile(path.join(assetsDir, "android-icon-foreground.png"));
  console.log("  android-icon-foreground.png (432x432)");

  // 6. android-icon-monochrome.png (432x432) — waves on transparent
  await sharp(Buffer.from(WAVE_SVG_MONO))
    .png()
    .toFile(path.join(assetsDir, "android-icon-monochrome.png"));
  console.log("  android-icon-monochrome.png (432x432)");

  console.log("Done!");
}

generate().catch(console.error);
