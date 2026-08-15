import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Send, CheckCheck, Smile, Phone, Video, MoreVertical, Plus, Loader2, PhoneOff, ListTodo, Mic, MicOff, Play, Pause, VideoOff, Volume2, Sparkles, X, Image as ImageIcon, Film } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import AgoraRTC from 'agora-rtc-sdk-ng';
import toast, { Toaster } from 'react-hot-toast';
import Routine from './Routine';

const socket = io.connect(import.meta.env.VITE_API_URL);

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

    const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    agoraClientRef.current = client;

    client.on('user-published', async (remoteUser, mediaType) => {
      await client.subscribe(remoteUser, mediaType);
      if (mediaType === 'audio') {
        remoteUser.audioTrack?.play();
      }
      if (mediaType === 'video') {
        setTimeout(() => {
          remoteUser.videoTrack?.play('remote-video');
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
    socket.on("receive_message", handleReceive);
    socket.on("display_typing", handleTyping);
    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("display_typing", handleTyping);
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

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/agora/token`, {
        channelName: roomId, uid
      });
      const token = res.data.token;

      await agoraClientRef.current.join(appId, roomId, token, uid);

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localTracksRef.current.audio = audioTrack;

      let videoTrack = null;
      if (isVideo) {
        videoTrack = await AgoraRTC.createCameraVideoTrack();
        localTracksRef.current.video = videoTrack;
        setTimeout(() => {
          videoTrack.play('local-video');
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

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/agora/token`, {
        channelName: roomId, uid
      });
      const token = res.data.token;

      await agoraClientRef.current.join(appId, roomId, token, uid);

      const audioTrack = await AgoraRTC.createMicrophoneAudioTrack();
      localTracksRef.current.audio = audioTrack;

      let videoTrack = null;
      if (callType === 'video') {
        videoTrack = await AgoraRTC.createCameraVideoTrack();
        localTracksRef.current.video = videoTrack;
        setTimeout(() => {
          videoTrack.play('local-video');
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

  const sendMessage = async () => {
    if (currentMessage.trim() !== "") {
      const messageData = {
        room: roomId,
        sender: userId,
        senderName: user.name,
        message: currentMessage,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      await socket.emit("send_message", messageData);
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage("");
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
        const base64Data = reader.result;
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/upload-media`, {
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
    <div className="flex flex-col h-full bg-white/70 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-white/60 overflow-hidden relative">
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
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 text-white animate-in fade-in">
          {/* Top Bar */}
          <div className="p-6 flex justify-between items-center bg-slate-900/60 backdrop-blur-md border-b border-slate-800 z-20">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-green-500 animate-ping" />
              <div>
                <h4 className="text-lg font-black">{callType === 'video' ? 'HD Video Call 📹' : 'HD Audio Call 📞'}</h4>
                <p className="text-xs text-rose-400 font-bold">{formatTime(callDuration)}</p>
              </div>
            </div>

            <button
              onClick={endCall}
              className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-full font-black text-xs shadow-lg flex items-center gap-2"
            >
              <PhoneOff size={16} /> End Call
            </button>
          </div>

          {/* Call Viewport Display */}
          <div className="flex-1 relative flex items-center justify-center p-4 bg-slate-950">
            {/* Remote Video Display */}
            {callType === 'video' ? (
              <div id="remote-video" className="w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-slate-800 relative bg-slate-900 flex items-center justify-center">
                <p className="text-xs text-slate-500 font-bold italic">Waiting for partner's video feed...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4">
                <div className="w-32 h-32 rounded-full bg-gradient-to-tr from-rose-500 to-pink-600 flex items-center justify-center shadow-2xl animate-pulse">
                  <Volume2 size={56} className="text-white" />
                </div>
                <h3 className="text-2xl font-black">Connected in Audio Call 💖</h3>
                <p className="text-xs text-slate-400 font-bold">{formatTime(callDuration)}</p>
              </div>
            )}

            {/* Local Video PIP Box */}
            {callType === 'video' && (
              <div className="absolute bottom-6 right-6 w-40 h-56 md:w-48 md:h-64 rounded-2xl overflow-hidden border-2 border-rose-500 shadow-2xl bg-black z-30">
                <div id="local-video" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Call Controls Bar */}
          <div className="p-6 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800 flex justify-center items-center gap-6 z-20">
            <button
              onClick={toggleMic}
              className={`p-4 rounded-full transition-all ${
                isMicMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
              }`}
              title={isMicMuted ? "Unmute Mic" : "Mute Mic"}
            >
              {isMicMuted ? <MicOff size={22} /> : <Mic size={22} />}
            </button>

            {callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full transition-all ${
                  isVideoMuted ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
                title={isVideoMuted ? "Turn On Camera" : "Turn Off Camera"}
              >
                {isVideoMuted ? <VideoOff size={22} /> : <Video size={22} />}
              </button>
            )}

            <button
              onClick={endCall}
              className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-all"
              title="End Call"
            >
              <PhoneOff size={28} />
            </button>
          </div>
        </div>
      )}

      {/* Chat Top Header */}
      <div className="p-6 bg-white/40 border-b border-rose-100 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-400 to-pink-500 text-white flex items-center justify-center font-black shadow-md overflow-hidden">
              {partnerAvatar ? (
                <img src={partnerAvatar} alt={partnerName} className="w-full h-full object-cover" />
              ) : (
                partnerName ? partnerName[0].toUpperCase() : 'P'
              )}
            </div>
            <div className="w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full absolute bottom-0 right-0" />
          </div>
          <div>
            <h3 className="font-black text-gray-800 text-lg leading-tight">{partnerName}</h3>
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">
              {isTyping ? "Typing..." : "Online in sanctuary"}
            </p>
          </div>
        </div>

        {/* Call Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => startCall(false)}
            className="p-3 bg-white text-rose-500 hover:bg-rose-50 rounded-2xl border border-rose-100 shadow-sm hover:scale-105 transition-all"
            title="Start HD Audio Call"
          >
            <Phone size={18} />
          </button>
          <button
            onClick={() => startCall(true)}
            className="p-3 bg-gradient-to-r from-rose-500 to-pink-600 text-white rounded-2xl shadow-md hover:scale-105 transition-all"
            title="Start HD Video Call"
          >
            <Video size={18} />
          </button>
          <button
            onClick={() => setShowRoutine(!showRoutine)}
            className={`p-3 rounded-2xl border shadow-sm transition-all ${
              showRoutine ? 'bg-rose-500 text-white border-rose-500' : 'bg-white text-gray-600 border-rose-100 hover:bg-rose-50'
            }`}
            title="Toggle Routines"
          >
            <ListTodo size={18} />
          </button>
        </div>
      </div>

      {showRoutine && (
        <div className="p-4 bg-rose-50/60 border-b border-rose-100 animate-in slide-in-from-top-4">
          <Routine user={user} />
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4">
        {messageList.map((msg, index) => {
          const isMe = msg.sender === userId;
          return (
            <div key={index} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[75%] p-4 rounded-[2rem] shadow-sm ${
                isMe
                  ? 'bg-gradient-to-tr from-rose-500 to-pink-500 text-white rounded-tr-none'
                  : 'bg-white border border-rose-100 text-gray-800 rounded-tl-none'
              }`}>
                {msg.isVideo ? (
                  <video src={msg.message} controls className="rounded-2xl max-h-60 object-cover" />
                ) : msg.isImage ? (
                  <img src={msg.message} alt="Shared photo" className="rounded-2xl max-h-60 object-cover" />
                ) : msg.isVoiceNote ? (
                  <div className="flex items-center gap-3 min-w-[200px]">
                    <button
                      onClick={() => toggleVoiceNotePlay(index, msg.message)}
                      className={`p-3 rounded-full ${isMe ? 'bg-white text-rose-500' : 'bg-rose-500 text-white'}`}
                    >
                      {playingId === index ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <div className="flex-1">
                      <p className={`text-xs font-black ${isMe ? 'text-white' : 'text-gray-800'}`}>Voice Note 🎙️</p>
                      <div className={`h-1.5 rounded-full mt-1.5 ${isMe ? 'bg-white/40' : 'bg-gray-200'}`}>
                        <div className={`h-full rounded-full ${isMe ? 'bg-white' : 'bg-rose-500'} ${playingId === index ? 'animate-pulse w-full' : 'w-0'}`} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-bold leading-relaxed">{msg.message}</p>
                )}
                <span className={`text-[9px] font-bold block mt-1.5 text-right ${isMe ? 'text-rose-100' : 'text-gray-400'}`}>
                  {msg.time}
                </span>
              </div>
            </div>
          );
        })}
        {isTyping && <div className="text-[10px] text-rose-400 font-bold animate-pulse px-4 bg-white/50 w-fit rounded-full py-1 ml-2">Partner is typing...</div>}
        <div ref={scrollRef} />
      </div>

      {showEmoji && <div className="absolute bottom-24 left-6 z-50 shadow-2xl"><EmojiPicker onEmojiClick={(d) => setCurrentMessage(p => p + d.emoji)} /></div>}

      {/* Input Bar */}
      <div className="p-6 bg-transparent">
        {recording && (
          <div className="flex items-center justify-between mb-3 px-4 py-2 bg-red-50 rounded-2xl border border-red-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 font-black text-sm">Recording... {formatTime(recordingTime)}</span>
            </div>
            <button onClick={stopRecording} className="text-red-500 font-black text-xs bg-red-100 px-3 py-1 rounded-full">Send ✓</button>
          </div>
        )}
        <div className="bg-white/80 backdrop-blur-2xl p-2 rounded-[2.5rem] flex items-center gap-2 border border-white shadow-xl shadow-rose-200/20 focus-within:ring-2 ring-rose-100 transition-all">
          <label className="p-3 text-rose-400 hover:bg-rose-50 rounded-full cursor-pointer transition-all" title="Send Photo 📸">
            {isUploading ? <Loader2 size={22} className="animate-spin" /> : <ImageIcon size={22} />}
            <input type="file" className="hidden" accept="image/*" onChange={handleMediaUpload} disabled={isUploading} />
          </label>
          <label className="p-3 text-rose-400 hover:bg-rose-50 rounded-full cursor-pointer transition-all" title="Send Video 🎬">
            {isUploading ? <Loader2 size={22} className="animate-spin" /> : <Film size={22} />}
            <input type="file" className="hidden" accept="video/*" onChange={handleMediaUpload} disabled={isUploading} />
          </label>
          <button onClick={() => setShowEmoji(!showEmoji)} className={`p-3 rounded-full transition-all ${showEmoji ? 'bg-rose-100 text-rose-600' : 'text-rose-400 hover:bg-rose-50'}`}>
            <Smile size={22} />
          </button>
          <input
            type="text"
            value={currentMessage}
            placeholder={recording ? "Recording..." : sendingVoice ? "Sending..." : "Type your love..."}
            onChange={(e) => { setCurrentMessage(e.target.value); socket.emit("typing", { room: roomId, userId, typing: e.target.value.length > 0 }); }}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 bg-transparent border-none outline-none text-xs md:text-sm text-gray-700 font-bold px-2"
            disabled={recording || sendingVoice}
          />
          {currentMessage.length === 0 ? (
            <button
              onClick={recording ? stopRecording : startRecording}
              disabled={sendingVoice}
              className={`p-3.5 rounded-full transition-all ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-rose-100 text-rose-500 hover:bg-rose-500 hover:text-white'}`}
            >
              {sendingVoice ? <Loader2 size={18} className="animate-spin" /> : recording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          ) : (
            <button onClick={sendMessage} className="p-3.5 rounded-full bg-rose-500 text-white shadow-lg scale-105 transition-all">
              <Send size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chat;