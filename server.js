const express = require('express');
const axios = require('axios');
const path = require('path');
const { URL } = require('url');
const app = express();

// Puppeteer setup (lazy load - only when needed)
let puppeteer;
let browser;

async function getBrowser() {
  if (!browser) {
    if (!puppeteer) {
      try {
        // Try puppeteer first
        puppeteer = require('puppeteer');
      } catch (err) {
        try {
          // Fallback to puppeteer-core with system chrome
          puppeteer = require('puppeteer-core');
        } catch (err2) {
          console.error('❌ Puppeteer not installed. Run: npm install puppeteer');
          throw new Error('Puppeteer not available. Install with: npm install puppeteer');
        }
      }
    }
    
    const launchOptions = {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920x1080',
        '--user-agent=Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
      ]
    };
    
    // Try to use system chrome if puppeteer-core
    if (puppeteer.constructor.name === 'Object') {
      launchOptions.executablePath = '/usr/bin/google-chrome' || '/usr/bin/chromium-browser' || '/usr/bin/chromium';
    }
    
    browser = await puppeteer.launch(launchOptions);
  }
  return browser;
}

function wrapProxyUrl(targetUrl, referer) {
  const encodedTarget = encodeURIComponent(targetUrl);
  const refererPart = referer ? `&referer=${encodeURIComponent(referer)}` : '';
  return `/proxy-any?target=${encodedTarget}${refererPart}`;
}

