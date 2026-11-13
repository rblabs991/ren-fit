// Renders the app icons from one SVG. Run: node tools/make-icons.mjs (needs the "sharp" package).
import sharp from 'sharp';
const fig = (s, pad) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 512 512">
<rect width="512" height="512" rx="${pad ? 0 : 112}" fill="#0d1418"/>
<g transform="translate(256 262) scale(${pad ? 0.72 : 0.9}) translate(-256 -256)">
<circle cx="256" cy="256" r="196" fill="#1b2a31"/>
<g fill="none" stroke="#e7eef0" stroke-width="30" stroke-linecap="round" stroke-linejoin="round">
<path d="M256 186v118M256 304l-54 96M256 304l54 96M256 212l-78 46M256 212l78-60"/></g>
<circle cx="256" cy="130" r="40" fill="#ff8a4c"/></g></svg>`;
for (const [name, size, pad] of [['icon-192', 192, false], ['icon-512', 512, false], ['icon-maskable-512', 512, true]])
  await sharp(Buffer.from(fig(size, pad))).png().toFile(`icons/${name}.png`);
console.log('icons written');
