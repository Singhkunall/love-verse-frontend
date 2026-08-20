import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { PlaySquare, Link as LinkIcon, Search, Sparkles, Film, AlertCircle, Tv, Monitor, ExternalLink, Globe, Play, RefreshCw, Video, StopCircle, Maximize2, Volume2, VolumeX, Minimize2, Radio, Mic, MicOff, PhoneOff, VideoOff, GripVertical, MessageSquare, Send, Heart, Flame, Smile, ThumbsUp, X, ShieldCheck, Sliders, Volume1, Info, Bell, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import Peer from 'peerjs';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { mobileService } from '../utils/mobileService';

// Disable telemetry & stats collector to prevent AdBlocker ERR_BLOCKED_BY_CLIENT console spam
AgoraRTC.disableLogUpload();
AgoraRTC.setLogLevel(4);

const PRESET_VIDEOS = [
  { name: 'Lo-Fi Girl 🎧', id: 'jfKfPfyJRdk' },
  { name: 'Romantic Piano 🎹', id: '77ZozI0rw7w' },
  { name: 'Nature Relax 🌿', id: 'eKFTSSKCzWA' },
  { name: 'Movie Trailer 🍿', id: 'aWzlQ2N6qqg' }

];

const QUICK_EMOJIS = ['❤️', '🍿', '😂', '😱', '🔥', '💖'];

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
  const [isCinemaFullscreen, setIsCinemaFullscreen] = useState(false);

  // Live Voice & Camera State inside Watch Together
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isVoiceMicMuted, setIsVoiceMicMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);

  // Anti-Echo & Voice Activity Gate State
  const [voiceMode, setVoiceMode] = useState('auto_gate'); // 'auto_gate' | 'push_to_talk' | 'always_on'
  const [gateThreshold, setGateThreshold] = useState(14);
  const [micLevel, setMicLevel] = useState(0);
  const [isPttPressed, setIsPttPressed] = useState(false);
  const [showEchoSettings, setShowEchoSettings] = useState(false);
  const [isAudioDucking, setIsAudioDucking] = useState(true);
  const [isPartnerSpeaking, setIsPartnerSpeaking] = useState(false);
  const [showMobileCinemaModal, setShowMobileCinemaModal] = useState(false);

  // Audio Processing Refs
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const vadAnimFrameRef = useRef(null);
  const silenceTimerRef = useRef(null);

  // Sync refs with state to prevent stale closures
  const voiceModeRef = useRef('auto_gate');
  const isVoiceMicMutedRef = useRef(false);
  const gateThresholdRef = useRef(14);
  const isPttPressedRef = useRef(false);

  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { isVoiceMicMutedRef.current = isVoiceMicMuted; }, [isVoiceMicMuted]);
  useEffect(() => { gateThresholdRef.current = gateThreshold; }, [gateThreshold]);
  useEffect(() => { isPttPressedRef.current = isPttPressed; }, [isPttPressed]);

  // Push to talk keyboard handler (Space bar)
  useEffect(() => {
    if (!isVoiceConnected || voiceMode !== 'push_to_talk') return;

    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setIsPttPressed(true);
        if (localAudioTrackRef.current && !isVoiceMicMutedRef.current) {
          localAudioTrackRef.current.setEnabled(true);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target?.tagName)) return;
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPttPressed(false);
        if (localAudioTrackRef.current) {
          localAudioTrackRef.current.setEnabled(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isVoiceConnected, voiceMode]);

  // Floating Emoji, Translucent Chat & Sidebar Chat State
  const [floatingReactions, setFloatingReactions] = useState([]);
  const [cinemaMessages, setCinemaMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isTranslucentChatOpen, setIsTranslucentChatOpen] = useState(true);
  const [showEmojiFab, setShowEmojiFab] = useState(false);

  // Draggable PIP Overlay State
  const [pipPosition, setPipPosition] = useState({ x: 0, y: 0 });
  const [isDraggingPip, setIsDraggingPip] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });

  // Stream & Autoplay State
  const [hasRemoteStream, setHasRemoteStream] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Native Mobile Features & PiP State
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [autoPiPEnabled, setAutoPiPEnabled] = useState(true);
  const [isWakeLockActive, setIsWakeLockActive] = useState(false);

  const screenVideoRef = useRef(null);
  const cinemaContainerRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const streamerPeerIdRef = useRef(null);
  const peerRef = useRef(null);
  const agoraVoiceClientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const remoteUserRef = useRef(null);
  const chatBottomRef = useRef(null);
  const overlayChatBottomRef = useRef(null);

  // PiP toggle function
  const handleTogglePiP = async () => {
    const videoElem = screenVideoRef.current || videoRef.current;
    if (!videoElem) {
      toast.error("No active video stream to pop out!");
      return;
    }
    const pipActive = await mobileService.togglePictureInPicture(videoElem);
    setIsPiPActive(pipActive);
  };

  // Auto-PiP on tab blur/visibilitychange
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && autoPiPEnabled && (isSharingScreen || isReceivingStream)) {
        const vid = screenVideoRef.current || videoRef.current;
        if (vid && !document.pictureInPictureElement) {
          mobileService.togglePictureInPicture(vid).catch(() => { });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoPiPEnabled, isSharingScreen, isReceivingStream]);

  // Screen Wake Lock while watching streams
  useEffect(() => {
    if (isSharingScreen || isReceivingStream || activeTab === 'direct') {
      mobileService.requestWakeLock().then(active => setIsWakeLockActive(active));
    } else {
      mobileService.releaseWakeLock();
      setIsWakeLockActive(false);
    }
    return () => {
      mobileService.releaseWakeLock();
    };
  }, [isSharingScreen, isReceivingStream, activeTab]);

  // Media Session Lockscreen Controls
  useEffect(() => {
    if (isSharingScreen || isReceivingStream) {
      mobileService.setupMediaSession({
        title: isSharingScreen ? 'Streaming Cinema Live 📽️' : `${streamerName || 'Partner'}'s NetMirror Stream 🍿`,
        artist: 'Love-Verse Watch Party',
        onPlay: () => screenVideoRef.current?.play(),
        onPause: () => screenVideoRef.current?.pause()
      });
    }
  }, [isSharingScreen, isReceivingStream, streamerName]);

  // Drag Event Handlers
  const handleDragStart = (clientX, clientY) => {
    setIsDraggingPip(true);
    dragStartRef.current = { x: clientX, y: clientY };
    initialPosRef.current = { ...pipPosition };
  };

  const animFrameRef = useRef(null);

  const handleDragMove = (clientX, clientY) => {
    if (!isDraggingPip) return;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    animFrameRef.current = requestAnimationFrame(() => {
      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;
      setPipPosition({
        x: initialPosRef.current.x + deltaX,
        y: initialPosRef.current.y + deltaY
      });
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

    const peer = new Peer(`loveverse_stream_${userId}`, {
      host: '0.peerjs.com',
      port: 443,
      secure: true
    });

    peerRef.current = peer;

    peer.on('call', (call) => {
      console.log("PeerJS call received from:", call.peer);
      call.answer();
      call.on('stream', (remoteStream) => {
        console.log("PeerJS remoteStream attached successfully!", remoteStream);
        remoteStreamRef.current = remoteStream;
        setHasRemoteStream(true);
        setActiveTab('screen_share');
        setIsReceivingStream(true);
        setIsSharingScreen(false);
        setIsMuted(false);
        setAutoplayBlocked(false);

        toast.success("Partner's NetMirror Stream Connected Live! 🍿✨", { duration: 5000 });
      });
    });

    return () => {
      peer.destroy();
    };
  }, [userId]);

  // Screen stream binding helper (guarantees stream attaches to video element on mobile & desktop)
  const bindScreenVideoStream = () => {
    const vid = screenVideoRef.current;
    const targetStream = isSharingScreen ? mediaStreamRef.current : (isReceivingStream ? remoteStreamRef.current : null);

    if (!vid || !targetStream) return;

    if (vid.srcObject !== targetStream) {
      console.log("Binding targetStream to video element...", targetStream);
      vid.srcObject = targetStream;
      vid.muted = isSharingScreen;

      const playPromise = vid.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          setAutoplayBlocked(false);
        }).catch((err) => {
          console.warn("Autoplay blocked by browser policy:", err);
          setAutoplayBlocked(true);
        });
      }
    }
  };

  const setScreenVideoRef = (el) => {
    screenVideoRef.current = el;
    if (el) {
      bindScreenVideoStream();
    }
  };

  // Screen stream binding effect
  useEffect(() => {
    if (activeTab === 'screen_share') {
      bindScreenVideoStream();
      const interval = setInterval(bindScreenVideoStream, 2000);
      return () => clearInterval(interval);
    }
  }, [activeTab, isSharingScreen, isReceivingStream, hasRemoteStream]);

  // Low Latency Live Edge Buffer Sync (Only for receiver)
  useEffect(() => {
    if (!isReceivingStream || isSharingScreen) return;

    const syncInterval = setInterval(() => {
      const vid = screenVideoRef.current;
      if (vid && vid.buffered && vid.buffered.length > 0) {
        const liveEnd = vid.buffered.end(vid.buffered.length - 1);
        const delay = liveEnd - vid.currentTime;
        if (delay > 0.4) {
          vid.currentTime = liveEnd - 0.05;
        }
      }
    }, 1500);

    return () => clearInterval(syncInterval);
  }, [isReceivingStream, isSharingScreen]);

  // Clean up Voice & Camera on unmount
  useEffect(() => {
    return () => {
      stopVoiceGate();
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

  // Persistent video playback on Native Fullscreen Enter / Exit
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
      setIsCinemaFullscreen(isFull);

      setTimeout(() => {
        if (remoteUserRef.current?.videoTrack && document.getElementById('watch-remote-video')) {
          remoteUserRef.current.videoTrack.play('watch-remote-video', { fit: 'cover' });
        }
        if (localVideoTrackRef.current && document.getElementById('watch-local-video')) {
          localVideoTrackRef.current.play('watch-local-video', { fit: 'cover' });
        }
      }, 350);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Lock screen to Landscape orientation & hide bottom nav bar during full-screen mode
  useEffect(() => {
    if (isCinemaFullscreen) {
      document.body.classList.add('cinema-fullscreen-active');
      document.body.style.overflow = 'hidden';

      if (window.screen?.orientation?.lock) {
        window.screen.orientation.lock('landscape').catch(() => { });
      }
    } else {
      document.body.classList.remove('cinema-fullscreen-active');
      document.body.style.overflow = 'auto';

      if (window.screen?.orientation?.unlock) {
        window.screen.orientation.unlock().catch(() => { });
      }
    }

    return () => {
      document.body.classList.remove('cinema-fullscreen-active');
      document.body.style.overflow = 'auto';
      if (window.screen?.orientation?.unlock) {
        window.screen.orientation.unlock().catch(() => { });
      }
    };
  }, [isCinemaFullscreen]);

  // Socket event listeners for stream signaling & reactions & chat
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
      if (data.streamerPeerId) {
        streamerPeerIdRef.current = data.streamerPeerId;
      }

      // Request stream retry from streamer via socket if stream not yet received
      if (socket && peerRef.current) {
        setTimeout(() => {
          if (!remoteStreamRef.current) {
            socket.emit("request_cinema_stream", {
              roomId,
              receiverPeerId: peerRef.current?.id || `loveverse_stream_${userId}`
            });
          }
        }, 400);
      }

      mobileService.sendNotification(
        "Virtual Cinema Live! 🍿",
        `${data.userName || 'Partner'} started streaming NetMirror live!`
      );

      toast(`${data.userName || 'Partner'} started streaming NetMirror! 🍿`, { icon: '📽️', duration: 5000 });
    };

    const handleCinemaRequested = (data) => {
      if (isSharingScreen && mediaStreamRef.current && peerRef.current && data.receiverPeerId) {
        console.log("Re-sending screen share call to receiver:", data.receiverPeerId);
        peerRef.current.call(data.receiverPeerId, mediaStreamRef.current);
      }
    };

    const handleCinemaEnded = () => {
      setIsReceivingStream(false);
      remoteStreamRef.current = null;
      setHasRemoteStream(false);
      setAutoplayBlocked(false);
      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = null;
      }
      toast("Partner ended the cinema stream.");
    };

    const handleCinemaReaction = (data) => {
      const reactionId = Date.now() + Math.random();
      setFloatingReactions(prev => [...prev, { id: reactionId, emoji: data.emoji, leftPos: data.leftPos || 50 }]);
      toast(`${data.senderName || 'Partner'} reacted ${data.emoji}!`, { duration: 2000 });
      setTimeout(() => {
        setFloatingReactions(prev => prev.filter(r => r.id !== reactionId));
      }, 3000);
    };

    const handleReceiveMessage = (msg) => {
      setCinemaMessages(prev => [...prev, msg]);
      if (msg.sender !== userId && document.hidden) {
        mobileService.sendNotification(
          "In-Movie Chat 💬",
          `${msg.senderName || 'Partner'}: ${msg.message}`
        );
      }
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        overlayChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    socket.on("video_changed", handleVideoChanged);
    socket.on("cinema_stream_started", handleCinemaStarted);
    socket.on("cinema_stream_requested", handleCinemaRequested);
    socket.on("cinema_stream_ended", handleCinemaEnded);
    socket.on("receive_cinema_reaction", handleCinemaReaction);
    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("video_changed", handleVideoChanged);
      socket.off("cinema_stream_started", handleCinemaStarted);
      socket.off("cinema_stream_requested", handleCinemaRequested);
      socket.off("cinema_stream_ended", handleCinemaEnded);
      socket.off("receive_cinema_reaction", handleCinemaReaction);
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket, roomId, isSharingScreen, userId]);

  useEffect(() => {
    if (isSharingScreen && screenVideoRef.current) {
      screenVideoRef.current.muted = true;
    }
  }, [isSharingScreen, activeTab]);

  // Trigger floating emoji reaction
  const triggerEmojiReaction = (emoji) => {
    const reactionId = Date.now() + Math.random();
    const leftPos = Math.floor(Math.random() * 70) + 15;

    setFloatingReactions(prev => [...prev, { id: reactionId, emoji, leftPos }]);

    if (socket) {
      socket.emit("send_cinema_reaction", {
        roomId,
        emoji,
        senderName: user?.name || 'Partner',
        leftPos
      });
    }

    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== reactionId));
    }, 3000);
  };

  // Send In-Movie Chat Message
  const handleSendChatMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !socket) return;

    const msgData = {
      roomId,
      sender: userId,
      senderName: user?.name || 'Me',
      message: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    socket.emit("send_message", msgData);
    setCinemaMessages(prev => [...prev, msgData]);
    setChatInput('');

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      overlayChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const stopVoiceGate = () => {
    if (vadAnimFrameRef.current) {
      cancelAnimationFrame(vadAnimFrameRef.current);
      vadAnimFrameRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch (e) { }
      audioCtxRef.current = null;
    }
    setMicLevel(0);
  };

  const setupVoiceGate = (audioTrack) => {
    try {
      const rawTrack = audioTrack.getMediaStreamTrack();
      if (!rawTrack) return;

      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;

      stopVoiceGate();

      const audioCtx = new AudioContextClass();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(new MediaStream([rawTrack]));
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      let isGateOpen = false;

      const analyzeAudio = () => {
        if (!localAudioTrackRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const volumePct = Math.min(100, Math.round((avg / 128) * 100));
        setMicLevel(volumePct);

        const currentMode = voiceModeRef.current;
        const isMuted = isVoiceMicMutedRef.current;

        if (isMuted) {
          if (isGateOpen) {
            isGateOpen = false;
            localAudioTrackRef.current.setEnabled(false);
          }
        } else if (currentMode === 'auto_gate') {
          const threshold = gateThresholdRef.current;
          if (volumePct > threshold) {
            if (!isGateOpen) {
              isGateOpen = true;
              localAudioTrackRef.current.setEnabled(true);
            }
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          } else {
            if (isGateOpen && !silenceTimerRef.current) {
              silenceTimerRef.current = setTimeout(() => {
                isGateOpen = false;
                if (localAudioTrackRef.current && voiceModeRef.current === 'auto_gate') {
                  localAudioTrackRef.current.setEnabled(false);
                }
                silenceTimerRef.current = null;
              }, 400);
            }
          }
        } else if (currentMode === 'push_to_talk') {
          const pttOn = isPttPressedRef.current;
          if (pttOn !== isGateOpen) {
            isGateOpen = pttOn;
            localAudioTrackRef.current.setEnabled(pttOn);
          }
        } else if (currentMode === 'always_on') {
          if (!isGateOpen) {
            isGateOpen = true;
            localAudioTrackRef.current.setEnabled(true);
          }
        }

        vadAnimFrameRef.current = requestAnimationFrame(analyzeAudio);
      };

      vadAnimFrameRef.current = requestAnimationFrame(analyzeAudio);
    } catch (err) {
      console.error("Voice gate setup error:", err);
    }
  };

  // LIVE VOICE & CAMERA CHAT TOGGLE (AGORA RTC)
  const toggleVoiceChatWatch = async () => {
    if (isVoiceConnected) {
      try {
        stopVoiceGate();
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

        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'h264' });
        agoraVoiceClientRef.current = client;

        // Enable Audio Volume Indicator for Partner Audio Ducking & Detection
        client.enableAudioVolumeIndicator();
        client.on("volume-indicator", (volumes) => {
          const partnerSpeaking = volumes.some(v => v.uid !== uid && v.level > 12);
          setIsPartnerSpeaking(partnerSpeaking);
          if (isAudioDucking) {
            if (screenVideoRef.current) {
              screenVideoRef.current.volume = partnerSpeaking ? 0.25 : 1.0;
            }
            if (videoRef.current) {
              videoRef.current.volume = partnerSpeaking ? 0.25 : 1.0;
            }
          }
        });

        client.on('user-published', async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);
          if (mediaType === 'audio') {
            remoteUser.audioTrack?.play();
            toast.success("Partner Connected to Voice Chat! 🎙️✨");
          }
          if (mediaType === 'video') {
            remoteUserRef.current = remoteUser;
            setHasRemoteVideo(true);
            setTimeout(() => {
              remoteUser.videoTrack?.play('watch-remote-video', { fit: 'cover' });
            }, 300);
            toast.success("Partner Turned On Live Camera! 📹✨");
          }
        });

        client.on('user-left', () => {
          remoteUserRef.current = null;
          setHasRemoteVideo(false);
          toast("Partner disconnected voice/video.");
        });

        await client.join(appId, voiceChannel, data.token, uid);
        let audioTrack = null;
        try {
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
            encoderConfig: "speech_standard",
            AEC: true,
            ANS: true,
            AGC: true
          });
        } catch (micErr) {
          console.warn("Advanced mic track failed in WatchTogether, using fallback basic mic:", micErr);
          audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
        }
        localAudioTrackRef.current = audioTrack;
        await client.publish([audioTrack]);
        setupVoiceGate(audioTrack);

        setIsVoiceConnected(true);
        setIsVoiceMicMuted(false);
        toast.success("Anti-Echo Live Voice Chat Active! 🛡️🎙️🍿");
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

  const startScreenShareCinema = async () => {
    try {
      let stream = null;

      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        try {
          stream = await navigator.mediaDevices.getDisplayMedia({
            video: { cursor: "always" },
            audio: true
          });
        } catch (e1) {
          try {
            stream = await navigator.mediaDevices.getDisplayMedia({
              video: true
            });
          } catch (e2) {
            console.warn("getDisplayMedia failed on mobile:", e2);
          }
        }
      }

      if (!stream) {
        setShowMobileCinemaModal(true);
        return;
      }

      mediaStreamRef.current = stream;
      setActiveTab('screen_share');
      setIsSharingScreen(true);
      setIsReceivingStream(false);
      setIsMuted(true);

      const myPeerId = peerRef.current?.id || `loveverse_stream_${userId}`;

      if (peerRef.current && partnerId) {
        peerRef.current.call(`loveverse_stream_${partnerId}`, stream);
      }

      socket.emit("start_cinema_stream", {
        roomId,
        userName: user?.name || 'Partner',
        streamerPeerId: myPeerId
      });

      toast.success("Virtual Cinema Active! Streaming Live to Partner! 🍿✨");

      stream.getVideoTracks()[0].onended = () => {
        stopScreenShareCinema();
      };
    } catch (err) {
      console.error("Screen share error:", err);
      setShowMobileCinemaModal(true);
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

  // Fullscreen helper - Native Android/iOS Video Fullscreen + HTML5 & Viewport Overlay Fallback!
  const handleFullscreenCinema = () => {
    const vid = screenVideoRef.current;

    // 1. Try native webkitEnterFullscreen on video tag for Android/iOS mobile browsers
    if (vid && typeof vid.webkitEnterFullscreen === 'function') {
      try {
        vid.webkitEnterFullscreen();
        return;
      } catch (e) {
        console.warn("webkitEnterFullscreen fallback:", e);
      }
    }

    // 2. Try HTML5 requestFullscreen on container
    const container = (activeTab === 'youtube' ? youtubeContainerRef.current : cinemaContainerRef.current) || vid;
    if (container) {
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        if (container.requestFullscreen) {
          container.requestFullscreen().catch(() => setIsCinemaFullscreen(prev => !prev));
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        } else {
          setIsCinemaFullscreen(prev => !prev);
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
        setIsCinemaFullscreen(false);
      }
    } else {
      setIsCinemaFullscreen(prev => !prev);
    }
  };

  const toggleMuteCinema = () => {
    if (screenVideoRef.current) {
      screenVideoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

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

  // Shared Draggable Camera PIP Component
  const renderPipCameraOverlay = () => {
    // If voice is not connected OR both local & remote cameras are off -> HIDE FLOATING CONTAINER COMPLETELY!
    if (!isVoiceConnected || (!isCameraOn && !hasRemoteVideo)) {
      return null;
    }

    return (
      <div
        style={{
          transform: `translate(${pipPosition.x}px, ${pipPosition.y}px)`
        }}
        className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-2 animate-in fade-in zoom-in-95 duration-300 pointer-events-auto touch-none select-none"
      >
        <div
          onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
          onTouchStart={(e) => e.touches?.[0] && handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
          className="relative w-32 h-48 md:w-44 md:h-60 rounded-3xl overflow-hidden border-2 border-rose-500/80 shadow-2xl bg-slate-950 cursor-grab active:cursor-grabbing group hover:border-pink-400 transition-all duration-300"
        >
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-white/80 z-30 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <GripVertical size={10} />
            <span className="text-[8px] font-black uppercase tracking-widest">Drag Me</span>
          </div>

          {/* MAIN STREAM: Render Remote video if active, else Local video if active */}
          {hasRemoteVideo ? (
            <div id="watch-remote-video" className="w-full h-full object-cover" />
          ) : isCameraOn ? (
            <div id="watch-local-video" className="w-full h-full object-cover" />
          ) : null}

          {/* SECONDARY INSET STREAM: Only if BOTH remote & local videos are active! */}
          {hasRemoteVideo && isCameraOn && (
            <div className="absolute bottom-2 right-2 w-14 h-20 md:w-18 md:h-24 rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-black z-20">
              <div id="watch-local-video" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Shared Translucent In-Movie Chat Component
  const renderTranslucentChatOverlay = () => (
    isTranslucentChatOpen ? (
      <div className="absolute bottom-6 left-6 z-50 w-72 md:w-80 max-h-72 bg-black/50 backdrop-blur-xl border border-white/20 rounded-3xl p-3.5 shadow-2xl flex flex-col gap-2 text-white animate-in fade-in zoom-in-95 pointer-events-auto text-left">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="flex items-center gap-1.5">
            <MessageSquare size={14} className="text-rose-400" />
            <span className="text-[11px] font-black uppercase tracking-wider text-rose-100">Translucent Movie Chat</span>
          </div>
          <button
            onClick={() => setIsTranslucentChatOpen(false)}
            className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full font-bold transition-all"
          >
            Hide ✖
          </button>
        </div>

        <div className="flex-1 overflow-y-auto max-h-40 space-y-2 pr-1 text-xs">
          {cinemaMessages.length === 0 ? (
            <p className="text-[10px] text-gray-300 font-bold italic text-center py-4">
              Chat live over movie! Messages appear transparently 💕
            </p>
          ) : (
            cinemaMessages.map((msg, idx) => {
              const isMe = msg.sender === userId;
              return (
                <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <span className="text-[9px] text-rose-200 font-bold mb-0.5">{isMe ? 'You' : msg.senderName}</span>
                  <div className={`px-3 py-1.5 rounded-2xl text-[11px] font-bold max-w-[90%] backdrop-blur-md ${isMe ? 'bg-rose-500/80 text-white rounded-br-none' : 'bg-white/20 text-white rounded-bl-none'
                    }`}>
                    {msg.message}
                  </div>
                </div>
              );
            })
          )}
          <div ref={overlayChatBottomRef} />
        </div>

        <form onSubmit={handleSendChatMessage} className="flex gap-1.5 pt-1">
          <input
            type="text"
            placeholder="Type comment..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-300 font-bold outline-none focus:border-rose-400"
          />
          <button
            type="submit"
            className="px-3 py-1.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-black text-xs shadow-md transition-all shrink-0 flex items-center justify-center"
          >
            <Send size={12} />
          </button>
        </form>
      </div>
    ) : null
  );

  // Shared Floating Reaction FAB Button Component
  const renderReactionFab = () => (
    <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end gap-2 pointer-events-auto">
      {showEmojiFab && (
        <div className="flex items-center gap-1 bg-black/80 backdrop-blur-xl border border-white/20 p-1.5 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95">
          {QUICK_EMOJIS.map((emoji, index) => (
            <button
              key={index}
              onClick={() => {
                if (navigator.vibrate) navigator.vibrate(30);
                triggerEmojiReaction(emoji);
                setShowEmojiFab(false);
              }}
              className="w-9 h-9 hover:bg-white/20 rounded-xl text-xl flex items-center justify-center transition-all active:scale-95"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => {
          if (navigator.vibrate) navigator.vibrate(20);
          setShowEmojiFab(!showEmojiFab);
        }}
        className="w-11 h-11 bg-gradient-to-tr from-rose-500 to-pink-500 text-white rounded-full flex items-center justify-center shadow-2xl border-2 border-white/40 transition-all hover:scale-110 active:scale-95"
        title="Pop Floating Emoji Reaction 💖"
      >
        <Sparkles size={18} />
      </button>
    </div>
  );
  // Shared Fullscreen Portal Overlay Component (attaches directly to document.body)
  const renderFullscreenPortal = () => {
    if (!isCinemaFullscreen) return null;

    return ReactDOM.createPortal(
      <div className="fixed inset-0 z-[9999999] w-screen h-screen bg-black flex flex-col items-center justify-center overflow-hidden m-0 p-0 pointer-events-auto select-none" style={{ backgroundColor: '#000000' }}>
        {/* Sleek Top Glass Control Bar */}
        <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between bg-black/75 backdrop-blur-xl border border-white/20 px-4 py-2.5 rounded-full text-white shadow-2xl pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
            <span className="text-xs font-black truncate text-white">
              {isSharingScreen ? 'Virtual Cinema Stream Live! 📽️' : isReceivingStream ? `${streamerName || 'Partner'}'s Stream Live! 🍿` : 'Watch Together Fullscreen 🍿'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsTranslucentChatOpen(!isTranslucentChatOpen)}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-all text-rose-300 flex items-center justify-center"
              title="Toggle Movie Chat"
            >
              <MessageSquare size={16} />
            </button>
            <button
              onClick={handleFullscreenCinema}
              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full font-black text-xs transition-all flex items-center gap-1 shadow-md"
            >
              <X size={14} /> Exit Fullscreen
            </button>
          </div>
        </div>

        {/* ACTIVE STREAM VIDEO TAG */}
        {activeTab === 'screen_share' ? (
          <video
            ref={setScreenVideoRef}
            autoPlay
            playsInline
            webkit-playsinline="true"
            x5-playsinline="true"
            controls={isSharingScreen || isReceivingStream}
            muted={isSharingScreen}
            className="w-full h-full object-contain bg-black"
            style={{ backgroundColor: '#000000' }}
          />
        ) : activeTab === 'direct' ? (
          <video
            ref={videoRef}
            src={directMovieUrl}
            controls
            playsInline
            webkit-playsinline="true"
            className="w-full h-full object-contain bg-black"
            style={{ backgroundColor: '#000000' }}
          />
        ) : (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&playsinline=1`}
            title="Watch Together Fullscreen Video Player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-none"
          />
        )}

        {renderPipCameraOverlay()}
        {renderTranslucentChatOverlay()}
        {renderReactionFab()}

        {/* Floating Emojis Animation Container */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
          {floatingReactions.map((item) => (
            <div
              key={item.id}
              style={{ left: `${item.leftPos || 50}%` }}
              className="absolute bottom-10 text-4xl floating-emoji-item drop-shadow-lg"
            >
              {item.emoji}
            </div>
          ))}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className={`mx-auto w-full space-y-4 pb-20 animate-in fade-in duration-500 px-1 md:px-6 transition-all ${isTheaterMode ? 'max-w-none' : 'max-w-7xl'}`}>

      {/* Global CSS for PIP Camera Video Tags & Floating Reaction Animations */}
      <style>{`
        #watch-remote-video div, #watch-remote-video video, #watch-local-video div, #watch-local-video video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 1.5rem !important;
        }

        body.cinema-fullscreen-active nav,
        body.cinema-fullscreen-active .bottom-nav,
        body.cinema-fullscreen-active header,
        body.cinema-fullscreen-active footer,
        body.cinema-fullscreen-active [class*="bottom-nav"],
        body.cinema-fullscreen-active [class*="BottomNav"] {
          display: none !important;
        }

        @keyframes floatUpEmoji {
          0% {
            opacity: 1;
            transform: translateY(0) scale(0.8);
          }
          50% {
            opacity: 1;
            transform: translateY(-120px) scale(1.4);
          }
          100% {
            opacity: 0;
            transform: translateY(-240px) scale(1);
          }
        }

        .floating-emoji-item {
          animation: floatUpEmoji 2.8s ease-out forwards;
        }
      `}</style>

      {/* 1. COMPACT HEADER WITH MERGED LIVE PARTNER BADGE */}
      <div className="flex items-center justify-between gap-2 px-2 pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-gradient-to-tr from-rose-500 to-pink-500 text-white rounded-2xl flex items-center justify-center shadow-lg font-black shrink-0">
            <PlaySquare size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg md:text-2xl font-black text-gray-800">Watch Together 🍿</h3>
              <span className="px-2 py-0.5 bg-green-500/10 text-green-600 border border-green-500/20 rounded-full font-black text-[9px] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" /> LIVE WITH PARTNER
              </span>
            </div>
            <p className="text-[10px] text-gray-500 font-bold hidden sm:block">YouTube, Virtual Cinema, Direct Movies & OTT Guide</p>
          </div>
        </div>
      </div>

      {/* 2. SCROLLABLE TAB PILLS */}
      <div className="flex bg-white/80 backdrop-blur-xl p-1 rounded-2xl border border-gray-200 shadow-sm overflow-x-auto gap-1">
        <button
          onClick={() => setActiveTab('youtube')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${activeTab === 'youtube' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          🍿 YouTube
        </button>
        <button
          onClick={() => setActiveTab('screen_share')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${activeTab === 'screen_share' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          📽️ Virtual Cinema (NetMirror)
        </button>
        <button
          onClick={() => setActiveTab('direct')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${activeTab === 'direct' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          🎥 Direct Movie
        </button>
        <button
          onClick={() => setActiveTab('ott_guide')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${activeTab === 'ott_guide' ? 'bg-rose-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
        >
          🎬 OTT Guide
        </button>
      </div>

      {/* 3. PROMINENT VIDEO PLAYER (TOP FEATURE) */}
      <div className="space-y-3">
        
        {/* URL INPUT FOR YOUTUBE AND DIRECT MOVIE TABS */}
        {activeTab !== 'ott_guide' && activeTab !== 'screen_share' && (
          <form onSubmit={handleLoadVideo} className={`${glassStyle} p-2.5 flex gap-2`}>
            <div className="flex-1 flex items-center gap-2 bg-gray-50 rounded-2xl px-3 py-2 border border-gray-100">
              <LinkIcon size={16} className="text-rose-400 shrink-0" />
              <input
                type="text"
                placeholder="Paste NetMirror, YouTube, or Movie Link..."
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-xs text-gray-800 font-bold"
              />
            </div>
            <button
              type="submit"
              className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-2xl font-black text-xs shadow-md transition-all flex items-center gap-1.5 shrink-0"
            >
              <Search size={14} /> Load & Sync
            </button>
          </form>
        )}

        {/* TAB 1: YOUTUBE PLAYER */}
        {activeTab === 'youtube' && (
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest shrink-0">
                Quick Picks:
              </span>
              {PRESET_VIDEOS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(preset)}
                  className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200/60 rounded-full font-bold text-[10px] whitespace-nowrap shrink-0 transition-all"
                >
                  {preset.name}
                </button>
              ))}
            </div>

            {/* Video Player Container */}
            <div
              ref={youtubeContainerRef}
              className={`relative rounded-3xl overflow-hidden shadow-2xl bg-black border border-gray-800 transition-all ${
                isCinemaFullscreen
                  ? 'fixed inset-0 z-[99999] w-screen h-screen rounded-none border-none'
                  : (isTheaterMode ? 'h-[75vh] md:h-[85vh]' : 'h-[45vh] min-h-[250px] md:h-[60vh]')
              }`}
              style={{ backgroundColor: '#000000' }}
            >
              <iframe
                ref={iframeRef}
                src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0&playsinline=1`}
                title="Watch Together Video Player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-none rounded-3xl"
              />
              {renderPipCameraOverlay()}
              {renderTranslucentChatOverlay()}
              {renderReactionFab()}

              {/* Floating Emojis Animation Container */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
                {floatingReactions.map((item) => (
                  <div
                    key={item.id}
                    style={{ left: `${item.leftPos || 50}%` }}
                    className="absolute bottom-10 text-4xl floating-emoji-item drop-shadow-lg"
                  >
                    {item.emoji}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: VIRTUAL CINEMA SCREEN SHARE PLAYER (NETMIRROR) */}
        {activeTab === 'screen_share' && (
          <div className="bg-slate-950 p-4 space-y-4 text-center rounded-3xl text-white border border-slate-800 shadow-2xl">
            <div className="flex flex-wrap justify-between items-center gap-2 px-1">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${isSharingScreen || isReceivingStream ? 'bg-green-500 animate-ping' : 'bg-gray-400'}`} />
                <h4 className="text-xs md:text-sm font-black text-white">
                  {isSharingScreen
                    ? 'Virtual Cinema Stream Active! 📽️'
                    : isReceivingStream
                    ? `${streamerName || 'Partner'}'s Stream Live! 🍿`
                    : 'Virtual Cinema Mode'}
                </h4>
              </div>

              <div className="flex items-center gap-1.5">
                {(isSharingScreen || isReceivingStream) && (
                  <>
                    <button
                      onClick={() => setIsTranslucentChatOpen(!isTranslucentChatOpen)}
                      className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition-all flex items-center gap-1"
                      title="Toggle In-Movie Chat Overlay"
                    >
                      <MessageSquare size={14} className={isTranslucentChatOpen ? "text-rose-400" : "text-gray-300"} />
                    </button>

                    <button
                      onClick={handleFullscreenCinema}
                      className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-xl font-black text-xs transition-all flex items-center gap-1"
                    >
                      {isCinemaFullscreen ? <X size={14} /> : <Maximize2 size={14} />}
                      <span>{isCinemaFullscreen ? 'Exit' : 'Fullscreen'}</span>
                    </button>
                  </>
                )}

                {isSharingScreen ? (
                  <button
                    onClick={stopScreenShareCinema}
                    className="px-4 py-2 bg-rose-600 text-white rounded-xl font-black text-xs shadow-lg hover:bg-rose-700 transition-all flex items-center gap-1.5"
                  >
                    <StopCircle size={14} /> End Stream
                  </button>
                ) : !isReceivingStream && (
                  <button
                    onClick={startScreenShareCinema}
                    className="px-4 py-2 bg-rose-500 text-white rounded-xl font-black text-xs shadow-lg hover:bg-rose-600 transition-all flex items-center gap-1.5"
                  >
                    <Video size={14} /> Start NetMirror Screen Stream 🍿
                  </button>
                )}
              </div>
            </div>

            {/* Screen Video Container */}
            <div
              ref={cinemaContainerRef}
              className={`relative rounded-3xl overflow-hidden shadow-2xl bg-black border border-gray-800 transition-all ${
                isCinemaFullscreen
                  ? 'fixed inset-0 z-[99999] w-screen h-screen rounded-none border-none'
                  : (isTheaterMode ? 'h-[75vh] md:h-[85vh]' : 'h-[45vh] min-h-[250px] md:h-[60vh]')
              }`}
              style={{ backgroundColor: '#000000' }}
            >
              <video
                ref={setScreenVideoRef}
                autoPlay
                playsInline
                webkit-playsinline="true"
                x5-playsinline="true"
                controls={isSharingScreen || isReceivingStream}
                muted={isSharingScreen}
                className="absolute top-0 left-0 w-full h-full object-contain bg-black"
                style={{ backgroundColor: '#000000' }}
              />

              {renderPipCameraOverlay()}
              {renderTranslucentChatOverlay()}
              {renderReactionFab()}

              {/* Floating Emojis Animation Container */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
                {floatingReactions.map((item) => (
                  <div
                    key={item.id}
                    style={{ left: `${item.leftPos || 50}%` }}
                    className="absolute bottom-10 text-4xl floating-emoji-item drop-shadow-lg"
                  >
                    {item.emoji}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DIRECT MOVIE MP4 PLAYER */}
        {activeTab === 'direct' && (
          <div className="space-y-3">
            <div
              className={`relative rounded-3xl overflow-hidden shadow-2xl bg-black border border-gray-800 transition-all ${
                isCinemaFullscreen
                  ? 'fixed inset-0 z-[99999] w-screen h-screen rounded-none border-none'
                  : (isTheaterMode ? 'h-[75vh] md:h-[85vh]' : 'h-[45vh] min-h-[250px] md:h-[60vh]')
              }`}
              style={{ backgroundColor: '#000000' }}
            >
              {directMovieUrl ? (
                <video
                  ref={videoRef}
                  src={directMovieUrl}
                  controls
                  playsInline
                  webkit-playsinline="true"
                  className="w-full h-full object-contain bg-black"
                  style={{ backgroundColor: '#000000' }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-gray-400 space-y-3">
                  <Film size={48} className="text-rose-400 opacity-60" />
                  <h4 className="text-base font-black text-white">Direct Movie Player 🎥</h4>
                  <p className="text-xs max-w-md font-medium text-gray-300">
                    Paste any direct MP4 / video stream URL above to watch together live!
                  </p>
                </div>
              )}
              {renderPipCameraOverlay()}
              {renderTranslucentChatOverlay()}
              {renderReactionFab()}
            </div>
          </div>
        )}

        {/* TAB 4: OTT GUIDE */}
        {activeTab === 'ott_guide' && (
          <div className={`${glassStyle} p-6 space-y-4 text-center`}>
            <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Tv size={32} />
            </div>
            <h4 className="text-xl font-black text-gray-800">Netflix, Prime & Disney+ Hotstar Guide 🎬</h4>
            <p className="text-xs text-gray-500 font-bold max-w-md mx-auto">
              How to watch premium DRM protected OTT platforms together with 100% video sync:
            </p>
            <div className="bg-rose-50/60 p-4 rounded-2xl border border-rose-100 text-left space-y-2 max-w-lg mx-auto">
              <ol className="text-xs space-y-2 text-gray-600 font-bold list-decimal ml-4">
                <li>Install free **Teleparty extension** on Google Chrome or Edge.</li>
                <li>Open Netflix / Prime / Disney+ Hotstar and start the movie.</li>
                <li>Click Teleparty extension icon and send the sync link to your partner!</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* 4. SLIM SINGLE-ROW VOICE & CAMERA CONTROL BAR */}
      <div className="bg-slate-900/90 backdrop-blur-2xl p-2.5 md:p-3 rounded-2xl border border-slate-800 text-white shadow-xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleVoiceChatWatch}
            className={`px-3.5 py-2 rounded-xl font-black text-xs transition-all flex items-center gap-1.5 shadow-md ${
              isVoiceConnected ? 'bg-slate-800 hover:bg-black text-white' : 'bg-gradient-to-r from-rose-500 to-pink-600 text-white'
            }`}
          >
            {isVoiceConnected ? <PhoneOff size={14} /> : <Mic size={14} />}
            <span>{isVoiceConnected ? 'Disconnect' : 'Connect Voice & Cam 🎙️📹'}</span>
          </button>

          {isVoiceConnected && (
            <>
              <button
                onClick={toggleMicMuteWatch}
                className={`p-2 rounded-xl text-xs font-bold transition-all ${
                  isVoiceMicMuted ? 'bg-rose-600 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title={isVoiceMicMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isVoiceMicMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <button
                onClick={toggleCameraWatch}
                className={`p-2 rounded-xl text-xs font-bold transition-all ${
                  isCameraOn ? 'bg-emerald-500 text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                }`}
                title={isCameraOn ? "Turn Off Camera" : "Turn On Camera"}
              >
                {isCameraOn ? <Video size={16} /> : <VideoOff size={16} />}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isVoiceConnected && (
            <button
              onClick={() => setShowEchoSettings(!showEchoSettings)}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                showEchoSettings ? 'bg-emerald-400 text-slate-950 font-black' : 'bg-white/10 hover:bg-white/20 text-white'
              }`}
              title="Anti-Echo Settings ⚙️"
            >
              <ShieldCheck size={16} className={voiceMode === 'auto_gate' ? 'text-emerald-400' : 'text-amber-400'} />
              <span className="hidden sm:inline text-[11px] font-black">Echo Settings</span>
            </button>
          )}
        </div>
      </div>

      {/* EXPANDABLE ANTI-ECHO & VOICE GATE SETTINGS DRAWER */}
      {isVoiceConnected && showEchoSettings && (
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-3xl text-white space-y-3 animate-in fade-in zoom-in-95 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h5 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <ShieldCheck size={14} /> Anti-Echo Shield & Mic Mode
            </h5>
            <button
              onClick={() => setShowEchoSettings(false)}
              className="text-[10px] bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full font-bold"
            >
              Done ✖
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              onClick={() => setVoiceMode('auto_gate')}
              className={`p-2.5 rounded-2xl text-left border transition-all ${
                voiceMode === 'auto_gate' ? 'bg-emerald-500/20 border-emerald-400 text-white' : 'bg-white/5 border-white/10 text-gray-300'
              }`}
            >
              <div className="font-black text-xs text-emerald-300">Smart Voice Gate 🛡️</div>
              <div className="text-[10px] text-gray-400">Auto-mutes background noise</div>
            </button>

            <button
              onClick={() => setVoiceMode('push_to_talk')}
              className={`p-2.5 rounded-2xl text-left border transition-all ${
                voiceMode === 'push_to_talk' ? 'bg-amber-500/20 border-amber-400 text-white' : 'bg-white/5 border-white/10 text-gray-300'
              }`}
            >
              <div className="font-black text-xs text-amber-300">Push-to-Talk (PTT) 🎙️</div>
              <div className="text-[10px] text-gray-400">Hold button to speak</div>
            </button>

            <button
              onClick={() => setVoiceMode('always_on')}
              className={`p-2.5 rounded-2xl text-left border transition-all ${
                voiceMode === 'always_on' ? 'bg-rose-500/20 border-rose-400 text-white' : 'bg-white/5 border-white/10 text-gray-300'
              }`}
            >
              <div className="font-black text-xs text-rose-300">Always On Mic 🔊</div>
              <div className="text-[10px] text-gray-400">Continuous open mic</div>
            </button>
          </div>

          {/* Visual Level Bar */}
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[10px] text-gray-300 font-bold">
              <span>Mic Audio Level:</span>
              <span className={micLevel > gateThreshold ? "text-emerald-400 font-black" : "text-gray-400"}>
                {micLevel > gateThreshold ? "VOICE TRANSMITTING 🎙️" : "Gate Closed (Silent)"}
              </span>
            </div>
            <div className="relative w-full h-2.5 bg-gray-800 rounded-full overflow-hidden border border-white/10">
              <div
                style={{ width: `${micLevel}%` }}
                className={`h-full transition-all duration-75 ${micLevel > gateThreshold ? 'bg-emerald-400' : 'bg-rose-500/80'}`}
              />
              <div
                style={{ left: `${gateThreshold}%` }}
                className="absolute top-0 bottom-0 w-1 bg-yellow-300 z-10"
              />
            </div>
          </div>
        </div>
      )}

      {/* MOBILE CINEMA GUIDE MODAL */}
      {showMobileCinemaModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 max-w-md w-full text-white text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 bg-rose-500/20 text-rose-400 rounded-full flex items-center justify-center mx-auto">
              <Smartphone size={32} />
            </div>
            <h3 className="text-xl font-black">Mobile Cinema Guide 🍿</h3>
            <p className="text-xs text-gray-300 font-medium leading-relaxed">
              Android phones restrict screen tab capture. Here is how you can watch movies together on mobile:
            </p>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setShowMobileCinemaModal(false);
                  setActiveTab('youtube');
                }}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-rose-500 to-pink-600 rounded-2xl font-black text-xs text-white shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition-all"
              >
                <PlaySquare size={18} /> Play YouTube Together 🍿
              </button>

              <button
                onClick={() => {
                  setShowMobileCinemaModal(false);
                  setActiveTab('direct');
                }}
                className="w-full py-3.5 px-4 bg-white/10 hover:bg-white/20 rounded-2xl font-black text-xs text-white border border-white/20 flex items-center justify-center gap-2 transition-all"
              >
                <Film size={18} /> Direct Movie URL / MP4 🎥
              </button>
              <p className="text-[11px] text-gray-400 italic leading-relaxed pt-1">
                💡 <strong>Desktop Stream Tip:</strong> If your partner streams NetMirror from a Laptop/Desktop, your phone will automatically receive & play the live movie stream right here!
              </p>
            </div>

            <button
              onClick={() => setShowMobileCinemaModal(false)}
              className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-xs text-gray-300 mt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
      {/* FULLSCREEN PORTAL DIRECTLY ON BODY WHEN FULLSCREEN IS ACTIVE */}
      {renderFullscreenPortal()}
    </div>
  );
}

export default WatchTogether;