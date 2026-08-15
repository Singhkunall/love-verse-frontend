import React, { useState, useEffect, useRef } from 'react';
import { PlaySquare, Link as LinkIcon, Search, Sparkles, Film, AlertCircle, Tv, Monitor, ExternalLink, Globe, Play, RefreshCw, Video, StopCircle, Maximize2, Volume2, VolumeX, Minimize2, Radio, Mic, MicOff, PhoneOff, VideoOff, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import Peer from 'peerjs';
import AgoraRTC from 'agora-rtc-sdk-ng';

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

  // Live Voice & Camera State inside Watch Together
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isVoiceMicMuted, setIsVoiceMicMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  // Draggable PIP Overlay State
  const [pipPosition, setPipPosition] = useState({ x: 0, y: 0 });
  const [isDraggingPip, setIsDraggingPip] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });

  const screenVideoRef = useRef(null);
  const cinemaContainerRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const peerRef = useRef(null);
  const agoraVoiceClientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);

  // Drag Event Handlers
  const handleDragStart = (clientX, clientY) => {
    setIsDraggingPip(true);
    dragStartRef.current = { x: clientX, y: clientY };
    initialPosRef.current = { ...pipPosition };
  };

  const handleDragMove = (clientX, clientY) => {
    if (!isDraggingPip) return;
    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;
    setPipPosition({
      x: initialPosRef.current.x + deltaX,
      y: initialPosRef.current.y + deltaY
    });
  };

  const handleDragEnd = () => {
    setIsDraggingPip(false);
  };

  useEffect(() => {
    if (!isDraggingPip) return;

    const onMouseMove = (e) => handleDragMove(e.clientX, e.clientY);
    const onMouseUp = () => handleDragEnd();
    const onTouchMove = (e) => {
      if (e.touches && e.touches[0]) {
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };
    const onTouchEnd = () => handleDragEnd();

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [isDraggingPip]);

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

  // Clean up Voice & Camera on unmount
  useEffect(() => {
    return () => {
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.stop();
        localAudioTrackRef.current.close();
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.stop();
        localVideoTrackRef.current.close();
      }
      agoraVoiceClientRef.current?.leave();
    };
  }, []);

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

  // LIVE VOICE & CAMERA CHAT TOGGLE (AGORA RTC)
  const toggleVoiceChatWatch = async () => {
    if (isVoiceConnected) {
      // Leave Voice & Camera Chat
      try {
        if (localAudioTrackRef.current) {
          localAudioTrackRef.current.stop();
          localAudioTrackRef.current.close();
          localAudioTrackRef.current = null;
        }
        if (localVideoTrackRef.current) {
          localVideoTrackRef.current.stop();
          localVideoTrackRef.current.close();
          localVideoTrackRef.current = null;
        }
        await agoraVoiceClientRef.current?.leave();
        setIsVoiceConnected(false);
        setIsVoiceMicMuted(false);
        setIsCameraOn(false);
        setHasRemoteVideo(false);
        toast.success("Voice & Video Chat Disconnected 🎙️");
      } catch (err) {
        console.error("Voice leave error:", err);
      }
    } else {
      // Join Voice Chat
      try {
        const appId = import.meta.env.VITE_AGORA_APP_ID || "a5839042b3224b1a8d052b610c666579";
        const uid = Math.floor(Math.random() * 100000);
        const voiceChannel = `watch_voice_${roomId}`;

        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/agora/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channelName: voiceChannel, uid })
        });
        const data = await res.json();

        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        agoraVoiceClientRef.current = client;

        client.on('user-published', async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);
          if (mediaType === 'audio') {
            remoteUser.audioTrack?.play();
            toast.success("Partner Connected to Voice Chat! 🎙️✨");
          }
          if (mediaType === 'video') {
            setHasRemoteVideo(true);
            setTimeout(() => {
              remoteUser.videoTrack?.play('watch-remote-video', { fit: 'cover' });
            }, 300);
            toast.success("Partner Turned On Live Camera! 📹✨");
          }
        });

        client.on('user-left', () => {
          setHasRemoteVideo(false);
          toast("Partner disconnected voice/video.");
        });

        await client.join(appId, voiceChannel, data.token, uid);
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: "speech_low_quality", // Filters out high/low movie frequencies, isolating human voice!
          AEC: true, // Acoustic Echo Cancellation (Stop audio echo reflection)
          ANS: true, // Automatic Noise Suppression (Filter background noise)
          AGC: true  // Automatic Gain Control (Balance voice levels)
        });
        localAudioTrackRef.current = audioTrack;
        await client.publish([audioTrack]);

        setIsVoiceConnected(true);
        setIsVoiceMicMuted(false);
        toast.success("Live Voice Chat Active! Talk & see each other while watching 🎙️📹🍿");
      } catch (err) {
        console.error("Voice chat error:", err);
        toast.error("Could not start Voice Chat. Check mic permission!");
      }
    }
  };

  const toggleMicMuteWatch = () => {
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.setEnabled(isVoiceMicMuted);
      setIsVoiceMicMuted(!isVoiceMicMuted);
      toast.success(isVoiceMicMuted ? "Mic Unmuted 🎙️" : "Mic Muted 🔇");
    }
  };

  const toggleCameraWatch = async () => {
    if (!isVoiceConnected) {
      toast.error("Please connect Live Voice Chat first! 🎙️");
      return;
    }

    if (isCameraOn) {
      try {
        if (localVideoTrackRef.current) {
          await agoraVoiceClientRef.current?.unpublish([localVideoTrackRef.current]);
          localVideoTrackRef.current.stop();
          localVideoTrackRef.current.close();
          localVideoTrackRef.current = null;
        }
        setIsCameraOn(false);
        toast.success("Camera Turned Off");
      } catch (err) {
        console.error("Camera turn off error:", err);
      }
    } else {
      try {
        const videoTrack = await AgoraRTC.createCameraVideoTrack();
        localVideoTrackRef.current = videoTrack;
        await agoraVoiceClientRef.current?.publish([videoTrack]);
        setIsCameraOn(true);
        setTimeout(() => {
          videoTrack.play('watch-local-video', { fit: 'cover' });
        }, 300);
        toast.success("Live Camera Turned On! Partner can see your reactions 📹✨");
      } catch (err) {
        console.error("Camera turn on error:", err);
        toast.error("Could not turn on camera. Check camera permissions!");
      }
    }
  };

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
    const target = cinemaContainerRef.current || screenVideoRef.current;
    if (target) {
      if (target.requestFullscreen) {
        target.requestFullscreen();
      } else if (target.webkitRequestFullscreen) {
        target.webkitRequestFullscreen();
      } else if (target.msRequestFullscreen) {
        target.msRequestFullscreen();
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
      
      {/* Global CSS for PIP Camera Video Tags */}
      <style>{`
        #watch-remote-video div, #watch-remote-video video, #watch-local-video div, #watch-local-video video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 1.5rem !important;
        }
      `}</style>

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

      {/* LIVE VOICE & CAMERA CHAT FLOATING BAR */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 p-3.5 rounded-3xl text-white shadow-xl gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-black">
              <Radio size={20} className={isVoiceConnected ? "animate-pulse text-green-300" : "text-white"} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider">
                {isVoiceConnected ? 'Live Voice & Video Chat Active 🎙️📹' : 'Movie Voice & Camera Chat'}
              </h4>
              <p className="text-[10px] text-rose-100 font-bold">
                {isVoiceConnected ? 'Talk & see live facial reactions while watching movies!' : 'Connect mic & camera to talk & see each other live during movie'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isVoiceConnected && (
              <>
                <button
                  onClick={toggleMuteCinema}
                  className={`p-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                    isMuted ? 'bg-amber-500 text-white shadow-md' : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  title={isMuted ? "Unmute Movie Audio" : "Mute Movie Audio to Avoid Echo"}
                >
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  <span>{isMuted ? 'Movie Muted' : 'Movie Sound'}</span>
                </button>

                <button
                  onClick={toggleMicMuteWatch}
                  className={`p-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                    isVoiceMicMuted ? 'bg-red-600 text-white shadow-md' : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  title={isVoiceMicMuted ? "Unmute Mic" : "Mute Mic"}
                >
                  {isVoiceMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
                  <span>{isVoiceMicMuted ? 'Muted' : 'Mic On'}</span>
                </button>

                <button
                  onClick={toggleCameraWatch}
                  className={`p-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                    isCameraOn ? 'bg-green-500 text-white shadow-md' : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  title={isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
                >
                  {isCameraOn ? <Video size={16} /> : <VideoOff size={16} />}
                  <span>{isCameraOn ? 'Camera On' : 'Turn On Cam 📹'}</span>
                </button>
              </>
            )}

            <button
              onClick={toggleVoiceChatWatch}
              className={`px-4 py-2 rounded-xl font-black text-xs transition-all shadow-lg flex items-center gap-1.5 ${
                isVoiceConnected ? 'bg-gray-900 hover:bg-black text-white' : 'bg-white text-rose-600 hover:bg-rose-50'
              }`}
            >
              {isVoiceConnected ? <PhoneOff size={14} /> : <Mic size={14} />}
              <span>{isVoiceConnected ? 'Disconnect' : 'Connect Voice & Video 🎙️📹'}</span>
            </button>
          </div>
        </div>

        {isVoiceConnected && (
          <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-between text-[11px] font-bold text-amber-700 animate-in fade-in">
            <span>🎧 Pro Tip: Use Earphones / Headphones while watching movies with Voice Chat for 100% zero speaker echo!</span>
            <span className="text-[10px] text-amber-600 font-normal italic">Echo Filter Active ✨</span>
          </div>
        )}
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

              {/* YOUTUBE DRAGGABLE PIP LIVE CAMERA OVERLAY */}
              {isVoiceConnected && (isCameraOn || hasRemoteVideo) && (
                <div
                  style={{
                    transform: `translate(${pipPosition.x}px, ${pipPosition.y}px)`
                  }}
                  className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-2 animate-in fade-in zoom-in-95 pointer-events-auto touch-none select-none"
                >
                  <div
                    onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
                    onTouchStart={(e) => e.touches?.[0] && handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
                    className="relative w-36 h-52 md:w-44 md:h-60 rounded-3xl overflow-hidden border-2 border-rose-500/80 shadow-2xl bg-slate-950 cursor-grab active:cursor-grabbing group hover:border-pink-400 transition-colors"
                  >
                    {/* Drag Handle Bar */}
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-white/80 z-30 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <GripVertical size={10} />
                      <span className="text-[8px] font-black uppercase tracking-widest">Drag Me</span>
                    </div>

                    {/* Remote Camera Feed */}
                    {hasRemoteVideo ? (
                      <div id="watch-remote-video" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-slate-400">
                        <VideoOff size={24} className="mb-2 text-slate-500" />
                        <p className="text-[10px] font-bold">Partner's camera off</p>
                      </div>
                    )}

                    {/* Local Camera Feed (Mini Thumbnail) */}
                    {isCameraOn && (
                      <div className="absolute bottom-2 right-2 w-14 h-20 md:w-18 md:h-24 rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-black z-20">
                        <div id="watch-local-video" className="w-full h-full object-cover" />
                      </div>
                    )}
                  </div>
                </div>
              )}
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
          <div
            ref={cinemaContainerRef}
            className={`relative rounded-3xl overflow-hidden shadow-2xl bg-slate-950 border border-gray-800 transition-all ${
              isTheaterMode ? 'h-[75vh] md:h-[85vh]' : 'pt-[56.25%]'
            }`}
          >
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              controls={isSharingScreen || isReceivingStream}
              muted={isSharingScreen}
              className="absolute top-0 left-0 w-full h-full object-contain"
            />

            {/* FULLSCREEN DRAGGABLE PIP LIVE CAMERA OVERLAY */}
            {isVoiceConnected && (isCameraOn || hasRemoteVideo) && (
              <div
                style={{
                  transform: `translate(${pipPosition.x}px, ${pipPosition.y}px)`
                }}
                className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-2 animate-in fade-in zoom-in-95 pointer-events-auto touch-none select-none"
              >
                <div
                  onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
                  onTouchStart={(e) => e.touches?.[0] && handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
                  className="relative w-36 h-52 md:w-44 md:h-60 rounded-3xl overflow-hidden border-2 border-rose-500/80 shadow-2xl bg-slate-950 cursor-grab active:cursor-grabbing group hover:border-pink-400 transition-colors"
                >
                  {/* Drag Handle Bar */}
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-white/80 z-30 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <GripVertical size={10} />
                    <span className="text-[8px] font-black uppercase tracking-widest">Drag Me</span>
                  </div>

                  {/* Remote Camera Feed */}
                  {hasRemoteVideo ? (
                    <div id="watch-remote-video" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-slate-400">
                      <VideoOff size={24} className="mb-2 text-slate-500" />
                      <p className="text-[10px] font-bold">Partner's camera off</p>
                    </div>
                  )}

                  {/* Local Camera Feed (Mini Thumbnail) */}
                  {isCameraOn && (
                    <div className="absolute bottom-2 right-2 w-14 h-20 md:w-18 md:h-24 rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-black z-20">
                      <div id="watch-local-video" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            )}

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