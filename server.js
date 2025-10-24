const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Unified proxy endpoint: Handles ALL paths (HTML, JS, CSS, images, videos, etc.)
app.get('/proxy/*', async (req, res) => {
  const targetPath = req.params[0];
  const targetUrl = `https://sportzonline.live/${targetPath}`;
  
  console.log(`📡 Proxying: ${targetUrl} (Type: ${req.headers.accept || 'unknown'})`);
  
  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': '*/*', // Broad for all assets
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Referer': 'https://sportzonline.live/',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Ch-Ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Linux"',
        'Sec-Fetch-Dest': 'document', // Adjust per asset if needed
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'DNT': '1'
      },
      responseType: 'arraybuffer', // Default binary; override for text
      maxRedirects: 10, // More room for ad/geo hops
      validateStatus: () => true,
      timeout: 30000
    });
    
    // Remove blocking headers
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Content-Type-Options');
    
    // Set permissive headers
    res.set('X-Frame-Options', 'ALLOWALL');
    res.set('Content-Security-Policy', "frame-ancestors 'self' *");
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache assets
    
    const contentType = response.headers['content-type'] || '';
    const isText = contentType.includes('text/') || contentType.includes('javascript') || contentType.includes('json');
    let content = isText ? Buffer.from(response.data).toString('utf-8') : response.data;
    
    let modified = false;
    
    if (isText) {
      // De-bust: Expanded regex for inline/external JS/HTML (catches minified/obfuscated)
      const bustPatterns = [
        /if\s*\(\s*(top|parent|window(?:\.top)?|window\.self)\s*!==?\s*(self|window(?:\.top)?)\s*\)\s*(top|parent|window\.top)\.location\s*[=:]?\s*(self|window)\.location/gi,
        /if\s*\(\s*window\.frameElement\s*\)\s*(top|parent)\.location\s*[=:]?\s*window\.location/gi,
        /if\s*\(\s*window\s*==\s*window\.top\s*\)\s*\{?\s*(?!if\s*\(false\))|else\s*\{?\s*(top|parent)\.location/gi, // Reverse logic
        /<script[^>]*>\s*if\s*\([^}]+\)\s*(?:top|parent)\.location/gi // Inline script starts
      ];
      bustPatterns.forEach(pattern => {
        if (pattern.test(content)) {
          content = content.replace(pattern, 'if(false) // De-busted: $&');
          modified = true;
          console.log(`🛡️ Neutralized bust pattern: ${pattern}`);
        }
      });
      
      // Remove meta redirects
      content = content.replace(/<meta\s+http-equiv=["']?refresh["']?[^>]*>/gi, '');
      
      // Rewrite ALL relative URLs to proxy (no absolutes! Fixes CORS/redirects)
      // Handles src/href in HTML, import/export in JS, @import in CSS
      const urlPatterns = [
        /(src|href|poster|data)["']?=[\"']?\/([^\"'\s>]+)[\"']?/gi,
        /url\s*\(\s*['"]?\/([^'"\)]+)['"]?\s*\)/gi, // CSS url()
        /import\s+['"]?\/([^'"\s;]+)['"]?/gi, // JS import
        /from\s+['"]?\/([^'"\s;]+)['"]?/gi // JS from
      ];
      urlPatterns.forEach(pattern => {
        content = content.replace(pattern, `$1="/proxy/$2"$3`);
        modified = true;
      });
      
      console.log(modified ? `✏️ Rewrote content for ${targetPath}` : `ℹ️ No mods needed for ${targetPath}`);
      
      res.set('Content-Type', contentType || 'text/plain');
      res.status(response.status).send(content);
    } else {
      // Binary (images, videos, etc.): Forward raw
      if (contentType) res.set('Content-Type', contentType);
      res.status(response.status).send(content);
      console.log(`📦 Binary forwarded: ${targetPath} (${content.length} bytes)`);
    }
    
    console.log(`✅ Proxied: ${response.status} ${targetUrl}`);
    
  } catch (error) {
    console.error(`❌ Proxy failed for ${targetUrl}:`, error.message, error.response?.status);
    
    // Enhanced error page with diagnostics
    res.status(500).send(`
      <html>
        <head>
          <title>Proxy Error</title>
          <style>
            body { background: #1a1a2e; color: #fff; font-family: 'Inter', sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; text-align: center; }
            .error { background: rgba(255,0,0,0.1); border: 1px solid rgba(255,0,0,0.3); padding: 30px; border-radius: 12px; max-width: 600px; }
            h1 { color: #ff6b6b; margin-top: 0; }
            code { background: rgba(0,0,0,0.3); padding: 2px 8px; border-radius: 4px; color: #ffa500; }
            .logs { margin-top: 20px; font-size: 12px; color: #aaa; text-align: left; max-height: 200px; overflow-y: auto; }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>🚫 Proxy Blocked</h1>
            <p>Site protections detected. Error: <code>${error.message}</code></p>
            <p>Status: <code>${error.response?.status || 'N/A'}</code></p>
            <p style="margin-top: 20px; font-size: 14px; color: #aaa;">
              Direct link: <a href="${targetUrl}" target="_blank" style="color: #ffa500;">${targetUrl}</a><br>
              Check server logs for details.
            </p>
            <div class="logs">
              <strong>Recent Logs:</strong><br>
              ${console.log('Recent proxy attempts...')} <!-- Placeholder; in prod, log to file -->
            </div>
          </div>
        </body>
      </html>
    `);
  }
});

// Legacy /proxy-video (unchanged)
app.get('/proxy-video', (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).send('Missing URL');
  res.redirect(videoUrl);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎬 Bust-proof proxy on port ${PORT}`);
  console.log(`🌐 Test: http://localhost:${PORT}/proxy/channels/hd/hd2.php`);
  console.log(`🧪 Iframe embed: <iframe src="/proxy/channels/hd/hd2.php"></iframe>`);
});