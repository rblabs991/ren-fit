// Builds one self-contained HTML page (for previews): inlines the CSS and scripts,
// loads three.js and the fonts from public CDNs. Run: node tools/build-single.mjs out.html
import fs from 'node:fs';
const read = f => fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const html = read('index.html');
const body = html.split('<!--APP-->')[1].split('<!--/APP-->')[0];
const out = `<title>Ren Fit</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Inter:wght@400..700&family=JetBrains+Mono:wght@500;700&display=swap">
<style>
${read('css/app.css')}
</style>
${body}
<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
<script>
${read('js/data.js')}
</script>
<script>
${read('js/figure.js')}
</script>
<script>
${read('js/app.js')}
</script>
`;
fs.writeFileSync(process.argv[2] || 'ren-fit-single.html', out);
console.log('written', out.length, 'bytes');
