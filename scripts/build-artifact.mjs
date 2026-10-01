// Builds dist/artifact.html: the site with styles.css and main.js inlined, and
// the document wrapper removed, for publishing as a claude.ai Artifact preview.
// Asset paths (assets/...) stay relative and are published as supporting files.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('styles.css', 'utf8');
const js = readFileSync('main.js', 'utf8');

const title = (html.match(/<title>(.*?)<\/title>/s) || [, 'Dunn Right Creations'])[1].trim();
const fonts = (html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]+">/) || [''])[0];
const ldjson = (html.match(/<script type="application\/ld\+json">[\s\S]*?<\/script>/) || [''])[0];
const body = html.replace(/^[\s\S]*?<body[^>]*>/, '').replace(/<\/body>\s*<\/html>\s*$/, '')
  .replace(/<script src="main\.js" defer><\/script>/, '');

const out = `<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
<style>
${css}
/* artifact host: the viewer paints its own ground; keep the brand ground explicit */
:root { background: var(--paper); }
</style>
${ldjson}
${body}
<script>
${js}
</script>
`;
mkdirSync('dist', { recursive: true });
writeFileSync('dist/artifact.html', out);
console.log('dist/artifact.html', (out.length / 1024).toFixed(0) + ' KB');
