// Vercel Edge Function for HLS Proxy
// Handles both /api/proxy/hls?url=... and /api/proxy/seg?url=...

export const runtime = 'edge';

export async function GET(req: Request) {
  try {
    const { searchParams, pathname } = new URL(req.url);
    const pathSegments = pathname.split('/');
    const type = pathSegments[pathSegments.length - 1]; // 'hls' or 'seg'
    const target = searchParams.get('url');

    if (!target) {
      return new Response('Missing url parameter', { status: 400 });
    }

    console.log(`Proxying ${type}: ${target}`);

    // Fetch the target URL
    const response = await fetch(target);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';

    if (type === 'hls') {
      // Handle .m3u8 playlist files
      const text = await response.text();
      console.log(`Original m3u8 content (${target}):`, text.substring(0, 500) + '...');

      // 파일이 실제 m3u8 형식인지 확인
      if (!text.includes('#EXTM3U') && !text.includes('#EXT-X-VERSION')) {
        console.error('Invalid m3u8 content:', text);
        return new Response(`Invalid m3u8 content: ${text}`, { status: 400 });
      }

      const base = new URL(target);

      // Function to rewrite URLs to proxy
      const rewriteToProxy = (url: string): string => {
        try {
          const fullUrl = new URL(url, base).href;
          return `/api/proxy/seg?url=${encodeURIComponent(fullUrl)}`;
        } catch (error) {
          console.warn('Failed to rewrite URL:', url, error);
          return url;
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

      return new Response(rewrittenPlaylist, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range',
          'Cache-Control': 'no-cache',
        },
      });
    } else if (type === 'seg') {
      // Handle video segments (.ts, .m4s) and keys
      const arrayBuffer = await response.arrayBuffer();

      return new Response(arrayBuffer, {
        headers: {
          'Content-Type': contentType || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range',
          'Cache-Control': 'public, max-age=3600', // Cache segments for 1 hour
        },
      });
    } else {
      return new Response('Invalid proxy type. Use /hls or /seg', { status: 400 });
    }

  } catch (error) {
    console.error('Proxy error:', error);
    return new Response(`Proxy error: ${error.message}`, { status: 500 });
  }
}

// Handle OPTIONS requests for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range',
    },
  });
}