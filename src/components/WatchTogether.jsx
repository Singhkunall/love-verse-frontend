import React, { useState, useEffect, useRef } from 'react';
import { PlaySquare, Link as LinkIcon, Search, Sparkles, Film, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const PRESET_VIDEOS = [
  { name: 'Lo-Fi Girl 🎧', id: 'jfKfPfyJRdk' },
  { name: 'Romantic Piano 🎹', id: '77ZozI0rw7w' },
  { name: 'Nature Relax 🌿', id: 'eKFTSSKCzWA' },
  { name: 'Movie Trailer 🍿', id: 'aWzlQ2N6qqg' }
];

// Helper to extract clean 11-character YouTube Video ID from any link format (Shorts, Shortened, Standard)
const getYouTubeVideoId = (rawUrl) => {
  if (!rawUrl) return 'jfKfPfyJRdk';
  const cleaned = rawUrl.trim();

  // Match 11-char YouTube Video ID
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = cleaned.match(regExp);

  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }

  // Fallback if plain ID was passed
  if (cleaned.length === 11) return cleaned;

  return 'jfKfPfyJRdk';
};

function WatchTogether({ user, roomId, socket }) {
  const [videoId, setVideoId] = useState('jfKfPfyJRdk');
  const [inputUrl, setInputUrl] = useState('');
  const [syncedStatus, setSyncedStatus] = useState('Synced Live ✨');
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    // Join Room explicitly on mount
    socket.emit("join_chat", roomId);

    // 1. Video URL Change
    const handleVideoChanged = (data) => {
      const id = getYouTubeVideoId(data.url);
      setVideoId(id);
      toast(`${data.userName || 'Partner'} loaded a new video! 🍿`, { icon: '🎬' });
    };

    // 2. Play Trigger
    const handleVideoPlayed = () => {
      setSyncedStatus('Playing Together 🎶');
    };

    // 3. Pause Trigger
    const handleVideoPaused = () => {
      setSyncedStatus('Paused ⏸️');
    };

    socket.on("video_changed", handleVideoChanged);
    socket.on("video_played", handleVideoPlayed);
    socket.on("video_paused", handleVideoPaused);

    return () => {
      socket.off("video_changed", handleVideoChanged);
      socket.off("video_played", handleVideoPlayed);
      socket.off("video_paused", handleVideoPaused);
    };
  }, [socket, roomId]);

  // Load new video URL
  const handleLoadVideo = (e) => {
    e.preventDefault();
    if (!inputUrl) return;

    const id = getYouTubeVideoId(inputUrl);
    setVideoId(id);

    if (socket) {
      socket.emit("change_video", {
        roomId,
        url: inputUrl,
        userName: user?.name || 'Partner'
      });
    }
    setInputUrl('');
    toast.success("Video Loaded & Synced! 🎬");
  };

  const handleSelectPreset = (preset) => {
    setVideoId(preset.id);
    if (socket) {
      socket.emit("change_video", {
        roomId,
        url: `https://www.youtube.com/watch?v=${preset.id}`,
        userName: user?.name || 'Partner'
      });
    }
    toast.success(`Loaded ${preset.name}! 🍿`);
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
            <p className="text-xs text-gray-500 font-bold">Synchronized YouTube video player for couples</p>
          </div>
        </div>

        <span className="text-xs font-black uppercase tracking-widest bg-rose-50 text-rose-500 px-4 py-2 rounded-full border border-rose-100 shadow-sm">
          {syncedStatus}
        </span>
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleLoadVideo} className={`${glassStyle} p-4 flex gap-3`}>
        <div className="flex-1 flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
          <LinkIcon size={20} className="text-rose-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Paste any YouTube video or Shorts link..." 
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

      {/* PRESET CHIPS */}
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

      {/* Native Official YouTube Player Box */}
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

        <div className="flex justify-between items-center mt-4 px-2 text-xs font-bold text-gray-400">
          <span className="flex items-center gap-1.5 text-rose-500">
            <Sparkles size={14} /> Real-Time Sync Active
          </span>
          <span className="truncate max-w-xs font-mono text-[11px]">ID: {videoId}</span>
        </div>
      </div>
    </div>
  );
}

export default WatchTogether;