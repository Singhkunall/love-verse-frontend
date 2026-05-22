import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Send, CheckCheck, Smile, Phone, Video, MoreVertical, Plus, Loader2, PhoneOff, ListTodo, Mic, MicOff, Play, Pause } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import Peer from 'peerjs';
import toast, { Toaster } from 'react-hot-toast';
import Routine from './Routine';

const socket = io.connect(import.meta.env.VITE_API_URL);

function Chat({ user }) {
  const [currentMessage, setCurrentMessage] = useState("");
  const [messageList, setMessageList] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Voice Note states
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [sendingVoice, setSendingVoice] = useState(false);
  const [playingId, setPlayingId] = useState(null);

  const [peer, setPeer] = useState(null);
  const [calling, setCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [callType, setCallType] = useState("video");
  const [showRoutine, setShowRoutine] = useState(false);

  const scrollRef = useRef();
  const myVideo = useRef();
  const remoteVideo = useRef();
  const currentCallRef = useRef();
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRefs = useRef({});

  const userId = user._id || user.id;
  const partnerId = user.partnerId?._id || user.partnerId;
  const roomId = [userId, partnerId].sort().join("_");

  useEffect(() => {
    if (!userId) return;
    socket.emit("setup", userId);

    const newPeer = new Peer(`lv-${userId}-${Date.now()}`, {
      debug: 1,
      config: {
        'iceServers': [
          { urls: "stun:stun.relay.metered.ca:80" },
          {
            urls: "turn:global.relay.metered.ca:80",
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_CREDENTIAL,
          },
          {
            urls: "turn:global.relay.metered.ca:443",
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_CREDENTIAL,
          },
          {
            urls: "turns:global.relay.metered.ca:443?transport=tcp",
            username: import.meta.env.VITE_TURN_USERNAME,
            credential: import.meta.env.VITE_TURN_CREDENTIAL,
          },
        ]
      }
    });

    setPeer(newPeer);
    newPeer.on('open', (id) => {
      socket.emit("register_peer", { peerId: id, userId });
    });
    newPeer.on('call', (call) => {
      setIncomingCall(true);
      if (call.metadata?.type) setCallType(call.metadata.type);
      currentCallRef.current = call;
    });
    newPeer.on('error', (err) => {
      if (err.type === 'peer-unavailable') { toast.error("Partner is offline!"); setCalling(false); }
      if (err.type === 'disconnected') newPeer.reconnect();
    });

    return () => { if (newPeer) newPeer.destroy(); };
  }, [userId]);

  useEffect(() => {
    const handleSignal = (data) => { setCallType(data.type); setIncomingCall(true); toast(`Incoming ${data.type} call...`, { icon: '📞' }); };
    const handleEndSignal = () => cleanupCall();
    socket.on("incoming_call_signal", handleSignal);
    socket.on("call_ended_signal", handleEndSignal);
    return () => { socket.off("incoming_call_signal", handleSignal); socket.off("call_ended_signal", handleEndSignal); };
  }, []);

  // Voice note received
  useEffect(() => {
    const handleVoiceNote = (data) => {
      setMessageList(prev => [...prev, { ...data, isVoiceNote: true }]);
      toast(`${data.senderName} ne Voice Note bheja! 🎙️`, {
        icon: '🎙️',
        style: { background: '#fff0f3', color: '#e11d48', border: '2px solid #fb7185' }
      });
    };
    socket.on("receive_voice_note", handleVoiceNote);
    return () => socket.off("receive_voice_note", handleVoiceNote);
  }, []);

  const cleanupCall = () => {
    setCalling(false); setIncomingCall(false);
    if (currentCallRef.current) currentCallRef.current.close();
    if (myVideo.current?.srcObject) { myVideo.current.srcObject.getTracks().forEach(t => t.stop()); myVideo.current.srcObject = null; }
    if (remoteVideo.current) remoteVideo.current.srcObject = null;
    setTimeout(() => window.location.reload(), 300);
  };

  const fetchChatHistory = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/chat/history/${roomId}`);
      setMessageList(res.data);
    } catch (err) { console.error("History fetch error:", err); }
  };

  useEffect(() => {
    if (roomId && partnerId) { socket.emit("join_chat", roomId); fetchChatHistory(); }
  }, [roomId, partnerId]);

  useEffect(() => {
    const handleReceive = (data) => { if (data.sender !== userId) setMessageList(list => [...list, data]); };
    const handleTyping = (data) => { if (data.userId !== userId) setIsTyping(data.typing); };
    socket.on("receive_message", handleReceive);
    socket.on("display_typing", handleTyping);
    return () => { socket.off("receive_message", handleReceive); socket.off("display_typing", handleTyping); };
  }, [userId]);

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messageList, isTyping]);

  // --- VOICE NOTE RECORDING ---
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
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/voice-notes/upload`, {
          roomId, senderId: userId, senderName: user.name,
          audio: reader.result, duration: recordingTime,
        });

        const msgData = { ...res.data, isVoiceNote: true, sender: userId, senderName: user.name, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
        socket.emit("new_voice_note", { ...res.data, roomId, senderName: user.name });
        setMessageList(prev => [...prev, msgData]);
        toast.success("Voice note bheja! 🎙️");
      };
    } catch (err) {
      toast.error("Send failed!");
    }
    setSendingVoice(false);
  };

  const handlePlay = (id, url) => {
    if (playingId === id) {
      audioRefs.current[id]?.pause();
      setPlayingId(null);
    } else {
      if (playingId && audioRefs.current[playingId]) audioRefs.current[playingId].pause();
      if (!audioRefs.current[id]) {
        audioRefs.current[id] = new Audio(url);
        audioRefs.current[id].onended = () => setPlayingId(null);
      }
      audioRefs.current[id].play();
      setPlayingId(id);
    }
  };

  const formatTime = (secs) => `${Math.floor(secs / 60)}:${(secs % 60).toString().padStart(2, '0')}`;

  // --- CALL FUNCTIONS ---
  const startCall = (isVideo) => {
    if (!peer) return;
    setCallType(isVideo ? "video" : "audio");
    socket.emit("get_peer_id", { partnerId });
    socket.once("partner_peer_id", ({ peerId }) => {
      if (!peerId) { toast.error("Partner offline hai!"); return; }
      navigator.mediaDevices.getUserMedia({ video: isVideo ? { width: 1280, height: 720 } : false, audio: { echoCancellation: true, noiseSuppression: true } })
        .then((stream) => {
          setCalling(true);
          if (myVideo.current) { myVideo.current.srcObject = stream; myVideo.current.muted = true; }
          socket.emit("send_call_signal", { to: partnerId, from: userId, type: isVideo ? "video" : "audio" });
          const call = peer.call(peerId, stream, { metadata: { type: isVideo ? "video" : "audio" } });
          call.on('stream', (remoteStream) => {
            if (remoteVideo.current) { remoteVideo.current.srcObject = remoteStream; remoteVideo.current.muted = false; remoteVideo.current.volume = 1.0; remoteVideo.current.play().catch(() => { }); }
          });
          call.on('close', () => cleanupCall());
          call.on('error', () => { toast.error("Call failed!"); cleanupCall(); });
          currentCallRef.current = call;
        }).catch(() => toast.error("Camera/Mic access denied!"));
    });
  };

  const answerCall = () => {
    const call = currentCallRef.current;
    if (!call) return;
    navigator.mediaDevices.getUserMedia({ video: callType === "video" ? { width: 640, height: 480 } : false, audio: { echoCancellation: true, noiseSuppression: true } })
      .then((stream) => {
        setIncomingCall(false); setCalling(true);
        if (myVideo.current) { myVideo.current.srcObject = stream; myVideo.current.muted = true; }
        call.on('stream', (remoteStream) => {
          if (remoteVideo.current) { remoteVideo.current.srcObject = remoteStream; remoteVideo.current.muted = false; remoteVideo.current.volume = 1.0; remoteVideo.current.play().catch(() => { }); }
        });
        call.on('close', () => cleanupCall());
        call.answer(stream);
      }).catch(() => toast.error("Camera busy or access denied!"));
  };

  const endCall = () => { socket.emit("end_call_signal", { to: partnerId }); cleanupCall(); };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "love_verse");
    try {
      const res = await axios.post("https://api.cloudinary.com/v1_1/dxd7kirki/upload", formData);
      const messageData = { room: roomId, sender: userId, senderName: user.name, message: res.data.secure_url, isImage: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      socket.emit("send_message", messageData);
      setMessageList(list => [...list, messageData]);
    } catch (err) { toast.error("Upload error"); } finally { setIsUploading(false); }
  };

  const sendMessage = async () => {
    if (currentMessage !== "" && partnerId) {
      const messageData = { room: roomId, sender: userId, senderName: user.name, message: currentMessage, isImage: false, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      socket.emit("send_message", messageData);
      socket.emit("typing", { room: roomId, userId, typing: false });
      setMessageList(list => [...list, messageData]);
      setCurrentMessage(""); setShowEmoji(false);
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[85vh] bg-white/40 backdrop-blur-xl rounded-[3rem] overflow-hidden shadow-2xl border border-white/50 relative">
      <Toaster position="top-center" />

      {/* CALL OVERLAY */}
      {calling && (
        <div className="absolute inset-0 z-[100] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="relative w-full h-[80%] rounded-[2rem] overflow-hidden bg-gray-800 shadow-2xl">
            <video playsInline ref={remoteVideo} autoPlay className="w-full h-full object-cover" />
            <video playsInline muted ref={myVideo} autoPlay className="absolute bottom-4 right-4 w-28 h-40 object-cover rounded-xl border-2 border-white/20 shadow-2xl" />
            <div className="absolute top-6 left-6 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
              <p className="text-white text-xs font-bold uppercase tracking-widest">{callType} Call Active</p>
            </div>
          </div>
          <button onClick={endCall} className="mt-6 p-6 bg-red-500 text-white rounded-full shadow-2xl hover:bg-red-600 hover:scale-110 transition-all">
            <PhoneOff size={32} />
          </button>
        </div>
      )}

      {/* INCOMING CALL */}
      {incomingCall && !calling && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[110] bg-white p-6 rounded-[2.5rem] shadow-2xl border-2 border-rose-400 flex flex-col items-center gap-4">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center animate-pulse">
            <Phone className="text-rose-500" size={30} />
          </div>
          <p className="text-rose-500 font-black text-xl">Incoming {callType} Call...</p>
          <div className="flex gap-4 w-full">
            <button onClick={answerCall} className="flex-1 bg-green-500 text-white py-3 rounded-2xl font-bold">Answer</button>
            <button onClick={() => setIncomingCall(false)} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-2xl font-bold">Ignore</button>
          </div>
        </div>
      )}

      {showRoutine && <Routine user={user} onClose={() => setShowRoutine(false)} />}

      {/* Header */}
      <div className="bg-white/60 backdrop-blur-md p-5 flex items-center justify-between border-b border-rose-50/50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg">
              {user.partnerId?.avatar ? (
                <img src={user.partnerId.avatar} alt={user.partnerId.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-rose-500 flex items-center justify-center font-black text-white">
                  {user.partnerId?.name?.charAt(0).toUpperCase() || 'P'}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h3 className="text-gray-800 font-black">{user.partnerId?.name || "My Universe"} ❤️</h3>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest italic">Always Yours</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-gray-400">
          <button onClick={() => setShowRoutine(!showRoutine)} className={`p-3 rounded-2xl transition-all ${showRoutine ? 'bg-rose-500 text-white' : 'bg-rose-50 text-rose-400'}`}>
            <ListTodo size={20} />
          </button>
          <button onClick={() => startCall(false)} className="p-3 bg-rose-50 text-rose-400 rounded-2xl"><Phone size={20} /></button>
          <button onClick={() => startCall(true)} className="p-3 bg-rose-50 text-rose-400 rounded-2xl"><Video size={20} /></button>
          <button className="p-2 hover:text-rose-500"><MoreVertical size={20} /></button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-rose-50/30">
        {messageList.map((msg, index) => {
          const isMine = msg.sender === userId || msg.sender?._id === userId;
          return (
            <div key={index} className={`flex ${isMine ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[70%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>

                {/* VOICE NOTE BUBBLE */}
                {msg.isVoiceNote ? (
                  <button
                    onClick={() => handlePlay(msg._id, msg.audioUrl)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-[2rem] shadow-sm ${isMine ? 'bg-rose-500 rounded-tr-none' : 'bg-white rounded-tl-none border border-rose-50'}`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${isMine ? 'bg-white/20' : 'bg-rose-500'}`}>
                      {playingId === msg._id
                        ? <Pause size={16} className="text-white" />
                        : <Play size={16} className="text-white" />
                      }
                    </div>
                    <div className="flex gap-0.5 items-center h-6">
                      {Array.from({ length: 18 }).map((_, i) => (
                        <div key={i} className={`rounded-full w-1 ${isMine ? 'bg-white/70' : 'bg-rose-300'}`}
                          style={{ height: `${Math.random() * 18 + 6}px` }} />
                      ))}
                    </div>
                    <span className={`text-xs font-bold ${isMine ? 'text-rose-100' : 'text-gray-400'}`}>
                      {formatTime(msg.duration || 0)}
                    </span>
                  </button>
                ) : (
                  <div className={`shadow-sm ${isMine ? "bg-rose-500 text-white rounded-[2rem] rounded-tr-none" : "bg-white text-gray-700 rounded-[2rem] rounded-tl-none border border-rose-50"} ${msg.isImage ? "p-1" : "px-5 py-3.5"}`}>
                    {msg.isImage || (msg.message && msg.message.startsWith("http")) ? (
                      <img src={msg.message} alt="media" className="rounded-2xl max-h-60 object-cover cursor-pointer" onClick={() => window.open(msg.message)} />
                    ) : (
                      <p className="text-[14px] font-medium leading-relaxed">{msg.message}</p>
                    )}
                  </div>
                )}

                <div className={`flex items-center gap-1.5 mt-1.5 px-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                  <span className="text-[9px] font-bold text-gray-400">{msg.time}</span>
                  {isMine && <CheckCheck size={12} className="text-rose-400" />}
                </div>
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
        {/* Recording indicator */}
        {recording && (
          <div className="flex items-center justify-between mb-3 px-4 py-2 bg-red-50 rounded-2xl border border-red-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-500 font-black text-sm">Recording... {formatTime(recordingTime)}</span>
            </div>
            <button onClick={stopRecording} className="text-red-500 font-black text-xs bg-red-100 px-3 py-1 rounded-full">
              Send ✓
            </button>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-2xl p-2 rounded-[2.5rem] flex items-center gap-2 border border-white shadow-xl shadow-rose-200/20 focus-within:ring-2 ring-rose-100 transition-all">
          <label className="p-3 text-rose-400 hover:bg-rose-50 rounded-full cursor-pointer transition-all">
            {isUploading ? <Loader2 size={22} className="animate-spin" /> : <Plus size={22} />}
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
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
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 font-medium px-2"
            disabled={recording || sendingVoice}
          />

          {/* Mic button — show when no text */}
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