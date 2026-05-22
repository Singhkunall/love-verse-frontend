import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { PlaySquare, Link as LinkIcon, Search } from 'lucide-react';
import toast from 'react-hot-toast';

function WatchTogether({ user, roomId, socket }) {
  const [url, setUrl] = useState('https://www.youtube.com/watch?v=jfKfPfyJRdk'); // Default Lofi Girl
  const [inputUrl, setInputUrl] = useState('');
  const [playing, setPlaying] = useState(false);
  
  const playerRef = useRef(null);
  const isSeekingRef = useRef(false);

  useEffect(() => {
    // 1. URL Change Sync
    socket.on("video_changed", (data) => {
      setUrl(data.url);
      toast(`${data.userName} changed the video! 🍿`, { icon: '🎬' });
    });

    // 2. Play Sync
    socket.on("video_played", (data) => {
      setPlaying(true);
      if (playerRef.current && Math.abs(playerRef.current.getCurrentTime() - data.time) > 2) {
        playerRef.current.seekTo(data.time, 'seconds');
      }
    });

    // 3. Pause Sync
    socket.on("video_paused", () => {
      setPlaying(false);
    });

    // 4. Seek Sync
    socket.on("video_seeked", (data) => {
      isSeekingRef.current = true;
      if (playerRef.current) {
        playerRef.current.seekTo(data.time, 'seconds');
      }
      setTimeout(() => { isSeekingRef.current = false; }, 1000); // Prevent infinite loop
    });

    return () => {
      socket.off("video_changed");
      socket.off("video_played");
      socket.off("video_paused");
      socket.off("video_seeked");
    };
  }, [socket]);

  // --- Emit Events to Partner ---
  const handleLoadVideo = (e) => {
    e.preventDefault();
    if (!inputUrl) return;
    setUrl(inputUrl);
    socket.emit("change_video", { roomId, url: inputUrl, userName: user.name });
    setInputUrl('');
  };

  const handlePlay = () => {
    if (!playing) {
      setPlaying(true);
      const currentTime = playerRef.current ? playerRef.current.getCurrentTime() : 0;
      socket.emit("play_video", { roomId, time: currentTime });
    }
  };

  const handlePause = () => {
    if (playing) {
      setPlaying(false);
      socket.emit("pause_video", { roomId });
    }
  };

  const handleSeek = (seconds) => {
    // Sirf tab emit karo jab user khud seek kare (na ki socket event se seek ho raha ho)
    if (!isSeekingRef.current) {
      socket.emit("seek_video", { roomId, time: seconds });
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full space-y-6 pb-20 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-3 px-2">
        <PlaySquare size={32} className="text-rose-500" />
        <h3 className="text-3xl font-black text-gray-800">Watch Together 🍿</h3>
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleLoadVideo} className="bg-white/70 backdrop-blur-xl p-4 rounded-[2rem] border border-white shadow-xl flex gap-3">
        <div className="flex-1 flex items-center gap-2 bg-rose-50/50 rounded-2xl px-4 py-2 border border-rose-100">
          <LinkIcon size={20} className="text-rose-400" />
          <input 
            type="text" 
            placeholder="Paste YouTube Link here..." 
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 font-medium"
          />
        </div>
        <button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg transition-all flex items-center gap-2">
          <Search size={18} /> Load
        </button>
      </form>

      {/* Video Player */}
      <div className="bg-white/70 backdrop-blur-xl p-4 rounded-[2rem] border border-white shadow-xl">
        <div className="relative pt-[56.25%] rounded-2xl overflow-hidden shadow-inner bg-black">
          <ReactPlayer 
            ref={playerRef}
            url={url} 
            playing={playing}
            controls={true}
            onPlay={handlePlay}
            onPause={handlePause}
            onSeek={handleSeek}
            width="100%"
            height="100%"
            className="absolute top-0 left-0"
            config={{ youtube: { playerVars: { disablekb: 1 } } }} // Disables keyboard shortcuts to prevent sync bugs
          />
        </div>
        <p className="text-center text-xs font-bold text-gray-400 mt-4 tracking-widest uppercase">
          Video is synced in real-time with your partner 💖
        </p>
      </div>

    </div>
  );
}

export default WatchTogether;