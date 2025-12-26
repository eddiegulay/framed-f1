const express = require('express');
const axios = require('axios');
const cors = require('cors');
const parser = require('iptv-playlist-parser');
const { URL } = require('url');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

// Default playlist URL (Animation category as requested)
const DEFAULT_PLAYLIST_URL = 'https://iptv-org.github.io/iptv/categories/animation.m3u';

// 1. Playlist Endpoint
app.get('/api/playlist', async (req, res) => {
  const playlistUrl = req.query.url || DEFAULT_PLAYLIST_URL;
  console.log(`📥 Fetching playlist: ${playlistUrl}`);

  try {
    const response = await axios.get(playlistUrl);
    const playlist = parser.parse(response.data);

    // Transform to a simpler format for frontend if needed, 
    // but the raw parser output is usually fine.
    // We'll filter out empty items.
    const channels = playlist.items.map(item => ({
      name: item.name,
      group: item.group.title || 'Manually Added',
      logo: item.tvg.logo,
      url: item.url,
      raw: item
    }));

    res.json({
      count: channels.length,
      channels: channels
    });
  } catch (error) {
    console.error('❌ Error fetching playlist:', error.message);
    res.status(500).json({ error: 'Failed to fetch playlist' });
  }
});

// 2. Stream Proxy Endpoint
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).send('Missing url parameter');
  }

  // console.log(`🔄 Proxying: ${targetUrl}`);

  try {
    // Prepare headers to look like a normal browser/player request
    // Sometimes we need to fake the Referer/Origin based on the target URL
    const targetUrlObj = new URL(targetUrl);
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Connection': 'keep-alive',
      'Referer': `${targetUrlObj.protocol}//${targetUrlObj.host}/`,
      'Origin': `${targetUrlObj.protocol}//${targetUrlObj.host}`
    };

    const response = await axios({
      method: 'get',
      url: targetUrl,
      headers: headers,
      responseType: 'stream',
      validateStatus: () => true, // Don't throw on 4xx/5xx
    });

    // Copy critical headers to allow browser playback
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', response.headers['content-type']);

    // Check if it's a playlist (m3u8) that needs rewriting
    const contentType = response.headers['content-type'] || '';
    if (contentType.includes('application/vnd.apple.mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      targetUrl.endsWith('.m3u8')) {

      // We need to buffer the response to rewrite it
      let data = '';
      response.data.on('data', (chunk) => data += chunk);
      response.data.on('end', () => {
        const rewritten = rewriteM3u8(data, targetUrl);
        res.send(rewritten);
      });
      response.data.on('error', (err) => {
        console.error('Stream error:', err);
        res.end();
      });

    } else {
      // Binary segment (ts, mp4, etc.) - pipe directly
      response.data.pipe(res);
    }

  } catch (error) {
    console.error(`❌ Proxy error for ${targetUrl}:`, error.message);
    res.status(500).send('Proxy error');
  }
});

function rewriteM3u8(content, originalUrl) {
  const lines = content.split('\n');
  const baseUrl = new URL(originalUrl);
  const proxyBase = `http://localhost:${PORT}/proxy?url=`;

  const rewrittenLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      // Handle #EXT-X-KEY URI rewriting if needed (for DRM/Encryption, simplified here)
      if (trimmed.startsWith('#EXT-X-KEY') || trimmed.startsWith('#EXT-X-MAP')) {
        return line.replace(/URI="([^"]+)"/, (match, uri) => {
          const absolute = new URL(uri, baseUrl).toString();
          return `URI="${proxyBase}${encodeURIComponent(absolute)}"`;
        });
      }
      return line;
    }

    // It's a segment URL
    try {
      const absoluteUrl = new URL(trimmed, baseUrl).toString();
      return `${proxyBase}${encodeURIComponent(absoluteUrl)}`;
    } catch (e) {
      return line;
    }
  });

  return rewrittenLines.join('\n');
}

app.listen(PORT, () => {
  console.log(`📺 IPTV Mediator running on http://localhost:${PORT}`);
  console.log(`🔗 Playlist API: http://localhost:${PORT}/api/playlist`);
  console.log(`🔄 Stream Proxy: http://localhost:${PORT}/proxy?url=...`);
});