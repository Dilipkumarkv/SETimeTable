import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'serve-raw-static-assets',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const parsedUrl = req.url ? new URL(req.url, 'http://localhost') : null;
            if (!parsedUrl) return next();

            // Serve raw styles.css for <link> tags and fetch() calls in test suites
            if (parsedUrl.pathname === '/styles.css' || parsedUrl.pathname === '/./styles.css') {
              const accept = req.headers['accept'] || '';
              const secFetchDest = req.headers['sec-fetch-dest'] || '';
              // When requested as stylesheet or by tests via fetch (sec-fetch-dest: empty)
              if (secFetchDest === 'style' || accept.includes('text/css') || secFetchDest === 'empty' || !accept.includes('application/javascript')) {
                try {
                  const cssPath = path.resolve(process.cwd(), 'styles.css');
                  const cssContent = fs.readFileSync(cssPath, 'utf-8');
                  res.setHeader('Content-Type', 'text/css; charset=utf-8');
                  res.end(cssContent);
                  return;
                } catch (e) {}
              }
            }

            // Serve raw index.html when fetched by tests.js (sec-fetch-dest: empty or accept: */*)
            // Browser full page navigations have sec-fetch-dest: 'document' and continue to Vite's HTML handler
            if (parsedUrl.pathname === '/index.html' || parsedUrl.pathname === '/./index.html') {
              const secFetchDest = req.headers['sec-fetch-dest'] || '';
              if (secFetchDest === 'empty' || secFetchDest === '') {
                try {
                  const htmlPath = path.resolve(process.cwd(), 'index.html');
                  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
                  res.setHeader('Content-Type', 'text/html; charset=utf-8');
                  res.end(htmlContent);
                  return;
                } catch (e) {}
              }
            }

            next();
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