function rewriteContent(content, baseUrl, options = {}) {
  let modified = false;
  let rewritten = content;
  let base;

  try {
    base = new URL(baseUrl);
  } catch (err) {
    return { body: content, modified };
  }

  const isLikelyHtml = /<html[\s>]/i.test(rewritten) || /<!DOCTYPE\s+html/i.test(rewritten);

  if (options.injectSpoof !== false && isLikelyHtml && !rewritten.includes('__proxySpoofGuard')) {
    const spoofScript = (() => {
      const safeHref = JSON.stringify(base.href);
      const safeOrigin = JSON.stringify(base.origin);
      const safeProtocol = JSON.stringify(base.protocol);
      const safeHost = JSON.stringify(base.host);
      const safeHostname = JSON.stringify(base.hostname);
      const safePathname = JSON.stringify(base.pathname);
      const safeReferer = JSON.stringify(options.referer || base.href);
      return `<script>(function(){try{if(window.__proxySpoofGuard){return;}window.__proxySpoofGuard=true;var fakeLoc={href:${safeHref},origin:${safeOrigin},protocol:${safeProtocol},host:${safeHost},hostname:${safeHostname},pathname:${safePathname},search:"",hash:""};fakeLoc.toString=function(){return fakeLoc.href;};var fakeLocation=new Proxy(fakeLoc,{get:function(target,key){if(key==='assign'||key==='replace'||key==='reload'){return function(){return;};}var value=target[key];return typeof value==='function'?value.bind(target):value;},set:function(){return true;}});var overrideLocation=function(target){if(!target)return;try{Object.defineProperty(target,'location',{get:function(){return fakeLocation;},set:function(){},configurable:true});}catch(err){}};overrideLocation(window);try{overrideLocation(window.top);}catch(err){}try{overrideLocation(window.parent);}catch(err){}try{Object.defineProperty(document,'referrer',{get:function(){return ${safeReferer};},configurable:true});}catch(err){}try{Object.defineProperty(document,'domain',{get:function(){return ${safeHostname};},set:function(){return true;},configurable:true});}catch(err){}try{Object.defineProperty(document,'origin',{get:function(){return ${safeOrigin};},configurable:true});}catch(err){}var sanitizeDetector=function(detector){if(!detector)return;['addListener','removeListener','launch','stop','setDetectDelay'].forEach(function(fn){if(typeof detector[fn]==='function'){detector[fn]=function(){return false;};}});if(typeof detector.isLaunch==='function'){detector.isLaunch=function(){return false;};}};Object.defineProperty(window,'devtoolsDetector',{configurable:true,get:function(){return window.__proxyDevtoolsStub;},set:function(value){sanitizeDetector(value);window.__proxyDevtoolsStub=value;}});if(window.devtoolsDetector){sanitizeDetector(window.devtoolsDetector);}setInterval(function(){sanitizeDetector(window.devtoolsDetector);},2000);try{Object.defineProperty(window,'top',{get:function(){return window;},set:function(){},configurable:true});}catch(err){}try{Object.defineProperty(window,'parent',{get:function(){return window;},set:function(){},configurable:true});}catch(err){}var blockTerms=['debugger','lalavita','nunush','console.clear'];var shouldBlock=function(handler){if(!handler)return false;try{if(typeof handler==='string'){return blockTerms.some(function(term){return handler.indexOf(term)!==-1;});}if(typeof handler==='function'){var text=handler.toString();return blockTerms.some(function(term){return text.indexOf(term)!==-1;});}}catch(err){}return false;};var originalConsoleClear=window.console&&window.console.clear?window.console.clear.bind(window.console):function(){};if(window.console){window.console.clear=function(){try{window.console.log('ℹ️ Console clear blocked by proxy');}catch(err){}return;};}
var originalSetInterval=window.setInterval;window.setInterval=function(handler,delay){if(shouldBlock(handler)){return 0;}return originalSetInterval(handler,delay);};var originalSetTimeout=window.setTimeout;window.setTimeout=function(handler,delay){if(shouldBlock(handler)){return 0;}return originalSetTimeout(handler,delay);};}catch(err){if(window.console&&window.console.debug){window.console.debug('proxy spoof error',err);} }})();</script>`;
    })();

    if (/<head[^>]*>/i.test(rewritten)) {
      rewritten = rewritten.replace(/<head[^>]*>/i, match => `${match}${spoofScript}`);
    } else if (/<html[^>]*>/i.test(rewritten)) {
      rewritten = rewritten.replace(/<html[^>]*>/i, match => `${match}${spoofScript}`);
    } else {
      rewritten = spoofScript + rewritten;
    }
    modified = true;
  }

  const skipUrl = value => {
    if (!value) return true;
    const trimmed = value.trim();
    if (!trimmed) return true;
    const lower = trimmed.toLowerCase();
    if (lower.startsWith('data:')) return true;
    if (lower.startsWith('javascript:')) return true;
    if (lower.startsWith('mailto:')) return true;
    if (lower.startsWith('tel:')) return true;
    if (trimmed.startsWith('#')) return true;
    if (trimmed.startsWith('/proxy/')) return true;
    if (trimmed.startsWith('/proxy-any')) return true;
    return false;
  };

  const safeResolve = rawUrl => {
    if (skipUrl(rawUrl)) return null;
    try {
      return new URL(rawUrl, base).toString();
    } catch (err) {
      return null;
    }
  };

  // Remove meta redirects and CSP early
  rewritten = rewritten.replace(/<meta\s+http-equiv=["']?refresh["']?[^>]*>/gi, () => {
    modified = true;
    return '';
  });

  rewritten = rewritten.replace(/<meta\s+http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, () => {
    modified = true;
    return '';
  });

  const attributePattern = /((?:src|href|poster|data)\s*=\s*)(["'])([^"']+)(["'])/gi;
  rewritten = rewritten.replace(attributePattern, (match, prefix, quoteStart, urlValue, quoteEnd) => {
    const resolved = safeResolve(urlValue);
    if (!resolved) return match;
    modified = true;
    return `${prefix}${quoteStart}${wrapProxyUrl(resolved, baseUrl)}${quoteEnd}`;
  });

  const srcsetPattern = /(srcset\s*=\s*["'])([^"']+)(["'])/gi;
  rewritten = rewritten.replace(srcsetPattern, (match, prefix, list, suffix) => {
    const rewrittenList = list
      .split(',')
      .map(entry => {
        const parts = entry.trim().split(/\s+/);
        const urlPart = parts.shift();
        const resolved = safeResolve(urlPart);
        if (!resolved) return entry;
        const descriptor = parts.join(' ');
        modified = true;
        return `${wrapProxyUrl(resolved, baseUrl)}${descriptor ? ` ${descriptor}` : ''}`;
      })
      .join(', ');
    return `${prefix}${rewrittenList}${suffix}`;
  });

  const cssUrlPattern = /url\(\s*['"]?([^'"\)]+)['"]?\s*\)/gi;
  rewritten = rewritten.replace(cssUrlPattern, (match, urlValue) => {
    const resolved = safeResolve(urlValue);
    if (!resolved) return match;
    modified = true;
    return `url('${wrapProxyUrl(resolved, baseUrl)}')`;
  });

  const jsImportPattern = /(import\s+[^;]*from\s+['"])([^'"\s]+)(['"])/gi;
  rewritten = rewritten.replace(jsImportPattern, (match, prefix, urlValue, suffix) => {
    const resolved = safeResolve(urlValue);
    if (!resolved) return match;
    modified = true;
    return `${prefix}${wrapProxyUrl(resolved, baseUrl)}${suffix}`;
  });

  const jsBareImportPattern = /(import\s*\(\s*['"])([^'"\s]+)(['"]\s*\))/gi;
  rewritten = rewritten.replace(jsBareImportPattern, (match, prefix, urlValue, suffix) => {
    const resolved = safeResolve(urlValue);
    if (!resolved) return match;
    modified = true;
    return `${prefix}${wrapProxyUrl(resolved, baseUrl)}${suffix}`;
  });

  const simpleFrameBustPatterns = [
    /if\s*\(\s*(?:window|self)\s*==\s*(?:window\.)?top\s*\)/gi,
    /if\s*\(\s*(?:top|parent)\s*==\s*(?:window|self)\s*\)/gi,
    /if\s*\(\s*(?:window|self)\s*!==\s*(?:window\.)?top\s*\)/gi,
    /if\s*\(\s*(?:window|self)\s*!=\s*(?:window\.)?top\s*\)/gi
  ];
  simpleFrameBustPatterns.forEach(pattern => {
    rewritten = rewritten.replace(pattern, match => {
      if (/&&\s*false/.test(match)) {
        return match;
      }
      modified = true;
      return match.replace(/\)\s*$/, ' && false)');
    });
  });

  return { body: rewritten, modified };
}

