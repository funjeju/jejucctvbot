const functions = require('firebase-functions');
const cors = require('cors')({origin: true});
const fetch = require('node-fetch');

// HLS 프록시 함수
exports.proxyHls = functions.https.onRequest((req, res) => {
  return cors(req, res, async () => {
    try {
      const targetUrl = req.query.url;

      if (!targetUrl) {
        return res.status(400).json({error: 'URL parameter is required'});
      }

      // HLS 스트림 요청
      const response = await fetch(targetUrl);

      if (!response.ok) {
        return res.status(response.status).json({error: 'Failed to fetch HLS stream'});
      }

      const contentType = response.headers.get('content-type') || 'application/vnd.apple.mpegurl';

      // 응답 헤더 설정
      res.set({
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      });

      // 스트림 데이터 반환
      let data = await response.text();

      // 상대 경로 URL을 프록시 URL로 변환
      if (contentType.includes('mpegurl') || contentType.includes('m3u8')) {
        data = data.replace(
          /^(http:\/\/[^\s]+)$/gm,
          (match, url) => `https://jejudb.web.app/api/proxy/hls?url=${encodeURIComponent(url)}`
        );
      }

      res.send(data);

    } catch (error) {
      console.error('HLS Proxy Error:', error);
      res.status(500).json({error: 'Internal server error'});
    }
  });
});