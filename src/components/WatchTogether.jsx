import React, { useState, useEffect, useRef } from 'react';
import { PlaySquare, Link as LinkIcon, Search, Sparkles, Film, AlertCircle, Tv, Monitor, ExternalLink, Globe, Play, RefreshCw, Video, StopCircle, Maximize2, Volume2, VolumeX, Minimize2, Radio } from 'lucide-react';
import toast from 'react-hot-toast';
import Peer from 'peerjs';

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
  const [activeTab, setActiveTab] = useState('youtube'); // 'youtube' | 'screen_share' | 'direct' | 'ott_guide'
  const [videoId, setVideoId] = useState('jfKfPfyJRdk');
  const [webStreamUrl, setWebStreamUrl] = useState(NETMIRROR_DEFAULT_URL);
  const [directMovieUrl, setDirectMovieUrl] = useState('');
  const [inputUrl, setInputUrl] = useState('');
  
  // Screen Share & Cinema State
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isReceivingStream, setIsReceivingStream] = useState(false);
  const [streamerName, setStreamerName] = useState('');
  const [isMuted, setIsMuted] = useState(true);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  const screenVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const peerRef = useRef(null);

  const iframeRef = useRef(null);
  const videoRef = useRef(null);

  const userId = (user?._id || user?.id)?.toString();
  const partnerId = (user?.partnerId?._id || user?.partnerId)?.toString();

  // PeerJS WebRTC Stream Setup
  useEffect(() => {
    if (!userId) return;

    // Initialize PeerJS Peer instance for WebRTC screen stream transfer
    const peer = new Peer(`loveverse_stream_${userId}`, {
      host: '0.peerjs.com',
      port: 443,
      secure: true
    });

    peerRef.current = peer;

    // Listen for incoming screen video stream from partner!
    peer.on('call', (call) => {
      call.answer(); // Answer incoming screen video stream call
      call.on('stream', (remoteStream) => {
        setActiveTab('screen_share');
        setIsReceivingStream(true);
        setIsSharingScreen(false);
        setIsMuted(false);

        setTimeout(() => {
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = remoteStream;
            screenVideoRef.current.muted = false; // Unmuted for viewer!
            screenVideoRef.current.play().catch(e => console.error("Auto-play error:", e));
          }
        }, 200);

        toast.success("Partner's NetMirror Stream Connected Live! 🍿✨", { duration: 5000 });
      });
    });

    return () => {
      peer.destroy();
    };
  }, [userId]);

  // Socket event listeners for stream signaling
  useEffect(() => {
    if (!socket) return;

    socket.emit("join_chat", roomId);

    const handleVideoChanged = (data) => {
      if (data.type === 'direct') {
        setActiveTab('direct');
        setDirectMovieUrl(data.url);
      } else {
        setActiveTab('youtube');
        const id = getYouTubeVideoId(data.url);
        setVideoId(id);
      }
      toast(`${data.userName || 'Partner'} loaded a new stream/movie! 🍿`, { icon: '🎬' });
    };

    const handleCinemaStarted = (data) => {
      setActiveTab('screen_share');
      setIsReceivingStream(true);
      setStreamerName(data.userName || 'Partner');
      toast(`${data.userName || 'Partner'} started streaming NetMirror! 🍿`, { icon: '📽️', duration: 5000 });
    };

    const handleCinemaEnded = () => {
      setIsReceivingStream(false);
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
      toast("Partner ended the cinema stream.");
    };

    socket.on("video_changed", handleVideoChanged);
    socket.on("cinema_stream_started", handleCinemaStarted);
    socket.on("cinema_stream_ended", handleCinemaEnded);

    return () => {
      socket.off("video_changed", handleVideoChanged);
      socket.off("cinema_stream_started", handleCinemaStarted);
      socket.off("cinema_stream_ended", handleCinemaEnded);
    };
  }, [socket, roomId]);

  useEffect(() => {
    if (isSharingScreen && screenVideoRef.current) {
      screenVideoRef.current.muted = true;
    }
  }, [isSharingScreen, activeTab]);

  // Start Screen Share Virtual Cinema directly inside Watch Together
  const startScreenShareCinema = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: true
      });

      mediaStreamRef.current = stream;
      setActiveTab('screen_share');
      setIsSharingScreen(true);
      setIsReceivingStream(false);
      setIsMuted(true);

      // Call Partner via PeerJS WebRTC to transmit live video stream!
      if (peerRef.current && partnerId) {
        peerRef.current.call(`loveverse_stream_${partnerId}`, stream);
      }

      // Notify Partner via Socket
      socket.emit("start_cinema_stream", {
        roomId,
        userName: user.name || 'Partner'
      });

      setTimeout(() => {
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
          screenVideoRef.current.muted = true; // Mute locally for streamer to prevent double sound!
        }
      }, 100);

      toast.success("Virtual Cinema Active! Streaming Live to Partner! 🍿✨");

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShareCinema();
      };
    } catch (err) {
      console.error("Screen share error:", err);
      toast.error("Could not start screen share. Please grant permission!");
    }
  };

  const stopScreenShareCinema = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    socket.emit("end_cinema_stream", { roomId });
    setIsSharingScreen(false);
    setIsReceivingStream(false);
    setActiveTab('youtube');
    toast.success("Virtual Cinema Ended!");
  };

  // Fullscreen helper
  const handleFullscreenCinema = () => {
    if (screenVideoRef.current) {
      if (screenVideoRef.current.requestFullscreen) {
        screenVideoRef.current.requestFullscreen();
      } else if (screenVideoRef.current.webkitRequestFullscreen) {
        screenVideoRef.current.webkitRequestFullscreen();
      } else if (screenVideoRef.current.msRequestFullscreen) {
        screenVideoRef.current.msRequestFullscreen();
      }
    }
  };

  // Toggle local mute state
  const toggleMuteCinema = () => {
    if (screenVideoRef.current) {
      screenVideoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

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

  const glassStyle = "bg-white/80 backdrop-blur-2xl border border-white/60 shadow-xl rounded-[2.5rem]";

  return (
    <div className={`mx-auto w-full space-y-6 pb-20 animate-in fade-in duration-500 px-4 transition-all ${
      isTheaterMode ? 'max-w-none' : 'max-w-4xl'
    }`}>
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-rose-200">
            <PlaySquare size={24} />
          </div>
          <div>
            <h3 className="text-3xl font-black text-gray-800">Watch Together 🍿</h3>
            <p className="text-xs text-gray-500 font-bold">YouTube, Virtual Cinema, Direct Movies & OTT Guide</p>
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
            onClick={() => setActiveTab('screen_share')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
              activeTab === 'screen_share' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-600'
            }`}
          >
            📽️ Virtual Cinema (NetMirror)
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
            🎬 OTT Guide
          </button>
        </div>
      </div>

      {/* URL Input Form */}
      {activeTab !== 'ott_guide' && activeTab !== 'screen_share' && (
        <form onSubmit={handleLoadVideo} className={`${glassStyle} p-4 flex gap-3`}>
          <div className="flex-1 flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3 border border-gray-100">
            <LinkIcon size={20} className="text-rose-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Paste NetMirror, YouTube, or Movie Link..." 
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

      {/* TAB 2: VIRTUAL CINEMA SCREEN SHARE PLAYER (FOR NETMIRROR / NETFLIX / PRIME) */}
      {activeTab === 'screen_share' && (
        <div className={`${glassStyle} p-6 space-y-6 text-center`}>
          <div className="flex flex-wrap justify-between items-center gap-3 px-2">
            <div className="flex items-center gap-2">
              <span className={`w-3.5 h-3.5 rounded-full ${isSharingScreen || isReceivingStream ? 'bg-green-500 animate-ping' : 'bg-gray-300'}`} />
              <h4 className="text-base font-black text-gray-800">
                {isSharingScreen
                  ? 'Virtual Cinema Stream Active! 📽️'
                  : isReceivingStream
                  ? `${streamerName || 'Partner'}'s Stream Live! 🍿`
                  : 'Virtual Cinema Mode'}
              </h4>
            </div>

            <div className="flex items-center gap-2">
              {/* Fullscreen & Controls */}
              {(isSharingScreen || isReceivingStream) && (
                <>
                  {isSharingScreen && (
                    <button
                      onClick={toggleMuteCinema}
                      className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1"
                      title={isMuted ? "Unmute Local Audio" : "Mute Local Audio to Prevent Echo"}
                    >
                      {isMuted ? <VolumeX size={16} className="text-rose-500" /> : <Volume2 size={16} className="text-green-500" />}
                    </button>
                  )}

                  <button
                    onClick={() => setIsTheaterMode(!isTheaterMode)}
                    className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1"
                    title="Toggle Theater Mode"
                  >
                    {isTheaterMode ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>

                  <button
                    onClick={handleFullscreenCinema}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-black text-xs transition-all flex items-center gap-1.5"
                  >
                    <Maximize2 size={14} /> Fullscreen
                  </button>
                </>
              )}

              {isSharingScreen ? (
                <button
                  onClick={stopScreenShareCinema}
                  className="px-6 py-2.5 bg-gray-900 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-black transition-all flex items-center gap-2"
                >
                  <StopCircle size={16} /> End Cinema Stream
                </button>
              ) : !isReceivingStream && (
                <button
                  onClick={startScreenShareCinema}
                  className="px-6 py-2.5 bg-rose-500 text-white rounded-2xl font-black text-xs shadow-lg hover:bg-rose-600 transition-all flex items-center gap-2"
                >
                  <Video size={16} /> Start NetMirror Screen Stream 🍿
                </button>
              )}
            </div>
          </div>

          {/* Screen Video Container */}
          <div className={`relative rounded-3xl overflow-hidden shadow-2xl bg-slate-950 border border-gray-800 transition-all ${
            isTheaterMode ? 'h-[75vh] md:h-[85vh]' : 'pt-[56.25%]'
          }`}>
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              controls={isSharingScreen || isReceivingStream}
              muted={isSharingScreen}
              className="absolute top-0 left-0 w-full h-full object-contain"
            />

            {!isSharingScreen && !isReceivingStream && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white space-y-3 bg-slate-900/90 backdrop-blur-sm">
                <Monitor size={48} className="text-rose-500 animate-pulse" />
                <h4 className="text-xl font-black">Watch NetMirror Together Inside Love-Verse 🍿</h4>
                <p className="text-xs text-gray-300 max-w-md italic leading-relaxed">
                  <strong>If you are playing the movie:</strong> Click below to share your NetMirror tab.<br />
                  <strong>If your partner is streaming:</strong> Just sit back & enjoy! The movie will stream right here automatically.
                </p>
                <button
                  onClick={startScreenShareCinema}
                  className="px-8 py-3.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl font-black text-xs shadow-xl hover:scale-105 transition-all flex items-center gap-2 mt-2"
                >
                  <Video size={18} /> I Want to Stream NetMirror 📽️
                </button>
              </div>
            )}
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