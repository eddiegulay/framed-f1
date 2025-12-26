# The Framed Stream

A cinematic iptv streaming platform that transforms raw IPTV feeds into immersive, atmospheric viewing experiences. This application uses a split-architecture design with a **React** frontend for the UI and an **Express** backend to handle proxying and header manipulation, allowing for seamless playback of streams that usually enforce strict CORS or Referer policies.

## Features

- **Cinematic Interface**: Stadium-inspired gradients and glassmorphic UI elements.
- **IPTV Category Browsing**: Integrated browsing of categorized IPTV channels (Animation, Sports, Movies, etc.).
- **Smart Proxy**: Bypasses `X-Frame-Options` and manages `Referer`/`Origin` headers to play restricted streams.
- **HLS Support**: Native playback of `.m3u8` streams with a custom video player.
- **Responsive Design**: Collapsible sidebar and mobile-friendly layout.

---

## Architecture

The project consists of two main parts that must run simultaneously:

1.  **Backend (Root)**: Node.js + Express
    - Runs on port `3000` (default).
    - Fetches playlists.
    - Proxies video streams to bypass browser security restrictions (CORS/Frame ancestors).
2.  **Frontend (`/client`)**: React + Vite
    - Runs on port `5173` (default).
    - Provides the user interface (Channel list, Video Player).
    - Proxies API requests to the Backend via Vite configuration (or direct fetch).

---

## Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- npm

### 1. Installation

You need to install dependencies for **both** the backend and the frontend.

**Backend Dependencies:**
```bash
# In the root directory
npm install
```

**Frontend Dependencies:**
```bash
# In the client directory
cd client
npm install
cd .. # Go back to root
```

### 2. Running the App

You need two terminal windows to run the application (or a tool like `concurrently`, though separate terminals are recommended for debugging).

**Terminal 1: Start Backend**
```bash
# From the root directory
npm run dev
# Server will start at http://localhost:3000
```

**Terminal 2: Start Frontend**
```bash
# From the root directory
npm run client:dev
# Client will start at http://localhost:5173
```

Once both are running, open your browser to **[http://localhost:5173](http://localhost:5173)** to use the app.

---

## Configuration

### Backend Options
- **Port**: Set the `PORT` environment variable to change the backend port (default: 3000).
- **Default Playlist**: Modify `DEFAULT_PLAYLIST_URL` in `server.js` to change the initial playlist loaded by the app.

### Adding Custom Channels
The application is designed to parse M3U playlists. You can modify the `CATEGORIES` array in `server.js` to add your own playlist sources.

```javascript
// server.js
const CATEGORIES = [
  { name: 'My Custom List', url: 'https://example.com/playlist.m3u' },
  // ...
];
```

## Troubleshooting

**Stream not loading?**
- Check the console in the browser developer tools.
- Ensure the backend is running on port 3000.
- Some streams may be geo-locked or require specific headers that the generic proxy doesn't handle.

**CORS Errors?**
- Ensure you possess the rights to view the content.
- The proxy attempts to handle CORS, but extremely strict servers might still reject the request.

## Known Issues

- Some streams may be geo-locked or require specific headers that the generic proxy doesn't handle.
- The backend server may not be able to handle high traffic or large playlists.
- The frontend may not be able to handle high traffic or large playlists.
---

## License

MIT
