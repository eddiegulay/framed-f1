const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const app = express();

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Proxy endpoint for Sportzonline streams
app.use('/proxy-stream', createProxyMiddleware({
  target: 'https://sportzonline.live',
  changeOrigin: true,
  pathRewrite: { '^/proxy-stream': '' }, // Strips /proxy-stream prefix
  onProxyReq: (proxyReq, req, res) => {
    // Remove blocking headers if present
    if (proxyReq.headers) {
      delete proxyReq.headers['x-frame-options'];
      delete proxyReq.headers['content-security-policy'];
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // Ensure your domain allows framing
    if (proxyRes.headers) {
      delete proxyRes.headers['x-frame-options'];
      delete proxyRes.headers['content-security-policy'];
    }
    res.set('X-Frame-Options', 'ALLOWALL');
    res.set('Content-Security-Policy', "frame-ancestors 'self' *"); // Broad for dev; tighten for prod
  }
}));

// Fallback route for direct video if extracted (e.g., HLS)
app.get('/proxy-video', (req, res) => {
  const videoUrl = req.query.url; // Future-proof for direct M3U8
  if (!videoUrl) return res.status(400).send('Missing URL');
  // Pipe logic here if needed
  res.redirect(videoUrl); // Or full stream proxy
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎬 Enhanced proxy server running on port ${PORT}`);
  console.log(`🌐 Open http://localhost:${PORT} to view the stream`);
});
