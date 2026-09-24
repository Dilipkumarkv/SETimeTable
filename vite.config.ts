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
        name: 'serve-stylesheet-link',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const parsedUrl = req.url ? new URL(req.url, 'http://localhost') : null;
            if (parsedUrl && (parsedUrl.pathname === '/styles.css' || parsedUrl.pathname === '/./styles.css')) {
              const accept = req.headers['accept'] || '';
              const secFetchDest = req.headers['sec-fetch-dest'] || '';
              // Serve real CSS when requested as a stylesheet by browser <link>
              if (secFetchDest === 'style' || accept.includes('text/css')) {
                try {
                  const cssPath = path.resolve(process.cwd(), 'styles.css');
                  const cssContent = fs.readFileSync(cssPath, 'utf-8');
                  res.setHeader('Content-Type', 'text/css; charset=utf-8');
                  res.end(cssContent);
                  return;
                } catch (e) {
                  // Fall through to next handler if file read fails
                }
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