// Serve static files (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Advanced stream proxy - Injects domain spoofing scripts BEFORE page loads
app.get('/stream-proxy/*', async (req, res) => {
  const targetPath = req.params[0];
  const targetUrl = `https://sportzonline.live/${targetPath}`;
  
  console.log(`🎯 Stream-proxying: ${targetUrl}`);
  
  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://sportzonline.live/',
        'Origin': 'https://sportzonline.live'
      },
      responseType: 'arraybuffer',
      validateStatus: () => true,
      timeout: 30000
    });
    
    let content = Buffer.from(response.data).toString('utf-8');

    const rewriteResult = rewriteContent(content, targetUrl, { referer: targetUrl });
    content = rewriteResult.body;

    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('X-Frame-Options', 'ALLOWALL');
    res.set('Content-Security-Policy', "frame-ancestors 'self' *");
    res.set('Access-Control-Allow-Origin', '*');
    res.removeHeader('X-Content-Type-Options');
    
    res.send(content);
    console.log(`✅ Stream-proxied with domain spoof: ${targetUrl}`);
    
  } catch (error) {
    console.error(`❌ Stream proxy failed: ${error.message}`);
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Generic proxy for any absolute URL (preserves referer/origin expectations)
app.get('/proxy-any', async (req, res) => {
  const targetUrl = req.query.target;
  if (!targetUrl) {
    return res.status(400).send('Missing target');
  }

  let referer = req.query.referer;
  let targetLocation;

  try {
    targetLocation = new URL(targetUrl);
  } catch (err) {
    return res.status(400).send('Invalid target URL');
  }

  const originFallback = `${targetLocation.protocol}//${targetLocation.host}`;
  const refererHeader = referer || `${originFallback}/`;
  let originHeader = originFallback;

  if (referer) {
    try {
      originHeader = new URL(referer).origin;
    } catch (err) {
      originHeader = originFallback;
    }
  }

  try {
    const response = await axios.get(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
        'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': refererHeader,
  'Origin': originHeader,
        'Connection': 'keep-alive'
      },
      responseType: 'arraybuffer',
      validateStatus: () => true,
      timeout: 30000
    });

    const contentType = response.headers['content-type'] || '';
    const isText = contentType.includes('text/') || contentType.includes('javascript') || contentType.includes('json');
    let content = isText ? Buffer.from(response.data).toString('utf-8') : response.data;
    let modified = false;

    if (isText) {
  const rewriteResult = rewriteContent(content, targetUrl, { referer: refererHeader });
      content = rewriteResult.body;
      modified = rewriteResult.modified;

      if (contentType) res.set('Content-Type', contentType);
      res.set('X-Frame-Options', 'ALLOWALL');
      res.set('Content-Security-Policy', "frame-ancestors 'self' *");
      res.set('Access-Control-Allow-Origin', '*');
      res.status(response.status).send(content);
      console.log(`${modified ? '✏️' : 'ℹ️'} Proxy-any (${response.status}): ${targetUrl}`);
    } else {
      if (contentType) res.set('Content-Type', contentType);
      res.status(response.status).send(content);
      console.log(`📦 Proxy-any binary (${response.status}): ${targetUrl}`);
    }

  } catch (error) {
    console.error(`❌ Proxy-any failed for ${targetUrl}: ${error.message}`);
    res.status(500).send(`Error proxying ${targetUrl}: ${error.message}`);
  }
});

