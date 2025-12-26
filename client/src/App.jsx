import { useState, useEffect } from 'react';
import ChannelList from './components/ChannelList';
import Player from './components/Player';
import './index.css';

function App() {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      <ChannelList
        channels={channels}
        activeChannel={selectedChannel}
        onSelectChannel={setSelectedChannel}
      />

      <div className="main-content">
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
