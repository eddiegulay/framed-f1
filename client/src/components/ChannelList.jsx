import { useState } from 'react';

const ChannelList = ({ channels, onSelectChannel, activeChannel }) => {
    const [filter, setFilter] = useState('');

    const filteredChannels = channels.filter(ch =>
        ch.name.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="sidebar">
            <div className="sidebar-header">
                <h2>Channels ({filteredChannels.length})</h2>
                <input
                    type="text"
                    placeholder="Filter channels..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    style={{
                        width: '100%',
                        marginTop: '10px',
                        padding: '5px',
                        borderRadius: '4px',
                        border: '1px solid #444',
                        background: '#333',
                        color: 'white'
                    }}
                />
            </div>
            <div className="channel-list">
                {filteredChannels.map((channel, idx) => (
                    <div
                        key={`${channel.name}-${idx}`}
                        className={`channel-item ${activeChannel?.url === channel.url ? 'active' : ''}`}
                        onClick={() => onSelectChannel(channel)}
                    >
                        {channel.logo && (
                            <img
                                src={channel.logo}
                                alt={channel.name}
                                className="channel-logo"
                                onError={(e) => e.target.style.display = 'none'}
                            />
                        )}
                        <span className="channel-name">{channel.name}</span>
                    </div>
                ))}
                {filteredChannels.length === 0 && (
                    <div style={{ padding: '20px', color: '#888', textAlign: 'center' }}>
                        No channels found
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChannelList;
