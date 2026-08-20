import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Send, CheckCheck, Smile, Phone, Video, MoreVertical, Plus, Loader2, PhoneOff, ListTodo, Mic, MicOff, Play, Pause, VideoOff, Volume2, Sparkles, X, Image as ImageIcon, Film } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import AgoraRTC from 'agora-rtc-sdk-ng';

// Disable telemetry & stats collector to prevent AdBlocker ERR_BLOCKED_BY_CLIENT console spam
AgoraRTC.disableLogUpload();
AgoraRTC.setLogLevel(4);
import toast, { Toaster } from 'react-hot-toast';
import Routine from './Routine';

const API_URL = import.meta.env.VITE_API_URL || 'https://love-verse-backend.onrender.com';
const socket = io.connect(API_URL);

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

  // Call States
  const [calling, setCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [callType, setCallType] = useState("video");
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const [showRoutine, setShowRoutine] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [activeReactionMsg, setActiveReactionMsg] = useState(null);
  const [isDisappearingMode, setIsDisappearingMode] = useState(false);

  const scrollRef = useRef();
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const callTimerRef = useRef(null);
  const audioRefs = useRef({});
  const agoraClientRef = useRef(null);
  const localTracksRef = useRef({ audio: null, video: null });

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

    return () => {
      client.leave();
    };
  }, [userId]);

  // Socket listeners for call signals
  useEffect(() => {
    const handleSignal = (data) => {
      setCallType(data.type);
      setIncomingCall(true);
      toast(`Incoming ${data.type} call from partner! 📞`, {
        icon: '📞',
        duration: 5000
      });
    };
    const handleEndSignal = () => {
      toast("Call ended.");
      cleanupCall();
    };

    socket.on("incoming_call_signal", handleSignal);
    socket.on("call_ended_signal", handleEndSignal);

    return () => {
      socket.off("incoming_call_signal", handleSignal);
      socket.off("call_ended_signal", handleEndSignal);
    };
  }, []);

  // Voice note listener
  useEffect(() => {
    const handleVoiceNote = (data) => {
      setMessageList(prev => [...prev, { ...data, isVoiceNote: true }]);
      toast(`${data.senderName} sent a Voice Note! 🎙️`, {
        icon: '🎙️'
      });
    };
    socket.on("receive_voice_note", handleVoiceNote);
    return () => socket.off("receive_voice_note", handleVoiceNote);
  }, []);

  const cleanupCall = async () => {
    try {
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
    setCalling(false);
    setIncomingCall(false);
    setIsMicMuted(false);
    setIsVideoMuted(false);
    setCallDuration(0);
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
      if (data.sender !== userId) setMessageList(list => [...list, data]);
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
  }, [userId]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageList, isTyping]);

  // --- START CALL FUNCTION ---
  const startCall = async (isVideo) => {
    setCallType(isVideo ? "video" : "audio");
    try {
      const appId = import.meta.env.VITE_AGORA_APP_ID || "a5839042b3224b1a8d052b610c666579";
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
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          AEC: true,
          ANS: true,
          AGC: true
        });
      } catch (micErr) {
        console.warn("Advanced mic track failed, using fallback basic mic track:", micErr);
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      }
      localTracksRef.current.audio = audioTrack;

      let videoTrack = null;
      if (isVideo) {
        videoTrack = await AgoraRTC.createCameraVideoTrack();
        localTracksRef.current.video = videoTrack;
        setTimeout(() => {
          videoTrack.play('local-video', { fit: 'cover' });
        }, 300);
      }

      const tracksToPublish = isVideo ? [audioTrack, videoTrack] : [audioTrack];
      await agoraClientRef.current.publish(tracksToPublish);

      setCalling(true);
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

      socket.emit("send_call_signal", {
        to: partnerId,
        from: userId,
        type: isVideo ? "video" : "audio",
      });

    } catch (err) {
      console.error("Call error:", err);
      toast.error("Could not start call. Check mic & camera permissions!");
    }
  };

  // --- ANSWER CALL FUNCTION ---
  const answerCall = async () => {
    setIncomingCall(false);
    setCalling(true);
    try {
      const appId = import.meta.env.VITE_AGORA_APP_ID || "a5839042b3224b1a8d052b610c666579";
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
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack({
          AEC: true,
          ANS: true,
          AGC: true
        });
      } catch (micErr) {
        console.warn("Advanced mic track failed in answerCall, using fallback mic track:", micErr);
        audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      }
      localTracksRef.current.audio = audioTrack;

      let videoTrack = null;
      if (callType === 'video') {
        videoTrack = await AgoraRTC.createCameraVideoTrack();
        localTracksRef.current.video = videoTrack;
        setTimeout(() => {
          videoTrack.play('local-video', { fit: 'cover' });
        }, 300);
      }

      const tracksToPublish = callType === 'video' ? [audioTrack, videoTrack] : [audioTrack];
      await agoraClientRef.current.publish(tracksToPublish);

      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Answer error:", err);
      toast.error("Could not answer call.");
    }
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
      toast.success("Voice note sent! 🎙️");
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
        toast.success(isVideo ? "Video Bhej Di! 🎬" : "Photo Bhej Di! 📸");
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

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] lg:h-[82vh] bg-transparent overflow-hidden relative mb-16 lg:mb-0">
      <Toaster position="top-center" />

      {/* INCOMING CALL DIALOG MODAL */}
      {incomingCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center space-y-6 shadow-2xl border border-rose-100 relative">
            <div className="w-20 h-20 bg-gradient-to-tr from-rose-500 to-pink-600 rounded-full flex items-center justify-center text-white mx-auto shadow-xl animate-bounce">
              {callType === 'video' ? <Video size={36} /> : <Phone size={36} />}
            </div>

            <div>
              <h4 className="text-2xl font-black text-gray-800">Incoming {callType === 'video' ? 'Video' : 'Audio'} Call</h4>
              <p className="text-xs font-bold text-rose-500 uppercase tracking-widest mt-1">{partnerName} is calling...</p>
            </div>

            <div className="flex justify-center gap-4 pt-2">
              <button
                onClick={cleanupCall}
                className="w-14 h-14 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all"
                title="Decline Call"
              >
                <PhoneOff size={24} />
              </button>

              <button
                onClick={answerCall}
                className="w-14 h-14 bg-green-500 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-all animate-pulse"
                title="Accept Call"
              >
                <Phone size={24} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE CALL OVERLAY MODAL */}
      {calling && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-in fade-in overflow-hidden">
          
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

          {/* Floating Glassmorphic Top Bar */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-30">
            <div className="px-5 py-2.5 bg-slate-900/70 backdrop-blur-2xl border border-white/10 rounded-full flex items-center gap-3 shadow-2xl">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-ping" />
              <div>
                <h4 className="text-xs font-black tracking-wider uppercase text-slate-200">
                  {callType === 'video' ? `HD Video Call with ${partnerName} 📹` : `HD Audio Call with ${partnerName} 📞`}
                </h4>
                <p className="text-[10px] text-rose-400 font-bold">{formatTime(callDuration)}</p>
              </div>
            </div>

            <button
              onClick={endCall}
              className="px-5 py-2.5 bg-red-500/90 hover:bg-red-600 backdrop-blur-xl text-white rounded-full font-black text-xs shadow-xl flex items-center gap-2 transition-all hover:scale-105"
            >
              <PhoneOff size={16} /> End Call
            </button>
          </div>

          {/* Call Viewport Display */}
          <div className="relative w-full h-full bg-slate-950 flex items-center justify-center">
            {/* Remote Video Display (Edge-to-Edge Fullscreen) */}
            {callType === 'video' ? (
              <div id="remote-video" className="absolute inset-0 w-full h-full bg-slate-950" />
            ) : (
              <div className="flex flex-col items-center space-y-4 z-20">
                <div className="w-36 h-36 rounded-full bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center shadow-2xl animate-pulse border-4 border-white/20">
                  <Volume2 size={64} className="text-white" />
                </div>
                <h3 className="text-2xl font-black">{partnerName} 💖</h3>
                <p className="text-xs text-rose-400 font-bold tracking-widest uppercase">{formatTime(callDuration)}</p>
              </div>
            )}

            {/* Local Video PIP Box */}
            {callType === 'video' && (
              <div className="absolute bottom-8 right-8 w-36 h-52 md:w-48 md:h-64 rounded-3xl overflow-hidden border-2 border-white/20 shadow-2xl bg-slate-900 z-30 hover:scale-105 transition-all">
                <div id="local-video" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Floating Glassmorphic Bottom Control Bar */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-8 py-3.5 bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-full flex items-center gap-6 shadow-2xl z-30">
              <button
                onClick={toggleMic}
                className={`p-4 rounded-full transition-all hover:scale-110 ${
                  isMicMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
              >
                {isMicMuted ? <MicOff size={20} /> : <Mic size={20} />}
              </button>

              {callType === 'video' && (
                <button
                  onClick={toggleVideo}
                  className={`p-4 rounded-full transition-all hover:scale-110 ${
                    isVideoMuted ? 'bg-red-500 text-white shadow-lg shadow-red-500/30' : 'bg-white/10 text-white hover:bg-white/20'
                  }`}
                  title={isVideoMuted ? "Turn On Camera" : "Turn Off Camera"}
                >
                  {isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
                </button>
              )}

              <button
                onClick={endCall}
                className="w-14 h-14 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-red-500/40 hover:scale-110 transition-all"
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
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-400 to-pink-500 text-white flex items-center justify-center font-black shadow-md border-2 border-white overflow-hidden">
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

        {/* Call & Action Buttons (Consistent Uniform Badges) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setIsDisappearingMode(!isDisappearingMode);
              toast(isDisappearingMode ? "Disappearing Mode Off 🛡️" : "Secret Disappearing Mode Active 🔒🔥");
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
            className="w-9 h-9 rounded-full bg-rose-50 text-gray-700 hover:bg-rose-100 flex items-center justify-center transition-all border border-rose-100/80 active:scale-95"
            title="Start HD Audio Call"
          >
            <Phone size={16} />
          </button>
          <button
            onClick={() => startCall(true)}
            className="w-9 h-9 rounded-full bg-[#aa2c4c] text-white flex items-center justify-center shadow-md hover:scale-105 transition-all active:scale-95"
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
              {/* Quick Reaction Selector Floating Picker */}
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
                {/* Partner Avatar for received messages (only on last message of group) */}
                {!isMe && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-rose-400 to-pink-500 text-white flex items-center justify-center font-bold text-[9px] shrink-0 overflow-hidden shadow-sm">
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
                  {/* Reply Context Block if present */}
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
                        <p className={`text-xs font-bold ${isMe ? 'text-white' : 'text-gray-800'}`}>Voice Note 🎙️</p>
                        <div className={`h-1.5 rounded-full mt-1 ${isMe ? 'bg-white/40' : 'bg-gray-200'}`}>
                          <div className={`h-full rounded-full ${isMe ? 'bg-white' : 'bg-[#aa2c4c]'} ${playingId === index ? 'animate-pulse w-full' : 'w-0'}`} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs md:text-sm font-bold leading-relaxed">{msg.message}</p>
                  )}

                  {/* Attached Emoji Reactions */}
                  {msg.reactions && msg.reactions.length > 0 && (
                    <div className={`absolute -bottom-2 ${isMe ? 'left-2' : 'right-2'} bg-white border border-rose-100 rounded-full px-1.5 py-0.5 text-xs shadow-md flex items-center gap-0.5`}>
                      {msg.reactions.map((r, rIdx) => (
                        <span key={rIdx}>{r.emoji}</span>
                      ))}
                    </div>
                  )}

                  {/* Show timestamp & read-receipt only on last message of consecutive group */}
                  {isLastInGroup && (
                    <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] font-medium ${isMe ? 'text-rose-100' : 'text-gray-400'}`}>
                      {msg.isDisappearing && <Sparkles size={10} className="text-amber-300" title="Disappearing Message" />}
                      <span>{msg.time}</span>
                      {isMe && <CheckCheck size={12} className="text-rose-200" />}
                    </div>
                  )}
                </div>

                {/* Reply Button on Hover */}
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

      {/* Floating Bottom Input Bar (Unified Monochromatic Styling) */}
      <div className="p-2.5 bg-transparent sticky bottom-0 z-20 space-y-1.5">
        {/* Reply Preview Header */}
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
          <label className="p-2 text-[#aa2c4c] hover:bg-rose-50 rounded-full cursor-pointer transition-all flex items-center justify-center" title="Send Photo 📸">
            {isUploading ? <Loader2 size={18} className="animate-spin text-rose-500" /> : <ImageIcon size={19} className="text-[#aa2c4c]" />}
            <input type="file" className="hidden" accept="image/*" onChange={handleMediaUpload} disabled={isUploading} />
          </label>
          <label className="p-2 text-[#aa2c4c] hover:bg-rose-50 rounded-full cursor-pointer transition-all flex items-center justify-center" title="Send Video 🎬">
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