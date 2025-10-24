const express = require('express');
const axios = require('axios');
const path = require('path');
const app = express();

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Enhanced proxy endpoint with full request handling
app.get('/proxy-stream/*', async (req, res) => {
  const targetPath = req.params[0];
  const targetUrl = `https://sportzonline.live/${targetPath}`;
  
  console.log(`📡 Proxying request to: ${targetUrl}`);
  
  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'max-age=0',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Ch-Ua': '"Chromium";v="130", "Google Chrome";v="130", "Not?A_Brand";v="99"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Linux"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'DNT': '1'
      },
      responseType: 'text',
      maxRedirects: 5,
      validateStatus: () => true, // Accept all status codes
      timeout: 30000
    });
    
    // Remove frame-blocking headers
    res.removeHeader('X-Frame-Options');
    res.removeHeader('Content-Security-Policy');
    res.removeHeader('X-Content-Type-Options');
    
    // Set permissive headers
    res.set('X-Frame-Options', 'ALLOWALL');
    res.set('Content-Security-Policy', "frame-ancestors 'self' *");
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Content-Type', response.headers['content-type'] || 'text/html');
    
    // Modify HTML to bypass additional restrictions
    let content = response.data;
    if (typeof content === 'string' && content.includes('<html')) {
      // Remove any frame-busting scripts
      content = content.replace(/if\s*\(\s*top\s*!==?\s*self\s*\)/gi, 'if(false)');
      content = content.replace(/if\s*\(\s*window\s*!==?\s*window\.top\s*\)/gi, 'if(false)');
      content = content.replace(/top\.location\s*=\s*self\.location/gi, '//removed');
      content = content.replace(/parent\.location\s*=\s*self\.location/gi, '//removed');
      
      // Fix relative URLs - proxy JS/CSS through our server for CORS handling
      content = content.replace(/(src|href)="\/([^"]+\.(js|css))"/gi, `$1="/proxy-asset/$2"`);
      content = content.replace(/(src|href)='\/([^']+\.(js|css))'/gi, `$1='/proxy-asset/$2'`);
      
      // Fix other relative URLs (images, etc)
      content = content.replace(/(src|href)="\/([^"]+)"/gi, `$1="https://sportzonline.live/$2"`);
      content = content.replace(/(src|href)='\/([^']+)'/gi, `$1='https://sportzonline.live/$2'`);
      
      // Add base tag to help with relative URLs
      content = content.replace(/<head>/i, '<head><base href="https://sportzonline.live/">');
    }
    
    res.status(response.status).send(content);
    console.log(`✅ Proxy successful: ${response.status}`);
    
  } catch (error) {
    console.error(`❌ Proxy error:`, error.message);
    res.status(500).send(`
      <html>
        <head>
          <style>
            body { 
              background: #1a1a2e; 
              color: #fff; 
              font-family: 'Inter', sans-serif; 
              display: flex; 
              justify-content: center; 
              align-items: center; 
              height: 100vh; 
              margin: 0;
              text-align: center;
            }
            .error { 
              background: rgba(255,0,0,0.1); 
              border: 1px solid rgba(255,0,0,0.3); 
              padding: 30px; 
              border-radius: 12px;
              max-width: 600px;
            }
            h1 { color: #ff6b6b; margin-top: 0; }
            code { 
              background: rgba(0,0,0,0.3); 
              padding: 2px 8px; 
              border-radius: 4px; 
              color: #ffa500;
            }
          </style>
        </head>
        <body>
          <div class="error">
            <h1>🚫 Stream Protected</h1>
            <p>The target stream domain has additional protection mechanisms.</p>
            <p><strong>Error:</strong> <code>${error.message}</code></p>
            <p style="margin-top: 20px; font-size: 14px; color: #aaa;">
              Try accessing the stream directly at: 
              <a href="${targetUrl}" target="_blank" style="color: #ffa500;">${targetUrl}</a>
            </p>
          </div>
        </body>
      </html>
    `);
  }
});

// Proxy for assets (JS, CSS, images, etc.) - handles binary data
app.get('/proxy-asset/*', async (req, res) => {
  const targetPath = req.params[0];
  const targetUrl = `https://sportzonline.live/${targetPath}`;
  
  console.log(`🎨 Proxying asset: ${targetUrl}`);
  
  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://sportzonline.live/',
        'Connection': 'keep-alive',
        'Sec-Fetch-Dest': 'script',
        'Sec-Fetch-Mode': 'no-cors',
        'Sec-Fetch-Site': 'same-origin'
      },
      responseType: 'arraybuffer',
      maxRedirects: 5,
      validateStatus: () => true,
      timeout: 30000
    });
    
    // Forward content type and other relevant headers
    if (response.headers['content-type']) {
      res.set('Content-Type', response.headers['content-type']);
    }
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cache-Control', 'public, max-age=3600');
    
    res.status(response.status).send(response.data);
    console.log(`✅ Asset proxied: ${response.status}`);
    
  } catch (error) {
    console.error(`❌ Asset proxy error:`, error.message);
    res.status(500).send('Asset load failed');
  }
});

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
