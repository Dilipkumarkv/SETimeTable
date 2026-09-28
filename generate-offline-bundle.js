import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

async function generateOfflineBundle() {
  try {
    const result = await esbuild.build({
      entryPoints: ['./app.js'],
      bundle: true,
      write: false,
      format: 'iife',
      minify: true,
    });

    const bundledJs = result.outputFiles[0].text;
    const css = fs.readFileSync('./styles.css', 'utf8');
    let html = fs.readFileSync('./index.html', 'utf8');

    // Replace stylesheet link with inlined style tag
    html = html.replace(/<link rel="stylesheet" href="\.\/styles\.css[^"]*" \/>/, `<style>${css}</style>`);
    // Replace script module tag with inlined bundled script
    html = html.replace(/<script type="module" src="\.\/app\.js"><\/script>/, `<script>${bundledJs}</script>`);

    const targetPaths = [
      './public/SET_Polytechnic_Timetable_App.html',
      './SET_Polytechnic_Timetable_App.html'
    ];

    if (fs.existsSync('./dist')) {
      targetPaths.push('./dist/SET_Polytechnic_Timetable_App.html');
    }

    for (const targetPath of targetPaths) {
      fs.writeFileSync(targetPath, html, 'utf8');
      console.log(`[Offline Bundle] Generated: ${targetPath} (${Math.round(html.length / 1024)} KB)`);
    }
  } catch (err) {
    console.error('[Offline Bundle] Error generating offline app file:', err);
    process.exit(1);
  }
}

generateOfflineBundle();
