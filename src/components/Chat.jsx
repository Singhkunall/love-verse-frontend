import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Send, CheckCheck, Smile, Phone, Video, MoreVertical, Plus, Loader2, PhoneOff, ListTodo, Mic, MicOff, Play, Pause, VideoOff, Volume2, Sparkles, X, Image as ImageIcon, Film, MessageSquare, WifiOff, SignalHigh, SignalMedium, SignalLow } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import AgoraRTC from 'agora-rtc-sdk-ng';

// Disable telemetry & stats collector to prevent AdBlocker ERR_BLOCKED_BY_CLIENT console spam
AgoraRTC.disableLogUpload();
AgoraRTC.setLogLevel(4);
import toast, { Toaster } from 'react-hot-toast';
import Routine from './Routine';
import { mobileService } from '../utils/mobileService';

const API_URL = import.meta.env.VITE_API_URL || 'https://love-verse-backend.onrender.com';
const socket = io.connect(API_URL);

// How long an outgoing call rings before we auto-cancel it (ms)
const CALL_RING_TIMEOUT = 30000;

function Chat({ user }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [playingId, setPlayingId] = useState(null);

  // --- Call state machine ---
  // 'idle' | 'ringing-out' (we called, waiting for answer) | 'ringing-in' (incoming) | 'connected'
  const [callStatus, setCallStatus] = useState('idle');
  const [callType, setCallType] = useState("video");
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [reconnecting, setReconnecting] = useState(false);
  const [networkQuality, setNetworkQuality] = useState(0); // 0=unknown 1..6 agora scale (1 best)

  const [showRoutine, setShowRoutine] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeReactionMsg, setActiveReactionMsg] = useState(null);
  const [isDisappearingMode, setIsDisappearingMode] = useState(false);

  const scrollRef = useRef();
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const callTimerRef = useRef(null);
  const ringTimeoutRef = useRef(null);
  const audioRefs = useRef({});
  const agoraClientRef = useRef(null);
  const localTracksRef = useRef({ audio: null, video: null });
  const ringtoneRef = useRef(null);

  const userId = user._id || user.id;
  const partnerId = user.partnerId?._id || user.partnerId;
  const roomId = [userId, partnerId].sort().join("_");

  const partnerName = (typeof user?.partnerId === 'object' && user.partnerId?.name)
    || user?.partnerName
    || (user?.partnerEmail ? user.partnerEmail.split('@')[0] : "Partner");

  const partnerAvatar = (typeof user?.partnerId === 'object' && user.partnerId?.avatar) || user?.partnerAvatar;

  // Agora client initialization
  useEffect(() => {
    if (!userId) return;
    socket.emit("setup", userId);

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'h264' });
    agoraClientRef.current = client;

    client.on('user-published', async (remoteUser, mediaType) => {
      await client.subscribe(remoteUser, mediaType);
      if (mediaType === 'audio') {
        remoteUser.audioTrack?.play();
      }
      if (mediaType === 'video') {
        setTimeout(() => {
          remoteUser.videoTrack?.play('remote-video', { fit: 'cover' });
        }, 300);
      }
    });

    client.on('user-left', () => {
      toast.error("Partner disconnected call.");
      cleanupCall();
    });

    // --- Reliability: surface reconnect state instead of silently hanging ---
    client.on('connection-state-change', (curState, _prevState, reason) => {
      if (curState === 'RECONNECTING') {
        setReconnecting(true);
      } else if (curState === 'CONNECTED') {
        setReconnecting(false);
      } else if (curState === 'DISCONNECTED' && reason !== 'LEAVE') {
        // Unexpected drop (not us leaving on purpose)
        toast.error("Call connection lost.");
        cleanupCall();
      }
    });

    // --- Reliability: live network quality (1 = excellent ... 6 = down) ---
    client.on('network-quality', (stats) => {
      setNetworkQuality(stats.downlinkNetworkQuality || 0);
    });

    return () => {
      client.leave();
    };
  }, [userId]);

  // Socket listeners for call signals
  useEffect(() => {
    const handleSignal = (data) => {
      setCallType(data.type);
      setCallStatus('ringing-in');
      playRingtone();
      mobileService.sendNotification(
        `Incoming ${data.type === 'video' ? 'Video' : 'Audio'} Call 📞`,
        `${partnerName} is calling you! Tap to answer.`,
        data.type === 'video' ? '📹' : '📞'
      );
      toast(`Incoming ${data.type} call from partner!`, { duration: 5000 });
    };

    // Partner accepted our outgoing call -> flip from ringing-out to connected
    const handleAcceptedSignal = () => {
      clearRingTimeout();
      setCallStatus('connected');
      startCallTimer();
    };

    const handleEndSignal = () => {
      toast("Call ended.");
      cleanupCall();
    };

    // Partner declined before we timed out
    const handleDeclinedSignal = () => {
      toast.error("Call declined.");
      cleanupCall();
    };

    socket.on("incoming_call_signal", handleSignal);
    socket.on("call_accepted_signal", handleAcceptedSignal);
    socket.on("call_ended_signal", handleEndSignal);
    socket.on("call_declined_signal", handleDeclinedSignal);

    return () => {
      socket.off("incoming_call_signal", handleSignal);
      socket.off("call_accepted_signal", handleAcceptedSignal);
      socket.off("call_ended_signal", handleEndSignal);
      socket.off("call_declined_signal", handleDeclinedSignal);
    };
  }, [partnerName]);

  // Voice note listener
  useEffect(() => {
    const handleVoiceNote = (data) => {
      setMessageList(prev => [...prev, { ...data, isVoiceNote: true }]);
      mobileService.sendNotification(
        `Voice Note from ${data.senderName || partnerName}`,
        'Sent a new voice note 🎙️',
        '🎙️'
      );
      toast(`${data.senderName || partnerName} sent a Voice Note!`);
    };
    socket.on("receive_voice_note", handleVoiceNote);
    return () => socket.off("receive_voice_note", handleVoiceNote);
  }, [partnerName]);

  // --- Ringtone helpers (simple WebAudio beep loop so no asset is required) ---
  const playRingtone = () => {
    try {
      stopRingtone();
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const beep = () => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 720;
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      };
      beep();
      const interval = setInterval(beep, 1500);
      ringtoneRef.current = { ctx, interval };
    } catch (e) {
      // Non-fatal — ringtone is a nice-to-have
    }
  };

  const stopRingtone = () => {
    if (ringtoneRef.current) {
      clearInterval(ringtoneRef.current.interval);
      ringtoneRef.current.ctx?.close?.();
      ringtoneRef.current = null;
    }
  };

  const clearRingTimeout = () => {
    if (ringTimeoutRef.current) {
      clearTimeout(ringTimeoutRef.current);
      ringTimeoutRef.current = null;
    }
  };

  const startCallTimer = () => {
    setCallDuration(0);
    if (callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const cleanupCall = async () => {
    try {
      stopRingtone();
      clearRingTimeout();
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      localTracksRef.current.audio?.stop();
      localTracksRef.current.audio?.close();
      localTracksRef.current.video?.stop();
      localTracksRef.current.video?.close();
      localTracksRef.current = { audio: null, video: null };
      await agoraClientRef.current?.leave();
    } catch (err) {
      console.error("Cleanup error:", err);
    }
    setCallStatus('idle');
    setIsMicMuted(false);
    setIsVideoMuted(false);
    setCallDuration(0);
    setReconnecting(false);
    setNetworkQuality(0);
  };

  const fetchChatHistory = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/chat/history/${roomId}`);
      setMessageList(res.data);
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  useEffect(() => {
    if (roomId && partnerId) {
      socket.emit("join_chat", roomId);
      fetchChatHistory();
    }
  }, [roomId, partnerId]);

  useEffect(() => {
    const handleReceive = (data) => {
      if (data.sender !== userId) {
        setMessageList(list => [...list, data]);
        const bodyText = data.isImage ? 'Sent a photo 📸' : data.isVideo ? 'Sent a video 🎬' : (data.message || 'New message');
        mobileService.sendNotification(
          `New Message from ${data.senderName || partnerName}`,
          bodyText,
          '💬'
        );
      }
    };
    const handleTyping = (data) => {
      if (data.userId !== userId) setIsTyping(data.typing);
    };
    const handleReaction = (data) => {
      setMessageList(prev => prev.map((msg, idx) => {
        if (idx === data.msgIndex) {
          const reactions = msg.reactions || [];
          return { ...msg, reactions: [...reactions.filter(r => r.userId !== data.userId), { emoji: data.emoji, userId: data.userId }] };
        }
        return msg;
      }));
    };
    socket.on("receive_message", handleReceive);
    socket.on("display_typing", handleTyping);
    socket.on("receive_msg_reaction", handleReaction);
    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("display_typing", handleTyping);
      socket.off("receive_msg_reaction", handleReaction);
    };
  }, [userId, partnerName]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageList, isTyping]);

  // --- START CALL FUNCTION (caller side) ---
  const startCall = async (isVideo) => {
    setCallType(isVideo ? "video" : "audio");
    setCallStatus('ringing-out');
    try {
      const appId = import.meta.env.VITE_AGORA_APP_ID;
      if (!appId) {
        toast.error("Voice/Video chat not configured.");
        setCallStatus('idle');
        return;
      }
      const uid = Math.floor(Math.random() * 100000);

      let token = null;
      try {
        const res = await axios.post(`${API_URL}/api/agora/token`, {
          channelName: roomId, uid
        });
        token = res.data.token;
      } catch (err) {
        console.warn("Token fetch failed, trying without token:", err);
      }

      await agoraClientRef.current.join(appId, roomId, token, uid);

      let audioTrack = null;
      try {
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true, AGC: true });
      } catch (micErr) {
        console.warn("Advanced mic track failed, using fallback:", micErr);
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      }
      localTracksRef.current.audio = audioTrack;

      let videoTrack = null;
      if (isVideo) {
        videoTrack = await AgoraRTC.createCameraVideoTrack();
        localTracksRef.current.video = videoTrack;
        setTimeout(() => { videoTrack.play('local-video', { fit: 'cover' }); }, 300);
      }

      const tracksToPublish = isVideo ? [audioTrack, videoTrack] : [audioTrack];
      await agoraClientRef.current.publish(tracksToPublish);

      socket.emit("send_call_signal", {
        to: partnerId,
        from: userId,
        type: isVideo ? "video" : "audio",
      });

      // Reliability: don't ring forever — auto-cancel if nobody answers
      ringTimeoutRef.current = setTimeout(() => {
        toast.error("No answer.");
        socket.emit("end_call_signal", { to: partnerId });
        cleanupCall();
      }, CALL_RING_TIMEOUT);

    } catch (err) {
      console.error("Call error:", err);
      toast.error("Could not start call. Check mic & camera permissions!");
      setCallStatus('idle');
    }
  };

  // --- ANSWER CALL FUNCTION (receiver side) ---
  const answerCall = async () => {
    stopRingtone();
    setCallStatus('connected');
    try {
      const appId = import.meta.env.VITE_AGORA_APP_ID;
      if (!appId) {
        toast.error("Voice/Video chat not configured.");
        setCallStatus('idle');
        return;
      }
      const uid = Math.floor(Math.random() * 100000);

      let token = null;
      try {
        const res = await axios.post(`${API_URL}/api/agora/token`, {
          channelName: roomId, uid
        });
        token = res.data.token;
      } catch (err) {
        console.warn("Token fetch failed in answer, trying without:", err);
      }

      await agoraClientRef.current.join(appId, roomId, token, uid);

      let audioTrack = null;
      try {
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack({ AEC: true, ANS: true, AGC: true });
      } catch (micErr) {
        console.warn("Advanced mic track failed in answerCall, using fallback:", micErr);
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      }
      localTracksRef.current.audio = audioTrack;

      let videoTrack = null;
      if (callType === 'video') {
        videoTrack = await AgoraRTC.createCameraVideoTrack();
        localTracksRef.current.video = videoTrack;
        setTimeout(() => { videoTrack.play('local-video', { fit: 'cover' }); }, 300);
      }

      const tracksToPublish = callType === 'video' ? [audioTrack, videoTrack] : [audioTrack];
      await agoraClientRef.current.publish(tracksToPublish);

      // Let the caller know we picked up — this is what flips their "ringing-out" UI to "connected"
      socket.emit("call_accepted_signal", { to: partnerId });
      startCallTimer();

    } catch (err) {
      console.error("Answer error:", err);
      toast.error("Could not answer call.");
      setCallStatus('idle');
    }
  };

  // Decline an incoming call before answering — tell the caller so their screen doesn't hang
  const declineCall = () => {
    stopRingtone();
    socket.emit("call_declined_signal", { to: partnerId });
    cleanupCall();
  };

  const endCall = () => {
    socket.emit("end_call_signal", { to: partnerId });
    cleanupCall();
  };

  const toggleMic = () => {
    if (localTracksRef.current.audio) {
      const currentMuted = isMicMuted;
      localTracksRef.current.audio.setEnabled(currentMuted);
      setIsMicMuted(!currentMuted);
      toast.success(!currentMuted ? "Microphone Muted" : "Microphone Active");
    }
  };

  const toggleVideo = () => {
    if (localTracksRef.current.video) {
      const currentMuted = isVideoMuted;
      localTracksRef.current.video.setEnabled(currentMuted);
      setIsVideoMuted(!currentMuted);
      toast.success(!currentMuted ? "Camera Turned Off" : "Camera Active");
    }
  };

  // Voice note functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(t => t.stop());
        await uploadAndSendVoiceNote(blob);
      };
      mediaRecorderRef.current.start();
      setRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 60) { stopRecording(); return prev; }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      toast.error("Mic access denied!");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const uploadAndSendVoiceNote = async (blob) => {
    setSendingVoice(true);
    try {
      const formData = new FormData();
      formData.append('voice', blob, 'voicenote.webm');
      formData.append('sender', userId);
      formData.append('senderName', user.name);

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/voice-notes/upload`, formData);
      const voiceUrl = res.data.audioUrl;

      const messageData = {
        room: roomId,
        sender: userId,
        senderName: user.name,
        message: voiceUrl,
        isVoiceNote: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      socket.emit("send_message", messageData);
      socket.emit("send_voice_note", { roomId, ...messageData });
      setMessageList(prev => [...prev, messageData]);
      toast.success("Voice note sent!");
    } catch (err) {
      toast.error("Voice note fail hua!");
    } finally {
      setSendingVoice(false);
    }
  };

  const handleReactToMsg = (msgIndex, emoji) => {
    setMessageList(prev => prev.map((msg, idx) => {
      if (idx === msgIndex) {
        const reactions = msg.reactions || [];
        return { ...msg, reactions: [...reactions.filter(r => r.userId !== userId), { emoji, userId }] };
      }
      return msg;
    }));
    socket.emit("send_msg_reaction", { room: roomId, msgIndex, emoji, userId });
    setActiveReactionMsg(null);
  };

  const sendMessage = async () => {
    if (currentMessage.trim() !== "") {
      const messageData = {
        room: roomId,
        sender: userId,
        senderName: user.name,
        message: currentMessage,
        replyTo: replyingTo ? { senderName: replyingTo.senderName, text: replyingTo.message } : null,
        isDisappearing: isDisappearingMode,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      await socket.emit("send_message", messageData);
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage("");
      setReplyingTo(null);
      setShowEmoji(false);
      socket.emit("typing", { room: roomId, userId, typing: false });
    }
  };

  const handleMediaUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const isVideo = file.type.startsWith('video/');

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        let base64Data = reader.result;
        if (!isVideo) {
          base64Data = await compressImage(base64Data);
        }
        const res = await axios.post(`${API_URL}/api/auth/upload-media`, {
          media: base64Data,
          resourceType: isVideo ? 'video' : 'image'
        });

        const messageData = {
          room: roomId,
          sender: userId,
          senderName: user.name,
          message: res.data.url,
          isImage: !isVideo,
          isVideo: isVideo,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        await socket.emit("send_message", messageData);
        setMessageList((list) => [...list, messageData]);
        toast.success(isVideo ? "Video Bhej Di!" : "Photo Bhej Di!");
      } catch (err) {
        console.error("Media upload error:", err);
        toast.error("Media Upload Fail Hua!");
      } finally {
        setIsUploading(false);
      }
    };
    reader.onerror = () => {
      setIsUploading(false);
      toast.error("File read error!");
    };
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins}:${remainingSecs < 10 ? '0' : ''}${remainingSecs}`;
  };

  const toggleVoiceNotePlay = (msgId, url) => {
    if (playingId === msgId) {
      audioRefs.current[msgId]?.pause();
      setPlayingId(null);
    } else {
      if (playingId && audioRefs.current[playingId]) {
        audioRefs.current[playingId].pause();
      }
      if (!audioRefs.current[msgId]) {
        const audio = new Audio(url);
        audio.onended = () => setPlayingId(null);
        audioRefs.current[msgId] = audio;
      }
      audioRefs.current[msgId].play();
      setPlayingId(msgId);
    }
  };

  // Small helper to render a 3-bar signal icon from Agora's 1(best)-6(worst) scale
  const NetworkBars = () => {
    if (!networkQuality || networkQuality === 0) return null;
    if (networkQuality <= 2) return <SignalHigh size={13} className="text-emerald-400" />;
    if (networkQuality <= 4) return <SignalMedium size={13} className="text-amber-400" />;
    return <SignalLow size={13} className="text-red-400" />;
  };

  const isRingingOut = callStatus === 'ringing-out';
  const isRingingIn = callStatus === 'ringing-in';
  const isConnected = callStatus === 'connected';
  const isCallUIOpen = isRingingOut || isRingingIn || isConnected;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] lg:h-[82vh] bg-transparent overflow-hidden relative mb-16 lg:mb-0">
      <Toaster position="top-center" />

      {/* INCOMING CALL DIALOG MODAL — theme-matched to app burgundy palette */}
      {isRingingIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-[#fffcf7] rounded-[2.5rem] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl border border-[#f0d9c8] relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-40 h-40 rounded-full bg-[#aa2c4c]/10" />
            <div className="absolute -bottom-20 -left-16 w-40 h-40 rounded-full bg-[#d4a12c]/10" />

            <div className="relative w-20 h-20 mx-auto">
              <div className="absolute inset-0 rounded-full bg-[#aa2c4c]/30 animate-ping" />
              <div className="relative w-20 h-20 bg-gradient-to-tr from-[#aa2c4c] to-[#c9436a] rounded-full flex items-center justify-center text-white shadow-xl">
                {callType === 'video' ? <Video size={36} /> : <Phone size={36} />}
              </div>
            </div>

            <div className="relative">
              <h4 className="text-2xl font-black text-[#3a1a26]">Incoming {callType === 'video' ? 'Video' : 'Audio'} Call</h4>
              <p className="text-xs font-bold text-[#aa2c4c] uppercase tracking-widest mt-1">{partnerName} is calling...</p>
            </div>

            <div className="relative flex justify-center gap-5 pt-2">
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={declineCall}
                  className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all active:scale-95"
                  title="Decline Call"
                >
                  <PhoneOff size={24} />
                </button>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Decline</span>
              </div>

              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={answerCall}
                  className="w-14 h-14 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all animate-pulse active:scale-95"
                  title="Accept Call"
                >
                  <Phone size={24} />
                </button>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Accept</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OUTGOING CALL — RINGING STATE (caller side, before partner answers) */}
      {isRingingOut && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-[#2a0f1a] to-[#3a1626] text-white animate-in fade-in duration-300">
          <div className="relative w-32 h-32 mb-6">
            <div className="absolute inset-0 rounded-full bg-[#aa2c4c]/40 animate-ping" style={{ animationDuration: '1.8s' }} />
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-tr from-[#aa2c4c] to-[#d4a12c] flex items-center justify-center shadow-2xl border-4 border-white/10 overflow-hidden">
              {partnerAvatar ? (
                <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-black">{partnerName ? partnerName[0].toUpperCase() : 'P'}</span>
              )}
            </div>
          </div>
          <h3 className="text-2xl font-black">{partnerName}</h3>
          <p className="text-xs text-[#e8b4c0] font-bold tracking-widest uppercase mt-2">
            Ringing {callType === 'video' ? 'video' : 'audio'} call...
          </p>

          <button
            onClick={endCall}
            className="mt-12 w-16 h-16 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-500/40 hover:scale-110 transition-all active:scale-95"
            title="Cancel Call"
          >
            <PhoneOff size={26} />
          </button>
        </div>
      )}

      {/* ACTIVE CALL OVERLAY MODAL */}
      {isConnected && (
        <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-[#1a0a12] to-[#0d0509] text-white animate-in fade-in duration-300 overflow-hidden">

          {/* CSS override to force Agora video tags to object-fit: cover */}
          <style>{`
            #remote-video div, #remote-video video {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover !important;
              border-radius: 0px !important;
            }
            #local-video div, #local-video video {
              width: 100% !important;
              height: 100% !important;
              object-fit: cover !important;
              border-radius: 1.5rem !important;
            }
          `}</style>

          {/* Reconnecting banner — reliability: never leave the user guessing */}
          {reconnecting && (
            <div className="absolute top-0 left-0 right-0 z-40 bg-amber-500/95 text-white text-xs font-black text-center py-2 flex items-center justify-center gap-2 animate-in slide-in-from-top-2">
              <Loader2 size={13} className="animate-spin" /> Reconnecting...
            </div>
          )}

          {/* Floating Top Bar — burgundy/gold themed */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-30">
            <div className="px-5 py-2.5 bg-[#2a0f1a]/80 backdrop-blur-2xl border border-[#aa2c4c]/30 rounded-full flex items-center gap-3 shadow-2xl">
              <span className={`w-3 h-3 rounded-full ${reconnecting ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400 animate-ping'}`} />
              <div>
                <h4 className="text-xs font-black tracking-wider uppercase text-[#f0d9c8] flex items-center gap-1.5">
                  {callType === 'video' ? `Video call with ${partnerName}` : `Audio call with ${partnerName}`}
                  <NetworkBars />
                </h4>
                <p className="text-[10px] text-[#e8b4c0] font-bold">{formatTime(callDuration)}</p>
              </div>
            </div>

            <button
              onClick={endCall}
              className="px-5 py-2.5 bg-red-500/90 hover:bg-red-600 backdrop-blur-xl text-white rounded-full font-black text-xs shadow-xl flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
            >
              <PhoneOff size={16} /> End Call
            </button>
          </div>

          {/* Call Viewport Display */}
          <div className="relative w-full h-full bg-[#0d0509] flex items-center justify-center">
            {callType === 'video' ? (
              <div id="remote-video" className="absolute inset-0 w-full h-full bg-[#0d0509]" />
            ) : (
              <div className="flex flex-col items-center space-y-4 z-20">
                <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-[#aa2c4c] to-[#d4a12c] flex items-center justify-center shadow-2xl animate-pulse border-4 border-white/10 overflow-hidden">
                  {partnerAvatar ? (
                    <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
                  ) : (
                    <Volume2 size={64} className="text-white" />
                  )}
                </div>
                <h3 className="text-2xl font-black">{partnerName}</h3>
                <p className="text-xs text-[#e8b4c0] font-bold tracking-widest uppercase">{formatTime(callDuration)}</p>
              </div>
            )}

            {/* Local Video PIP Box */}
            {callType === 'video' && (
              <div className="absolute bottom-8 right-8 w-36 h-52 md:w-48 md:h-64 rounded-3xl overflow-hidden border-2 border-[#d4a12c]/30 shadow-2xl bg-[#1a0a12] z-30 hover:scale-105 transition-all duration-300">
                <div id="local-video" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Floating Bottom Control Bar */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-8 py-3.5 bg-[#2a0f1a]/85 backdrop-blur-2xl border border-[#aa2c4c]/30 rounded-full flex items-center gap-6 shadow-2xl z-30">
              <button
                onClick={toggleMic}
                className={`p-4 rounded-full transition-all hover:scale-110 active:scale-95 ${
                  isMicMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {callType === 'video' && (
                <button
                  onClick={toggleVideo}
                  className={`p-4 rounded-full transition-all hover:scale-110 active:scale-95 ${
                    isVideoMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isVideoMuted ? "Turn On Camera" : "Turn Off Camera"}
                >
                  {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
                </button>
              )}

              <button
                onClick={endCall}
                className="w-14 h-14 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-500/40 hover:scale-110 transition-all active:scale-95"
                title="End Call"
              >
                <PhoneOff size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Chat Sub-Header */}
      <div className="px-3 py-3 bg-white/70 backdrop-blur-md border-b border-rose-100/60 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#aa2c4c] to-[#c9436a] text-white flex items-center justify-center font-black shadow-md border-2 border-white overflow-hidden">
              {partnerAvatar ? (
                <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
              ) : (
                partnerName ? partnerName[0].toUpperCase() : 'P'
              )}
            </div>
            <div className="w-3 h-3 bg-emerald-500 border-2 border-white rounded-full absolute bottom-0 right-0 shadow-sm" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm leading-tight">{partnerName}</h3>
            <p className="text-[11px] font-medium text-emerald-500 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
              {isTyping ? "Typing..." : "Online in Sanctuary"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsDisappearingMode(!isDisappearingMode);
              toast(isDisappearingMode ? "Disappearing Mode Off" : "Secret Disappearing Mode Active");
            }}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border active:scale-95 ${
              isDisappearingMode ? 'bg-amber-500 text-white border-amber-600 shadow-md animate-pulse' : 'bg-rose-50 text-gray-700 hover:bg-rose-100 border-rose-100/80'
            }`}
            title={isDisappearingMode ? "Disappearing Mode Active" : "Enable Secret Disappearing Mode"}
          >
            <Sparkles size={16} className={isDisappearingMode ? "fill-current" : ""} />
          </button>
          <button
            onClick={() => startCall(false)}
            disabled={isCallUIOpen}
            className="w-9 h-9 rounded-full bg-rose-50 text-gray-700 hover:bg-rose-100 flex items-center justify-center transition-all border border-rose-100/80 active:scale-95 disabled:opacity-40"
            title="Start HD Audio Call"
          >
            <Phone size={16} />
          </button>
          <button
            onClick={() => startCall(true)}
            disabled={isCallUIOpen}
            className="w-9 h-9 rounded-full bg-[#aa2c4c] text-white flex items-center justify-center shadow-md hover:scale-105 transition-all active:scale-95 disabled:opacity-40"
            title="Start HD Video Call"
          >
            <Video size={16} />
          </button>
          <button
            onClick={() => setShowRoutine(!showRoutine)}
            className="w-9 h-9 rounded-full bg-rose-50 text-rose-800 hover:bg-rose-100 flex items-center justify-center transition-all border border-rose-100/80 active:scale-95"
            title="Toggle Routines"
          >
            <ListTodo size={16} />
          </button>
        </div>
      </div>

      {showRoutine && (
        <div className="p-3 bg-white/90 rounded-2xl border border-rose-100 animate-in slide-in-from-top-4 mb-2 shadow-sm z-10">
          <Routine user={user} />
        </div>
      )}

      {/* Messages Feed with Subtle Heart Pattern Watermark & Grouping */}
      <div className="flex-1 px-3 py-4 overflow-y-auto space-y-1.5 pb-24 md:pb-28 relative bg-[#fff9f6] bg-[radial-gradient(#f43f5e_0.5px,transparent_0.5px)] [background-size:18px_18px] [background-position:0_0]">
        {messageList.map((msg, index) => {
          const isMe = msg.sender === userId;
          const isNextSameSender = messageList[index + 1]?.sender === msg.sender;
          const isLastInGroup = !isNextSameSender;

          return (
            <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} ${isLastInGroup ? 'mb-2.5' : 'mb-0.5'} relative group`}>
              {activeReactionMsg === index && (
                <div className={`absolute -top-10 z-40 bg-white/95 backdrop-blur-md border border-rose-100 rounded-full px-2 py-1 shadow-xl flex items-center gap-1 animate-in zoom-in-95 ${isMe ? 'right-0' : 'left-8'}`}>
                  {['❤️', '😂', '🔥', '🥺', '😮', '👍'].map((emoji, eIdx) => (
                    <button
                      key={eIdx}
                      onClick={() => handleReactToMsg(index, emoji)}
                      className="hover:scale-125 text-base transition-transform p-1"
                    >
                      {emoji}
                    </button>
                  ))}
                  <button onClick={() => setActiveReactionMsg(null)} className="text-gray-400 p-1 text-xs font-bold">✖</button>
                </div>
              )}

              <div className={`flex items-end gap-2 max-w-[82%] md:max-w-[72%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                {!isMe && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#aa2c4c] to-[#c9436a] text-white flex items-center justify-center font-bold text-[9px] shrink-0 overflow-hidden shadow-sm">
                    {isLastInGroup ? (
                      partnerAvatar ? (
                        <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
                      ) : (
                        partnerName ? partnerName[0].toUpperCase() : 'P'
                      )
                    ) : (
                      <div className="w-full h-full bg-transparent" />
                    )}
                  </div>
                )}

                <div
                  onClick={() => setActiveReactionMsg(activeReactionMsg === index ? null : index)}
                  className={`p-3 md:p-3.5 cursor-pointer relative ${
                    isMe
                      ? 'bg-[#aa2c4c] text-white font-bold rounded-2xl rounded-tr-xs shadow-md'
                      : 'bg-[#fffcf7] text-gray-800 font-bold rounded-2xl rounded-tl-xs shadow-sm border border-rose-100/90'
                  }`}
                >
                  {msg.replyTo && (
                    <div className={`p-2 rounded-xl text-[10px] mb-1.5 border-l-2 ${
                      isMe ? 'bg-white/15 border-white text-rose-100' : 'bg-rose-50 border-[#aa2c4c] text-gray-700'
                    }`}>
                      <span className="font-black block">{msg.replyTo.senderName}</span>
                      <span className="truncate block opacity-90">{msg.replyTo.text}</span>
                    </div>
                  )}

                  {msg.isVideo ? (
                    <video src={msg.message} controls className="rounded-xl max-h-60 object-cover" />
                  ) : msg.isImage ? (
                    <img src={msg.message} alt="Shared photo" className="rounded-xl max-h-60 object-cover" />
                  ) : msg.isVoiceNote ? (
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleVoiceNotePlay(index, msg.message); }}
                        className={`p-2.5 rounded-full ${isMe ? 'bg-white text-[#aa2c4c]' : 'bg-[#aa2c4c] text-white'}`}
                      >
                        {playingId === index ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <div className="flex-1">
                        <p className={`text-xs font-bold ${isMe ? 'text-white' : 'text-gray-800'}`}>Voice Note</p>
                        <div className={`h-1.5 rounded-full mt-1 ${isMe ? 'bg-white/40' : 'bg-gray-200'}`}>
                          <div className={`h-full rounded-full ${isMe ? 'bg-white' : 'bg-[#aa2c4c]'} ${playingId === index ? 'animate-pulse w-full' : 'w-0'}`} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs md:text-sm font-bold leading-relaxed">{msg.message}</p>
                  )}

                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className={`absolute -bottom-2 ${isMe ? 'left-2' : 'right-2'} bg-white border border-rose-100 rounded-full px-1.5 py-0.5 text-xs shadow-md flex items-center gap-0.5`}>
                      {msg.reactions.map((r, rIdx) => (
                        <span key={rIdx}>{r.emoji}</span>
                      ))}
                    </div>
                  )}

                  {isLastInGroup && (
                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-medium ${isMe ? 'text-rose-100' : 'text-gray-400'}`}>
                      {msg.isDisappearing && <Sparkles size={10} className="text-amber-300" title="Disappearing Message" />}
                      <span>{msg.time}</span>
                      {isMe && <CheckCheck size={12} className="text-rose-200" />}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setReplyingTo(msg)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-rose-500 transition-opacity"
                  title="Reply to message"
                >
                  <MessageSquare size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {isTyping && <div className="text-[10px] text-rose-500 font-bold animate-pulse px-3 bg-white/80 border border-rose-100/80 w-fit rounded-full py-1 ml-8 shadow-sm">Partner is typing...</div>}
        <div ref={scrollRef} />
      </div>

      {showEmoji && <div className="absolute bottom-20 left-4 right-4 md:left-6 z-50 shadow-2xl"><EmojiPicker onEmojiClick={(d) => setCurrentMessage(p => p + d.emoji)} /></div>}

      <div className="p-2.5 bg-transparent sticky bottom-0 z-20 space-y-1.5">
        {replyingTo && (
          <div className="flex items-center justify-between px-4 py-2 bg-white/90 backdrop-blur-md rounded-2xl border border-rose-100 text-xs shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-1 h-8 bg-[#aa2c4c] rounded-full shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-black text-rose-500 uppercase block">Replying to {replyingTo.senderName}</span>
                <p className="text-gray-700 truncate font-medium">{replyingTo.message}</p>
              </div>
            </div>
            <button onClick={() => setReplyingTo(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded-full bg-gray-100 shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {recording && (
          <div className="flex items-center justify-between mb-2 px-4 py-2 bg-red-50 rounded-2xl border border-red-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 font-bold text-xs">Recording... {formatTime(recordingTime)}</span>
            </div>
            <button onClick={stopRecording} className="text-red-500 font-bold text-xs bg-red-100 px-3 py-1 rounded-full">Send ✓</button>
          </div>
        )}
        <div className="bg-white/95 backdrop-blur-2xl rounded-full p-2 flex items-center gap-1.5 border border-white shadow-xl shadow-rose-100/50">
          <label className="p-2 text-[#aa2c4c] hover:bg-rose-50 rounded-full cursor-pointer transition-all flex items-center justify-center" title="Send Photo">
            {isUploading ? <Loader2 size={18} className="animate-spin text-rose-500" /> : <ImageIcon size={19} className="text-[#aa2c4c]" />}
            <input type="file" className="hidden" accept="image/*" onChange={handleMediaUpload} disabled={isUploading} />
          </label>
          <label className="p-2 text-[#aa2c4c] hover:bg-rose-50 rounded-full cursor-pointer transition-all flex items-center justify-center" title="Send Video">
            {isUploading ? <Loader2 size={18} className="animate-spin text-rose-500" /> : <Film size={19} className="text-[#aa2c4c]" />}
            <input type="file" className="hidden" accept="video/*" onChange={handleMediaUpload} disabled={isUploading} />
          </label>
          <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-[#aa2c4c] hover:bg-rose-50 rounded-full transition-all flex items-center justify-center">
            <Smile size={19} className="text-[#aa2c4c]" />
          </button>
          <input
            type="text"
            value={currentMessage}
            placeholder={recording ? "Recording..." : sendingVoice ? "Sending..." : "Type your love..."}
            onChange={(e) => { setCurrentMessage(e.target.value); socket.emit("typing", { room: roomId, userId, typing: e.target.value.length > 0 }); }}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 bg-transparent border-none outline-none text-xs md:text-sm text-gray-800 font-bold px-1 placeholder:text-rose-300/70"
            disabled={recording || sendingVoice}
          />
          {currentMessage.length === 0 ? (
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={sendingVoice}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-rose-50 text-rose-500 hover:bg-rose-100'}`}
            >
              {sendingVoice ? <Loader2 size={16} className="animate-spin" /> : recording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          ) : (
            <button onClick={sendMessage} className="w-10 h-10 bg-[#aa2c4c] text-white rounded-full flex items-center justify-center shadow-md hover:scale-105 transition-all">
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chat;