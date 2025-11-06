// Next.js API Route for HLS Proxy (fallback)
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { type, url } = req.query;

    if (!url || typeof url !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid url parameter' });
    }

    console.log(`[API] Proxying ${type}: ${url}`);

    // Fetch the target URL
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    if (type === 'hls') {
      // Handle .m3u8 playlist files
      const text = await response.text();
      console.log(`[API] Original m3u8 content (${url}):`, text.substring(0, 200) + '...');

      // 파일이 실제 m3u8 형식인지 확인
      if (!text.includes('#EXTM3U') && !text.includes('#EXT-X-VERSION')) {
        console.error('[API] Invalid m3u8 content:', text);
        return res.status(400).json({ error: 'Invalid m3u8 content', content: text });
      }

      const base = new URL(url);

      // Function to rewrite URLs to proxy
      const rewriteToProxy = (originalUrl: string): string => {
        try {
          const fullUrl = new URL(originalUrl, base).href;
          return `/api/proxy/seg?url=${encodeURIComponent(fullUrl)}`;
        } catch (error) {
          console.warn('[API] Failed to rewrite URL:', originalUrl, error);
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

      console.log(`[API] Rewritten playlist:`, rewrittenPlaylist.substring(0, 300) + '...');

      res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Range');
      res.setHeader('Cache-Control', 'no-cache');

      return res.status(200).send(rewrittenPlaylist);

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

      return res.status(200).send(buffer);

    } else {
      return res.status(400).json({ error: 'Invalid proxy type. Use /hls or /seg' });
    }

  } catch (error: any) {
    console.error('[API] Proxy error:', error);
    return res.status(500).json({ error: 'Proxy error', message: error.message });
  }
}