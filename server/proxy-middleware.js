// Simple middleware to handle HLS proxy requests for Vite dev server
export function proxyMiddleware() {
  return {
    name: 'proxy-middleware',
    configureServer(server) {
      server.middlewares.use('/api/proxy', async (req, res, next) => {
        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const pathSegments = url.pathname.split('/');
          const type = pathSegments[pathSegments.length - 1]; // 'hls' or 'seg'
          const target = url.searchParams.get('url');

          if (!target) {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing url parameter' }));
            return;
          }

          console.log(`[DEV] Proxying ${type}: ${target}`);

          // Fetch the target URL
          const response = await fetch(target);

          if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
          }

          if (type === 'hls') {
            // Handle .m3u8 playlist files
            const text = await response.text();
            console.log(`[DEV] Original m3u8 content (${target}):`, text.substring(0, 200) + '...');

            // 파일이 실제 m3u8 형식인지 확인
            if (!text.includes('#EXTM3U') && !text.includes('#EXT-X-VERSION')) {
              console.error('[DEV] Invalid m3u8 content:', text);
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid m3u8 content', content: text }));
              return;
            }

            const base = new URL(target);

            // Function to rewrite URLs to proxy
            const rewriteToProxy = (originalUrl) => {
              try {
                const fullUrl = new URL(originalUrl, base).href;
                return `/api/proxy/seg?url=${encodeURIComponent(fullUrl)}`;
              } catch (error) {
                console.warn('[DEV] Failed to rewrite URL:', originalUrl, error);
                return originalUrl;
              }
            };

            // Rewrite segment URLs and KEY URIs in the playlist
            const rewrittenPlaylist = text
              // Rewrite segment lines (non-comment lines)
              .replace(/^([^#\s].*)$/gm, (line) => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('#')) {
                  return rewriteToProxy(trimmed);
                }
                return line;
              })
              // Rewrite KEY URIs in #EXT-X-KEY lines
              .replace(/(URI=)"([^"]+)"/g, (match, prefix, uri) => {
                return `${prefix}"${rewriteToProxy(uri)}"`;
              });

            console.log(`[DEV] Rewritten playlist:`, rewrittenPlaylist.substring(0, 300) + '...');

            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Range');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(rewrittenPlaylist);

          } else if (type === 'seg') {
            // Handle video segments (.ts, .m4s) and keys
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            const contentType = response.headers.get('content-type') || 'application/octet-stream';

            res.setHeader('Content-Type', contentType);
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Range');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            res.end(buffer);

          } else {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Invalid proxy type. Use /hls or /seg' }));
          }

        } catch (error) {
          console.error('[DEV] Proxy error:', error);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Proxy error', message: error.message }));
        }
      });

      // Handle OPTIONS requests for CORS
      server.middlewares.use('/api/proxy', (req, res, next) => {
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Range');
          res.statusCode = 200;
          res.end();
          return;
        }
        next();
      });
    },
  };
}