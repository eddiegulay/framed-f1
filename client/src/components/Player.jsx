import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

const Player = ({ streamUrl, channelName }) => {
    const videoRef = useRef(null);
    const hlsRef = useRef(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        // Reset error on new stream
        setError(null);

        // If no stream URL, just return
        if (!streamUrl) return;

        // Construct proxy URL helper
        // We assume the backend running on port 3000
        // In production, you might want to make this configurable
        const proxyUrl = `http://localhost:3000/proxy?url=${encodeURIComponent(streamUrl)}`;

        if (Hls.isSupported()) {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }

            const hls = new Hls({
                enableWorker: true,
                lowLatencyMode: true,
            });

            hlsRef.current = hls;

            hls.loadSource(proxyUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                video.play().catch(e => console.log('Autoplay prevented:', e));
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            console.error('Network error, trying to recover...');
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            console.error('Media error, trying to recover...');
                            hls.recoverMediaError();
                            break;
                        default:
                            console.error('Fatal error, cannot recover');
                            setError('Stream failed to load (Fatal Error).');
                            hls.destroy();
                            break;
                    }
                }
            });

        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = proxyUrl;
            video.addEventListener('loadedmetadata', () => {
                video.play().catch(e => console.log('Autoplay prevented:', e));
            });
        } else {
            setError('HLS is not supported in this browser.');
        }

        return () => {
            if (hlsRef.current) {
                hlsRef.current.destroy();
            }
        };
    }, [streamUrl]);

    return (
        <div className="video-container">
            {error && (
                <div className="error-overlay" style={{
                    position: 'absolute',
                    color: 'red',
                    zIndex: 10,
                    background: 'rgba(0,0,0,0.7)',
                    padding: '20px'
                }}>
                    {error}
                </div>
            )}
            <video
                ref={videoRef}
                controls
                className="video-player"
                poster="/placeholder.png"
            />
        </div>
    );
};

export default Player;