// Browser-based proxy (requires Puppeteer)
app.get('/browser-proxy/*', async (req, res) => {
  const targetPath = req.params[0];
  const targetUrl = `https://sportzonline.live/${targetPath}`;
  
  console.log(`🌐 Browser-proxying: ${targetUrl}`);
  
  try {
    const browserInstance = await getBrowser();
    const page = await browserInstance.newPage();
    
    // Set viewport and extra headers
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://sportzonline.live/'
    });
    
    // Track network requests to capture video URLs
    const resources = [];
    page.on('request', request => {
      const url = request.url();
      const type = request.resourceType();
      if (type === 'media' || url.includes('.m3u8') || url.includes('.mp4') || url.includes('.ts')) {
        console.log(`📹 Captured stream: ${url}`);
        resources.push(url);
      }
    });
    
    // Navigate and wait for network idle
    await page.goto(targetUrl, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });
    
    // Wait a bit for any delayed JS execution
    await page.waitForTimeout(3000);
    
    // Try to find iframe with video player
    const iframes = await page.$$('iframe');
    console.log(`🔍 Found ${iframes.length} iframes`);
    
    let videoUrl = null;
    
    // Check captured network requests first
    if (resources.length > 0) {
      videoUrl = resources[0];
      console.log(`✅ Found video URL from network: ${videoUrl}`);
    } else {
      // Fallback: Try to extract from iframe src or video tags
      for (const iframe of iframes) {
        const src = await iframe.evaluate(el => el.src);
        if (src && (src.includes('embed') || src.includes('player'))) {
          console.log(`🎯 Found player iframe: ${src}`);
          // Navigate to iframe
          const iframePage = await browserInstance.newPage();
          await iframePage.goto(src, { waitUntil: 'networkidle2', timeout: 30000 });
          await iframePage.waitForTimeout(2000);
          
          // Try to find video element
          const videoSrc = await iframePage.evaluate(() => {
            const video = document.querySelector('video');
            return video ? video.src : null;
          });
          
          if (videoSrc) {
            videoUrl = videoSrc;
            console.log(`✅ Found video src: ${videoUrl}`);
          }
          
          await iframePage.close();
          break;
        }
      }
    }
    
    await page.close();
    
    if (videoUrl) {
      // Return HTML that embeds the direct video URL
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Stream Player</title>
          <style>
            body { margin: 0; padding: 0; background: #000; overflow: hidden; }
            video { width: 100%; height: 100vh; object-fit: contain; }
          </style>
        </head>
        <body>
          <video controls autoplay>
            <source src="${videoUrl}" type="application/x-mpegURL">
            <source src="${videoUrl}" type="video/mp4">
            Your browser doesn't support video playback.
          </video>
          <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
          <script>
            const video = document.querySelector('video');
            const videoSrc = '${videoUrl}';
            
            if (videoSrc.includes('.m3u8')) {
              if (Hls.isSupported()) {
                const hls = new Hls();
                hls.loadSource(videoSrc);
                hls.attachMedia(video);
              } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = videoSrc;
              }
            } else {
              video.src = videoSrc;
            }
          </script>
        </body>
        </html>
      `);
    } else {
      // Fallback: Return the full rendered HTML
  const rewriteResult = rewriteContent(await page.content(), targetUrl, { referer: targetUrl });
      res.set('Content-Type', 'text/html; charset=utf-8');
      res.send(rewriteResult.body);
    }
    
  } catch (error) {
    console.error(`❌ Browser proxy failed: ${error.message}`);
    res.status(500).send(`
      <html>
        <body style="background: #1a1a2e; color: #fff; font-family: sans-serif; padding: 40px; text-align: center;">
          <h1>🚫 Browser Proxy Error</h1>
          <p>Error: ${error.message}</p>
          <p>Make sure Puppeteer is installed: <code>npm install puppeteer</code></p>
        </body>
      </html>
    `);
  }
});

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

  const rewriteResult = rewriteContent(content, targetUrl, { referer: targetUrl });
      content = rewriteResult.body;
      modified = modified || rewriteResult.modified;

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
  console.log(`🌐 Basic proxy: http://localhost:${PORT}/proxy/channels/hd/hd2.php`);
  console.log(`🎯 Stream proxy (domain spoof): http://localhost:${PORT}/stream-proxy/channels/hd/hd2.php`);
  console.log(`🚀 Browser-based (needs Puppeteer): http://localhost:${PORT}/browser-proxy/channels/hd/hd2.php`);
  console.log(`🧪 Iframe embed: <iframe src="/stream-proxy/channels/hd/hd2.php"></iframe>`);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  if (browser) {
    await browser.close();
  }
  process.exit();
});