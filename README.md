# The Framed Stream 🎬

A cinematic live sports streaming platform that transforms raw feeds into immersive, atmospheric viewing experiences. Features elegant glassmorphic UI, ambient lighting effects, and seamless proxy integration for services like Sportzonline.

## Features

- **Cinematic Interface**: Stadium-inspired gradients with midnight blues and subtle golds
- **Ambient Glow Effects**: Breathing animations that pulse with the stream's rhythm
- **Smart Overlays**: Translucent metadata that fades on hover—never intrusive
- **Proxy Integration**: Bypasses X-Frame-Options restrictions for seamless embedding
- **Fullscreen Support**: Immersive viewing with keyboard shortcuts (press 'F')
- **Live Timestamps**: Real-time clock overlay for match tracking

## Architecture

### Frontend (`public/index.html`)
- Glassmorphic player frame with backdrop blur
- Dual radial gradients simulating arena floodlights
- Hover-triggered controls and metadata overlays
- Cinematic fade-in on load

### Backend (`server.js`)
- Express proxy server with header manipulation
- Routes:
  - `/proxy-stream/*` - Main stream proxy (removes X-Frame-Options)
  - `/proxy-video?url=` - Direct HLS/M3U8 fallback
  - `/` - Serves static frontend

## Setup

### Install Dependencies
```bash
npm install
```

### Run Development Server
```bash
npm start
```

The server will start on `http://localhost:3000`

### For Development with Auto-Reload
```bash
npm run dev
```

## Configuration

### Change Target Stream
Edit `server.js` to modify the proxy target:
```javascript
target: 'https://sportzonline.live',  // Change to your stream source
```

### Adjust Stream URL
Edit `public/index.html` iframe source:
```html
<iframe src="/proxy-stream/channels/hd/hd2.php" ...>
```

### Customize Theme
Colors and effects in `public/index.html`:
- **Background**: `linear-gradient(135deg, #0a0a0f 0%, #1e1e2f 50%, #2a0a0f 100%)`
- **Accent**: `rgba(255, 165, 0, ...)` (golden orange)
- **Secondary**: `rgba(100, 200, 255, ...)` (cool blue)

## Production Deployment

### Environment Variables
```bash
PORT=3000  # Server port (default: 3000)
```

### Recommended Platforms
- **Vercel/Cloudflare**: Edge caching reduces latency to <100ms
- **Railway/Render**: Simple deployment with persistent endpoints
- **VPS**: Full control with optional VPN proxy layer for geo-restrictions

### Security Hardening
1. Tighten CSP in production:
   ```javascript
   res.set('Content-Security-Policy', "frame-ancestors 'self' yourdomain.com");
   ```

2. Whitelist stream origins:
   ```javascript
   const allowedOrigins = ['sportzonline.live', 'trusted-stream.com'];
   if (!allowedOrigins.includes(targetHost)) return res.status(403).send('Forbidden');
   ```

3. Add rate limiting:
   ```bash
   npm install express-rate-limit
   ```

## Usage

### Keyboard Shortcuts
- `F` - Toggle fullscreen
- `Space` - Play/pause (if stream supports postMessage)

### Direct HLS Streaming
If you extract the M3U8 URL from network inspection:
```javascript
// Use the direct video proxy
<iframe src="/proxy-video?url=https://stream.example.com/playlist.m3u8">
```

## Troubleshooting

### Stream Not Loading
1. Check browser console for CORS errors
2. Verify proxy target URL is correct
3. Test direct stream URL in browser first

### Geo-Restrictions
Add a VPN/proxy layer before the Express server or use a service like:
- Cloudflare Workers (with residential IPs)
- Bright Data proxies
- Custom VPN endpoints

### High Latency
- Deploy to edge locations closer to stream source
- Enable Cloudflare CDN caching
- Use direct M3U8 URLs when possible

## License

MIT - See LICENSE file for details

---

**Pro Tip**: For night games, adjust the gradient to cooler tones (`#0a0a0f → #0a0a1f`) for that late-match atmosphere.
