import { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import ChannelList from './components/ChannelList';
import Player from './components/Player';
import './index.css';

function App() {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    fetchPlaylist();
  }, []);

  const fetchPlaylist = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3000/api/playlist');
      if (!res.ok) throw new Error('Failed to fetch playlist');
      const data = await res.json();
      setChannels(data.channels);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Wrapper */}
      <div className={`sidebar-wrapper ${!isSidebarOpen ? 'closed' : ''}`}>
        <ChannelList
          channels={channels}
          activeChannel={selectedChannel}
          onSelectChannel={(ch) => {
            setSelectedChannel(ch);
            // Optional: Close sidebar on mobile when selecting
            if (window.innerWidth < 768) setIsSidebarOpen(false);
          }}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Open Sidebar Button (only visible when sidebar is closed) */}
        {!isSidebarOpen && (
          <button
            className="sidebar-toggle-open"
            onClick={() => setIsSidebarOpen(true)}
            title="Open Sidebar"
          >
            <Menu size={24} />
          </button>
        )}

        {loading && <div className="loading">Loading playlist...</div>}
        {error && <div className="error-message">Error: {error}</div>}

        {!loading && !error && !selectedChannel && (
          <div className="no-selection">
            <h1>Select a channel to start watching</h1>
            <p>Choose from the list on the left</p>
          </div>
        )}

        {selectedChannel && (
          <Player
            streamUrl={selectedChannel.url}
            channelName={selectedChannel.name}
          />
        )}
      </div>
    </div>
  );
}

export default App;
