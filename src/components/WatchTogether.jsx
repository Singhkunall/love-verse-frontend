import React, { useState, useEffect, useRef } from 'react';
import { PlaySquare, Link as LinkIcon, Search, Sparkles, Film, AlertCircle, Tv, Monitor, ExternalLink, Globe, Play, RefreshCw, Video, StopCircle, Maximize2, Volume2, VolumeX, Minimize2, Radio, Mic, MicOff, PhoneOff, VideoOff, GripVertical, MessageSquare, Send, Heart, Flame, Smile, ThumbsUp, X, ShieldCheck, Sliders, Volume1, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import Peer from 'peerjs';
import AgoraRTC from 'agora-rtc-sdk-ng';

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

  // Draggable PIP Overlay State
  const [pipPosition, setPipPosition] = useState({ x: 0, y: 0 });
  const [isDraggingPip, setIsDraggingPip] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });

  const screenVideoRef = useRef(null);
  const cinemaContainerRef = useRef(null);
  const youtubeContainerRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const peerRef = useRef(null);
  const agoraVoiceClientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const remoteUserRef = useRef(null);
  const chatBottomRef = useRef(null);
  const overlayChatBottomRef = useRef(null);

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
      call.answer();
      call.on('stream', (remoteStream) => {
        setActiveTab('screen_share');
        setIsReceivingStream(true);
        setIsSharingScreen(false);
        setIsMuted(false);

        setTimeout(() => {
          if (screenVideoRef.current) {
            screenVideoRef.current.srcObject = remoteStream;
            screenVideoRef.current.muted = false;
            screenVideoRef.current.play().then(() => {
              if (screenVideoRef.current.buffered && screenVideoRef.current.buffered.length > 0) {
                const liveEnd = screenVideoRef.current.buffered.end(screenVideoRef.current.buffered.length - 1);
                screenVideoRef.current.currentTime = liveEnd - 0.05;
              }
            }).catch(e => console.error("Auto-play error:", e));
          }
        }, 200);

        toast.success("Partner's NetMirror Stream Connected Live! 🍿✨", { duration: 5000 });
      });
    });

    return () => {
      peer.destroy();
    };
  }, [userId]);

  // Low Latency Live Edge Buffer Sync (Only for receiver, NOT for local streamer!)
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
      toast(`${data.userName || 'Partner'} started streaming NetMirror! 🍿`, { icon: '📽️', duration: 5000 });
    };

    const handleCinemaEnded = () => {
      setIsReceivingStream(false);
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
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        overlayChatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    socket.on("video_changed", handleVideoChanged);
    socket.on("cinema_stream_started", handleCinemaStarted);
    socket.on("cinema_stream_ended", handleCinemaEnded);
    socket.on("receive_cinema_reaction", handleCinemaReaction);
    socket.on("receive_message", handleReceiveMessage);

    return () => {
      socket.off("video_changed", handleVideoChanged);
      socket.off("cinema_stream_started", handleCinemaStarted);
      socket.off("cinema_stream_ended", handleCinemaEnded);
      socket.off("receive_cinema_reaction", handleCinemaReaction);
      socket.off("receive_message", handleReceiveMessage);
    };
  }, [socket, roomId]);

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
      try { audioCtxRef.current.close(); } catch(e) {}
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
        const audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          encoderConfig: "speech_standard",
          AEC: true,
          ANS: true,
          AGC: true
        });
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
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: true
      });

      mediaStreamRef.current = stream;
      setActiveTab('screen_share');
      setIsSharingScreen(true);
      setIsReceivingStream(false);
      setIsMuted(true);

      if (peerRef.current && partnerId) {
        peerRef.current.call(`loveverse_stream_${partnerId}`, stream);
      }

      socket.emit("start_cinema_stream", {
        roomId,
        userName: user.name || 'Partner'
      });

      setTimeout(() => {
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
          screenVideoRef.current.muted = true;
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

  // Fullscreen helper - True Native Browser Fullscreen on the parent Cinema Container!
  const handleFullscreenCinema = () => {
    const elem = (activeTab === 'youtube' ? youtubeContainerRef.current : cinemaContainerRef.current) || screenVideoRef.current;
    if (!elem) return;

    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        elem.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
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
  const renderPipCameraOverlay = () => (
    isVoiceConnected && (isCameraOn || hasRemoteVideo) && (
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
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-2.5 py-0.5 rounded-full text-white/80 z-30 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <GripVertical size={10} />
            <span className="text-[8px] font-black uppercase tracking-widest">Drag Me</span>
          </div>

          {hasRemoteVideo ? (
            <div id="watch-remote-video" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center text-slate-400">
              <VideoOff size={24} className="mb-2 text-slate-500" />
              <p className="text-[10px] font-bold">Partner's camera off</p>
            </div>
          )}

          {isCameraOn && (
            <div className="absolute bottom-2 right-2 w-14 h-20 md:w-18 md:h-24 rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-black z-20">
              <div id="watch-local-video" className="w-full h-full object-cover" />
            </div>
          )}
        </div>
      </div>
    )
  );

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
                  <div className={`px-3 py-1.5 rounded-2xl text-[11px] font-bold max-w-[90%] backdrop-blur-md ${
                    isMe ? 'bg-rose-500/80 text-white rounded-br-none' : 'bg-white/20 text-white rounded-bl-none'
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
    ) : (
      <button
        onClick={() => setIsTranslucentChatOpen(true)}
        className="absolute bottom-6 left-6 z-50 px-3.5 py-2 bg-black/60 backdrop-blur-xl border border-white/20 text-white rounded-2xl font-black text-xs shadow-xl hover:bg-black/80 transition-all flex items-center gap-1.5 pointer-events-auto"
      >
        <MessageSquare size={14} className="text-rose-400" />
        <span>Open Movie Chat 💬</span>
      </button>
    )
  );

  return (
    <div className={`mx-auto w-full space-y-6 pb-20 animate-in fade-in duration-500 px-2 md:px-6 transition-all ${
      isTheaterMode ? 'max-w-none' : 'max-w-7xl'
    }`}>
      
      {/* Global CSS for PIP Camera Video Tags & Floating Reaction Animations */}
      <style>{`
        #watch-remote-video div, #watch-remote-video video, #watch-local-video div, #watch-local-video video {
          width: 100% !important;
          height: 100% !important;
          object-fit: cover !important;
          border-radius: 1.5rem !important;
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

      {/* FULL-WIDTH 2-COLUMN CINEMA GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* LEFT COLUMN: MAIN MOVIE PLAYER & VOICE/VIDEO BAR (8 COLS) */}
        <div className="lg:col-span-8 space-y-6">

          {/* LIVE VOICE & CAMERA CHAT FLOATING BAR WITH ANTI-ECHO SHIELD */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 p-3.5 rounded-3xl text-white shadow-xl gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center font-black">
                  <Radio size={20} className={isVoiceConnected ? "animate-pulse text-green-300" : "text-white"} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black uppercase tracking-wider">
                      {isVoiceConnected ? 'Live Voice & Video Chat Active 🎙️📹' : 'Movie Voice & Camera Chat'}
                    </h4>
                    <span className="px-2 py-0.5 bg-emerald-400/30 text-emerald-200 border border-emerald-300/40 rounded-full text-[9px] font-black flex items-center gap-1">
                      <ShieldCheck size={10} /> Anti-Echo Active
                    </span>
                  </div>
                  <p className="text-[10px] text-rose-100 font-bold">
                    {isVoiceConnected ? 'Talk & see live facial reactions with zero speaker echo!' : 'Connect mic & camera to talk & see each other live during movie'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setShowEchoSettings(!showEchoSettings)}
                  className={`p-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                    showEchoSettings
                      ? 'bg-emerald-400 text-slate-950 font-black shadow-lg scale-105'
                      : 'bg-white/20 hover:bg-white/30 text-white'
                  }`}
                  title="Configure Anti-Echo Shield, Push-To-Talk & Voice Gate Sensitivity"
                >
                  <ShieldCheck size={16} className={voiceMode === 'auto_gate' ? 'text-emerald-300' : 'text-amber-300'} />
                  <span>
                    {voiceMode === 'auto_gate' ? 'Echo Shield: Auto 🛡️' : voiceMode === 'push_to_talk' ? 'Echo Shield: PTT 🎙️' : 'Echo Shield ⚙️'}
                  </span>
                </button>

                {isVoiceConnected && (
                  <>
                    {voiceMode === 'push_to_talk' && (
                      <button
                        onMouseDown={() => {
                          setIsPttPressed(true);
                          if (localAudioTrackRef.current && !isVoiceMicMuted) {
                            localAudioTrackRef.current.setEnabled(true);
                          }
                        }}
                        onMouseUp={() => {
                          setIsPttPressed(false);
                          if (localAudioTrackRef.current) {
                            localAudioTrackRef.current.setEnabled(false);
                          }
                        }}
                        onTouchStart={() => {
                          setIsPttPressed(true);
                          if (localAudioTrackRef.current && !isVoiceMicMuted) {
                            localAudioTrackRef.current.setEnabled(true);
                          }
                        }}
                        onTouchEnd={() => {
                          setIsPttPressed(false);
                          if (localAudioTrackRef.current) {
                            localAudioTrackRef.current.setEnabled(false);
                          }
                        }}
                        className={`px-3.5 py-2.5 rounded-xl font-black text-xs transition-all shadow-lg flex items-center gap-1.5 select-none ${
                          isPttPressed ? 'bg-emerald-400 text-slate-950 scale-105 ring-4 ring-emerald-300' : 'bg-amber-400 text-gray-900 hover:bg-amber-300'
                        }`}
                      >
                        <Mic size={14} />
                        <span>{isPttPressed ? 'TALKING LIVE 🎙️' : 'HOLD TO TALK (SPACE)'}</span>
                      </button>
                    )}

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

            {/* EXPANDABLE ANTI-ECHO SHIELD CONTROL PANEL */}
            {showEchoSettings && (
              <div className="bg-slate-900/95 backdrop-blur-xl border border-rose-500/30 rounded-3xl p-4 text-white shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-400" />
                    <h5 className="text-sm font-black uppercase tracking-wider text-emerald-300">
                      Anti-Echo Shield & Mic Filter Settings 🛡️
                    </h5>
                  </div>
                  <button
                    onClick={() => setShowEchoSettings(false)}
                    className="text-xs bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-full font-bold transition-all"
                  >
                    ✖ Close
                  </button>
                </div>

                {/* Mode Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => setVoiceMode('auto_gate')}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      voiceMode === 'auto_gate'
                        ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-lg'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs text-emerald-300">
                      <ShieldCheck size={14} /> Smart Voice Gate 🛡️
                    </div>
                    <p className="text-[10px] text-gray-300 mt-1 font-medium leading-relaxed">
                      Auto-mutes mic when movie plays. Unmutes instantly when you speak! (Recommended)
                    </p>
                  </button>

                  <button
                    onClick={() => setVoiceMode('push_to_talk')}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      voiceMode === 'push_to_talk'
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-lg'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs text-amber-300">
                      <Mic size={14} /> Push-to-Talk (PTT) 🎙️
                    </div>
                    <p className="text-[10px] text-gray-300 mt-1 font-medium leading-relaxed">
                      Mic stays muted until you hold Space key or Hold-to-Talk button. 100% Zero Echo!
                    </p>
                  </button>

                  <button
                    onClick={() => setVoiceMode('always_on')}
                    className={`p-3 rounded-2xl text-left border transition-all ${
                      voiceMode === 'always_on'
                        ? 'bg-rose-500/20 border-rose-400 text-white shadow-lg'
                        : 'bg-white/5 border-white/10 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-black text-xs text-rose-300">
                      <Radio size={14} /> Always On Mic 🔊
                    </div>
                    <p className="text-[10px] text-gray-300 mt-1 font-medium leading-relaxed">
                      Standard mic mode with Chrome AEC/ANS active. Best used with earphones!
                    </p>
                  </button>
                </div>

                {/* Mic Sensitivity Meter & Threshold Slider */}
                {isVoiceConnected && (
                  <div className="space-y-2 bg-black/40 p-3.5 rounded-2xl border border-white/10">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="flex items-center gap-1.5 text-gray-200">
                        <Sliders size={14} className="text-emerald-400" /> Live Mic Input Volume:
                      </span>
                      <span className={micLevel > gateThreshold ? "text-emerald-400 font-black" : "text-gray-400 font-bold"}>
                        {micLevel > gateThreshold ? "Speaking 🗣️" : "Gate Suppressed 🛡️"} ({micLevel}%)
                      </span>
                    </div>

                    {/* Visual Level Bar */}
                    <div className="relative w-full h-3 bg-gray-800 rounded-full overflow-hidden border border-white/10">
                      <div
                        style={{ width: `${micLevel}%` }}
                        className={`h-full transition-all duration-75 ${
                          micLevel > gateThreshold ? 'bg-emerald-400' : 'bg-rose-500/80'
                        }`}
                      />
                      {/* Threshold Marker */}
                      <div
                        style={{ left: `${gateThreshold}%` }}
                        className="absolute top-0 bottom-0 w-1 bg-yellow-300 z-10 shadow-md"
                        title={`Gate Threshold: ${gateThreshold}%`}
                      />
                    </div>

                    {voiceMode === 'auto_gate' && (
                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-gray-300 font-medium">Mic Gate Cutoff Sensitivity:</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="5"
                            max="40"
                            value={gateThreshold}
                            onChange={(e) => setGateThreshold(Number(e.target.value))}
                            className="w-32 accent-emerald-400 cursor-pointer"
                          />
                          <span className="font-mono font-bold text-emerald-300 w-8">{gateThreshold}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Audio Ducking & Hindi/English Tip */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 border-t border-white/10 text-xs">
                  <label className="flex items-center gap-2 font-bold text-gray-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAudioDucking}
                      onChange={(e) => setIsAudioDucking(e.target.checked)}
                      className="accent-rose-500 rounded"
                    />
                    <span>🍿 Auto-Duck Movie Volume when partner speaks</span>
                  </label>

                  <div className="text-[11px] text-amber-300 italic font-medium flex items-center gap-1">
                    <Info size={12} className="shrink-0" />
                    <span>Earphones / Headphones use karne se 100% studio clear voice milti hai! 🎧</span>
                  </div>
                </div>
              </div>
            )}

            {isVoiceConnected && !showEchoSettings && (
              <div className="px-4 py-2 bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-2xl flex flex-wrap items-center justify-between text-[11px] font-bold text-gray-300 gap-2 animate-in fade-in">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-emerald-400" />
                  <span>
                    Anti-Echo Mode: <strong className="text-emerald-300 uppercase">{voiceMode.replace('_', ' ')}</strong>
                  </span>
                  {isPartnerSpeaking && (
                    <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-[10px] animate-pulse">
                      Partner Speaking 🗣️ (Movie Ducked bin)
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setShowEchoSettings(true)}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 underline font-black"
                >
                  Adjust Anti-Echo Gate Settings ⚙️
                </button>
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
                <div
                  ref={youtubeContainerRef}
                  className="relative pt-[56.25%] rounded-3xl overflow-hidden shadow-2xl bg-black border border-gray-900"
                >
                  <iframe
                    ref={iframeRef}
                    src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&enablejsapi=1&rel=0`}
                    title="Watch Together YouTube Player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full border-0"
                  />

                  {/* FLOATING EMOJI ANIMATION OVERLAY */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
                    {floatingReactions.map(r => (
                      <div
                        key={r.id}
                        style={{ left: `${r.leftPos}%` }}
                        className="absolute bottom-4 text-4xl md:text-5xl floating-emoji-item"
                      >
                        {r.emoji}
                      </div>
                    ))}
                  </div>

                  {/* TRANSLUCENT IN-MOVIE CHAT OVERLAY */}
                  {renderTranslucentChatOverlay()}

                  {/* DRAGGABLE PIP CAMERA OVERLAY */}
                  {renderPipCameraOverlay()}
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
                        onClick={() => setIsTranslucentChatOpen(!isTranslucentChatOpen)}
                        className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold text-xs transition-all flex items-center gap-1"
                        title="Toggle In-Movie Chat Overlay"
                      >
                        <MessageSquare size={16} className={isTranslucentChatOpen ? "text-rose-500" : "text-gray-500"} />
                      </button>

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
                        {isCinemaFullscreen ? <X size={14} /> : <Maximize2 size={14} />}
                        <span>{isCinemaFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
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

                {/* FLOATING EMOJI ANIMATION OVERLAY */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
                  {floatingReactions.map(r => (
                    <div
                      key={r.id}
                      style={{ left: `${r.leftPos}%` }}
                      className="absolute bottom-4 text-4xl md:text-5xl floating-emoji-item"
                    >
                      {r.emoji}
                    </div>
                  ))}
                </div>

                {/* TRANSLUCENT FLOATING IN-MOVIE CHAT OVERLAY */}
                {renderTranslucentChatOverlay()}

                {/* DRAGGABLE PIP LIVE CAMERA OVERLAY */}
                {renderPipCameraOverlay()}

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
                </div>

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
                </div>
              </div>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: INTERACTIVE CINEMA SIDEBAR (4 COLS) */}
        <div className="lg:col-span-4 space-y-6">

          {/* PARTNER PRESENCE BADGE */}
          <div className={`${glassStyle} p-5 flex items-center justify-between`}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-tr from-rose-500 to-pink-500 text-white rounded-2xl flex items-center justify-center font-black shadow-md">
                  🍿
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full" />
              </div>
              <div>
                <h5 className="text-xs font-black text-gray-800 uppercase tracking-wider">Partner Status</h5>
                <p className="text-[11px] text-gray-500 font-bold">Watching Live in Room 💕</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full font-black text-[10px]">
              LIVE
            </span>
          </div>

          {/* LIVE EMOJI REACTIONS BAR */}
          <div className={`${glassStyle} p-5 space-y-3`}>
            <div className="flex items-center justify-between">
              <h5 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-rose-500" /> Floating Movie Reactions
              </h5>
              <span className="text-[9px] font-bold text-gray-400">Click to Pop</span>
            </div>

            <div className="grid grid-cols-6 gap-2 pt-1">
              {QUICK_EMOJIS.map((emoji, index) => (
                <button
                  key={index}
                  onClick={() => triggerEmojiReaction(emoji)}
                  className="h-11 bg-rose-50/70 hover:bg-rose-100 border border-rose-100 rounded-2xl text-2xl flex items-center justify-center hover:scale-125 transition-all shadow-sm active:scale-95"
                  title={`Send ${emoji} reaction!`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* IN-MOVIE COUPLE SIDEBAR CHAT */}
          <div className={`${glassStyle} p-5 space-y-4 flex flex-col h-[480px]`}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-rose-500" />
                <h5 className="text-xs font-black text-gray-800 uppercase tracking-wider">In-Movie Live Chat</h5>
              </div>
              <span className="text-[10px] font-bold text-gray-400">Syncs Live</span>
            </div>

            {/* Chat Messages List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {cinemaMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-gray-400 space-y-2">
                  <Film size={32} className="text-rose-300 opacity-60" />
                  <p className="text-xs font-bold italic">No messages yet!</p>
                  <p className="text-[10px]">Type a message below to chat while watching movies!</p>
                </div>
              ) : (
                cinemaMessages.map((msg, idx) => {
                  const isMe = msg.sender === userId;
                  return (
                    <div
                      key={idx}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} animate-in fade-in duration-300`}
                    >
                      <span className="text-[9px] font-bold text-gray-400 mb-0.5">
                        {isMe ? 'You' : msg.senderName || 'Partner'} • {msg.time}
                      </span>
                      <div
                        className={`px-3.5 py-2 rounded-2xl text-xs font-bold max-w-[85%] leading-relaxed shadow-sm ${
                          isMe
                            ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none border border-gray-200'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Chat Input Form */}
            <form onSubmit={handleSendChatMessage} className="pt-2 flex gap-2 border-t border-gray-100">
              <input
                type="text"
                placeholder="Comment on movie..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-gray-800 outline-none focus:border-rose-400 transition-colors"
              />
              <button
                type="submit"
                className="w-10 h-10 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl flex items-center justify-center shadow-md hover:scale-105 transition-all shrink-0"
              >
                <Send size={14} />
              </button>
            </form>
          </div>

        </div>

      </div>
    </div>
  );
}

export default WatchTogether;