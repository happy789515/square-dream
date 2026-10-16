import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#0D1117"/>
  <rect x="128" y="128" width="256" height="256" fill="none" stroke="#00F5D4" stroke-width="28"/>
</svg>`;

function citySvg(variant) {
  const buildings = [];
  let x = 0;
  let i = 0;
  const height = 512;
  while (x < 2048) {
    const bw = 50 + ((i * 47 + variant * 19) % 120);
    const bh = 80 + ((i * 91 + variant * 23) % 340);
    const neon = (i + variant) % 4 === 0 ? "#FF006E" : "#00F5D4";
    const y = height - bh;
    buildings.push(
      `<rect x="${x}" y="${y}" width="${bw - 8}" height="${bh}" fill="#070B12"/>`,
      `<rect x="${x}" y="${y}" width="${bw - 8}" height="8" fill="${neon}"/>`,
    );
    x += bw;
    i += 1;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="512" viewBox="0 0 2048 512">${buildings.join("")}</svg>`;
}

await mkdir(path.join(root, "public/icons"), { recursive: true });
await mkdir(path.join(root, "public/assets/bg"), { recursive: true });

for (const size of [192, 512]) {
  await sharp(Buffer.from(iconSvg))
    .resize(size, size)
    .png()
    .toFile(path.join(root, `public/icons/icon-${size}.png`));
}

await sharp(Buffer.from(citySvg(1)))
  .webp({ quality: 82, alphaQuality: 90 })
  .toFile(path.join(root, "public/assets/bg/city-far.webp"));

await sharp(Buffer.from(citySvg(4)))
  .webp({ quality: 82, alphaQuality: 90 })
  .toFile(path.join(root, "public/assets/bg/city-mid.webp"));

await writeFile(path.join(root, "public/assets/bg/.gitkeep"), "");
