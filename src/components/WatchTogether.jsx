import React, { useState, useEffect, useRef } from 'react';
import { PlaySquare, Link as LinkIcon, Search, Sparkles, Film, AlertCircle, Tv, Monitor, ExternalLink, Globe, Play, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const PRESET_VIDEOS = [
  { name: 'Lo-Fi Girl 🎧', id: 'jfKfPfyJRdk' },
  { name: 'Romantic Piano 🎹', id: '77ZozI0rw7w' },
  { name: 'Nature Relax 🌿', id: 'eKFTSSKCzWA' },
  { name: 'Movie Trailer 🍿', id: 'aWzlQ2N6qqg' }
];

const NETMIRROR_DEFAULT_URL = 'https://net77.cc/home';

// Helper to extract clean 11-character YouTube Video ID
const getYouTubeVideoId = (rawUrl) => {
  if (!rawUrl) return 'jfKfPfyJRdk';
  const cleaned = rawUrl.trim();

  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = cleaned.match(regExp);

  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }

  if (cleaned.length === 11) return cleaned;
  return 'jfKfPfyJRdk';
};

function WatchTogether({ user, roomId, socket }) {
  const [activeTab, setActiveTab] = useState('youtube'); // 'youtube' | 'web_streamer' | 'direct' | 'ott_guide'
  const [videoId, setVideoId] = useState('jfKfPfyJRdk');
  const [webStreamUrl, setWebStreamUrl] = useState(NETMIRROR_DEFAULT_URL);
  const [directMovieUrl, setDirectMovieUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  const [syncedStatus, setSyncedStatus] = useState('Synced Live ✨');
  
  const iframeRef = useRef(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Join Room explicitly on mount
    socket.emit("join_chat", roomId);

    // 1. Video URL Change
    const handleVideoChanged = (data) => {
      if (data.type === 'web_streamer') {
        setActiveTab('web_streamer');
        setWebStreamUrl(data.url);
      } else if (data.type === 'direct') {
        setActiveTab('direct');
        setDirectMovieUrl(data.url);
      } else {
        setActiveTab('youtube');
        const id = getYouTubeVideoId(data.url);
        setVideoId(id);
      }
      toast(`${data.userName || 'Partner'} loaded a new stream/movie! 🍿`, { icon: '🎬' });
    };

    socket.on("video_changed", handleVideoChanged);

    return () => {
      socket.off("video_changed", handleVideoChanged);
    };
  }, [socket, roomId]);

  // Load new video URL
  const handleLoadVideo = (e) => {
    e.preventDefault();
    if (!inputUrl) return;

    const trimmed = inputUrl.trim();

    if (trimmed.includes('youtube.com') || trimmed.includes('youtu.be')) {
      setActiveTab('youtube');
      const id = getYouTubeVideoId(trimmed);
      setVideoId(id);
      if (socket) {
        socket.emit("change_video", {
          roomId,
          type: 'youtube',
          url: trimmed,
          userName: user?.name || 'Partner'
        });
      }
    } else if (trimmed.includes('net77') || trimmed.startsWith('http')) {
      setActiveTab('web_streamer');
      setWebStreamUrl(trimmed);
      if (socket) {
        socket.emit("change_video", {
          roomId,
          type: 'web_streamer',
          url: trimmed,
          userName: user?.name || 'Partner'
        });
      }
    } else {
      setActiveTab('direct');
      setDirectMovieUrl(trimmed);
      if (socket) {
        socket.emit("change_video", {
          roomId,
          type: 'direct',
          url: trimmed,
          userName: user?.name || 'Partner'
        });
      }
    }

    setInputUrl('');
    toast.success("Loaded & Synced with Partner! 🎬");
  };

  const handleSelectPreset = (preset) => {
    setActiveTab('youtube');
    setVideoId(preset.id);
    if (socket) {
      socket.emit("change_video", {
        roomId,
        type: 'youtube',
        url: `https://www.youtube.com/watch?v=${preset.id}`,
        userName: user?.name || 'Partner'
      });
    }
    toast.success(`Loaded ${preset.name}! 🍿`);
  };

  const handleOpenNetMirror = () => {
    setActiveTab('web_streamer');
    setWebStreamUrl(NETMIRROR_DEFAULT_URL);
    if (socket) {
      socket.emit("change_video", {
        roomId,
        type: 'web_streamer',
        url: NETMIRROR_DEFAULT_URL,
        userName: user?.name || 'Partner'
      });
    }
    toast.success("Loaded NetMirror Streamer (net77.cc)! 🍿");
  };

  const glassStyle = "bg-white/80 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem]";

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 pb-20 animate-in fade-in duration-500 px-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
            <PlaySquare size={24} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-800">Watch Together 🍿</h3>
            <p className="text-xs text-gray-500 font-bold">YouTube, NetMirror, Direct Movies & OTT Guide</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-white/70 backdrop-blur-xl p-1 rounded-full border border-gray-200 shadow-sm overflow-x-auto">
          <button
            onClick={() => setActiveTab('youtube')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              activeTab === 'youtube' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-600'
            }`}
          >
            🍿 YouTube
          </button>
          <button
            onClick={handleOpenNetMirror}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              activeTab === 'web_streamer' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-600'
            }`}
          >
            🌐 NetMirror
          </button>
          <button
            onClick={() => setActiveTab('direct')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              activeTab === 'direct' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-600'
            }`}
          >
            🎥 Direct Movie
          </button>
          <button
            onClick={() => setActiveTab('ott_guide')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              activeTab === 'ott_guide' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-600'
            }`}
          >
            🎬 Netflix & Prime
          </button>
        </div>
      </div>

      {/* URL Input Form */}
      {activeTab !== 'ott_guide' && (
        <form onSubmit={handleLoadVideo} className={`${glassStyle} p-4 flex gap-3`}>
          <div className="flex-1 flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
            <LinkIcon size={20} className="text-rose-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Paste NetMirror (net77.cc), YouTube, or Movie Link..." 
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              className="flex-1 bg-transparent border-none outline-none text-xs md:text-sm text-gray-800 font-bold"
            />
          </div>
          <button
            type="submit"
            className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-lg transition-all flex items-center gap-2 shrink-0"
          >
            <Search size={16} /> Load & Sync
          </button>
        </form>
      )}

      {/* TAB 1: YOUTUBE PLAYER */}
      {activeTab === 'youtube' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0">
              Quick Picks:
            </span>
            {PRESET_VIDEOS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectPreset(preset)}
                className="px-3.5 py-1.5 bg-white/70 hover:bg-rose-50 border border-gray-100 text-gray-700 text-xs font-bold rounded-full shadow-sm transition-all shrink-0"
              >
                {preset.name}
              </button>
            ))}
          </div>

          <div className={`${glassStyle} p-4 md:p-6`}>
            <div className="relative pt-[56.25%] rounded-3xl overflow-hidden shadow-2xl bg-black border border-gray-900">
              <iframe
                ref={iframeRef}
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0`}
                title="Watch Together YouTube Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="absolute top-0 left-0 w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: NETMIRROR & WEB STREAMER */}
      {activeTab === 'web_streamer' && (
        <div className={`${glassStyle} p-4 md:p-6 space-y-4`}>
          <div className="flex justify-between items-center px-2">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-ping inline-block" />
              <span className="text-xs font-black text-gray-800">NetMirror Live Portal ({webStreamUrl})</span>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={webStreamUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-black transition-all flex items-center gap-1"
              >
                Open in New Tab <ExternalLink size={12} />
              </a>
            </div>
          </div>

          <div className="relative h-[600px] rounded-3xl overflow-hidden shadow-2xl bg-slate-900 border border-gray-800">
            <iframe
              src={webStreamUrl}
              title="NetMirror Web Streamer"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              sandbox="allow-forms allow-scripts allow-same-origin font-src allow-popups allow-presentation allow-modals"
              allowFullScreen
              className="w-full h-full border-0"
            />
          </div>
        </div>
      )}

      {/* TAB 3: DIRECT MOVIE PLAYER (MP4 / HLS) */}
      {activeTab === 'direct' && (
        <div className={`${glassStyle} p-4 md:p-6 space-y-4`}>
          <div className="relative pt-[56.25%] rounded-3xl overflow-hidden shadow-2xl bg-black border border-gray-900">
            {directMovieUrl ? (
              <video
                ref={videoRef}
                src={directMovieUrl}
                controls
                autoPlay
                className="absolute top-0 left-0 w-full h-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white space-y-3 bg-slate-900">
                <Film size={44} className="text-rose-500" />
                <h4 className="text-lg font-black">Direct Movie Streamer</h4>
                <p className="text-xs text-gray-400 max-w-sm">
                  Paste any direct movie link (.mp4, .webm, Google Drive stream link) in the box above to stream together!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: NETFLIX & AMAZON PRIME GUIDE */}
      {activeTab === 'ott_guide' && (
        <div className={`${glassStyle} p-8 space-y-6 animate-in zoom-in-95`}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center font-black">
              <Tv size={26} />
            </div>
            <div>
              <h4 className="text-2xl font-black text-gray-800">How to Watch Netflix, Amazon Prime & Hotstar Together 🎬</h4>
              <p className="text-xs text-gray-500 font-bold">Netflix, Prime Video & Hotstar use DRM copyright protection so they cannot be embedded in web pages.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            
            {/* METHOD 1: LOVE-VERSE SCREEN SHARE */}
            <div className="p-6 bg-gradient-to-br from-rose-500 to-pink-600 text-white rounded-3xl space-y-3 shadow-xl relative overflow-hidden">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-black">
                <Monitor size={20} />
              </div>
              <h5 className="text-lg font-black">Method 1: Love-Verse Screen Share 🖥️ (Recommended)</h5>
              <ol className="text-xs space-y-2 text-rose-100 font-bold list-decimal ml-4">
                <li>Go to **Chat & Call** tab in Love-Verse.</li>
                <li>Start a Video Call with your partner.</li>
                <li>Click **"Share Screen"** button and select your Chrome tab playing Netflix/Prime Video!</li>
              </ol>
              <div className="pt-2">
                <span className="text-[10px] uppercase font-black tracking-widest bg-white/20 px-3 py-1 rounded-full">
                  Pro Tip: Turn off Hardware Acceleration in Chrome Settings if screen turns black!
                </span>
              </div>
            </div>

            {/* METHOD 2: TELEPARTY EXTENSION */}
            <div className="p-6 bg-gray-50 border border-gray-200 rounded-3xl space-y-3 shadow-sm">
              <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center font-black">
                <ExternalLink size={20} />
              </div>
              <h5 className="text-lg font-black text-gray-800">Method 2: Teleparty (Netflix Party) 🌐</h5>
              <ol className="text-xs space-y-2 text-gray-600 font-bold list-decimal ml-4">
                <li>Install free **Teleparty extension** on Google Chrome or Edge.</li>
                <li>Open Netflix / Prime / Disney+ Hotstar and start the movie.</li>
                <li>Click Teleparty extension icon and send the sync link to your partner!</li>
              </ol>
              <a
                href="https://www.teleparty.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-black text-purple-600 hover:underline pt-2"
              >
                Get Teleparty Extension <ExternalLink size={14} />
              </a>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default WatchTogether;