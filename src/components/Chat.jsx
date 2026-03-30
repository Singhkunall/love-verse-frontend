import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import axios from 'axios';
import { Send, CheckCheck, Smile, Phone, Video, MoreVertical, Plus, Image as ImageIcon, Loader2, PhoneOff, ListTodo } from 'lucide-react';
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
  
  const [peer, setPeer] = useState(null);
  const [calling, setCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState(false);
  const [callType, setCallType] = useState("video"); 
  
  const [showRoutine, setShowRoutine] = useState(false);

  const scrollRef = useRef();
  const myVideo = useRef();
  const remoteVideo = useRef();
  const currentCallRef = useRef();

  const userId = user._id || user.id;
  const partnerId = user.partnerId?._id || user.partnerId;
  const roomId = [userId, partnerId].sort().join("_");

  // --- 1. PEERJS & SOCKET SETUP (UPDATED FOR STABILITY) ---
  useEffect(() => {
    if (!userId) return;

    socket.emit("setup", userId);

    // Prefix 'lv-' added to avoid ID collision and WebSocket closing
    const newPeer = new Peer(`lv-${userId}`, {
      debug: 1,
      config: {
        'iceServers': [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      }
    }); 
    
    setPeer(newPeer);

    newPeer.on('open', (id) => {
      console.log("Peer connected with unique ID:", id);
    });

    newPeer.on('call', (call) => {
      console.log("Incoming peer call...");
      setIncomingCall(true);
      // Metadata check for call type
      if (call.metadata && call.metadata.type) {
        setCallType(call.metadata.type);
      }
      currentCallRef.current = call;
    });

    newPeer.on('error', (err) => {
      console.error("PeerJS Error:", err.type);
      if (err.type === 'peer-unavailable') {
        toast.error("Partner is offline or busy!");
        setCalling(false);
      }
      if (err.type === 'disconnected') {
        newPeer.reconnect();
      }
    });

    return () => {
      if (newPeer) newPeer.destroy();
    };
  }, [userId]);

  // --- 2. SOCKET LISTENERS ---
  useEffect(() => {
    const handleSignal = (data) => {
      setCallType(data.type);
      setIncomingCall(true);
      toast(`Incoming ${data.type} call...`, { icon: '📞' });
    };

    const handleEndSignal = () => {
      cleanupCall();
    };

    socket.on("incoming_call_signal", handleSignal);
    socket.on("call_ended_signal", handleEndSignal);

    return () => {
      socket.off("incoming_call_signal", handleSignal);
      socket.off("call_ended_signal", handleEndSignal);
    };
  }, []);

  const cleanupCall = () => {
    setCalling(false);
    setIncomingCall(false);
    if (currentCallRef.current) {
      currentCallRef.current.close();
    }
    if (myVideo.current && myVideo.current.srcObject) {
      myVideo.current.srcObject.getTracks().forEach(track => track.stop());
      myVideo.current.srcObject = null;
    }
    if (remoteVideo.current) {
      remoteVideo.current.srcObject = null;
    }
    setTimeout(() => window.location.reload(), 300);
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
        setMessageList((list) => [...list, data]);
      }
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

  // --- 3. CALLING FUNCTIONS (UPDATED) ---
  const startCall = (isVideo) => {
    if (!peer) return;
    setCallType(isVideo ? "video" : "audio");
    
    navigator.mediaDevices.getUserMedia({ 
      video: isVideo ? { width: 1280, height: 720 } : false, 
      audio: true 
    }).then((stream) => {
      setCalling(true);
      
      setTimeout(() => { 
        if(myVideo.current) myVideo.current.srcObject = stream; 
      }, 300);
      
      socket.emit("send_call_signal", {
        to: partnerId,
        from: userId,
        type: isVideo ? "video" : "audio"
      });

      // Added prefix 'lv-' to destination and added metadata
      const call = peer.call(`lv-${partnerId}`, stream, {
        metadata: { type: isVideo ? "video" : "audio" }
      });

      call.on('stream', (remoteStream) => {
        if (remoteVideo.current) remoteVideo.current.srcObject = remoteStream;
      });
      currentCallRef.current = call;
    }).catch(err => {
      toast.error("Camera access denied!");
    });
  };

  const answerCall = () => {
    if (!currentCallRef.current) return;
    
    const constraints = { 
      video: callType === "video" ? { width: 640, height: 480 } : false, 
      audio: true 
    };

    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      setCalling(true);
      setIncomingCall(false);
      
      if(myVideo.current) myVideo.current.srcObject = stream;
      
      currentCallRef.current.answer(stream);

      currentCallRef.current.on('stream', (remoteStream) => {
        if (remoteVideo.current) {
          remoteVideo.current.srcObject = remoteStream;
          remoteVideo.current.play().catch(e => console.log("Auto-play error:", e));
        }
      });
    }).catch((err) => {
      console.error("Camera error:", err);
      toast.error("Camera busy or access denied!");
    });
  };

  const endCall = () => {
    socket.emit("end_call_signal", { to: partnerId });
    cleanupCall();
  };

  // --- IMAGE UPLOAD & SEND MESSAGE ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "love_verse"); 
    try {
      const res = await axios.post("https://api.cloudinary.com/v1_1/dxd7kirki/upload", formData);
      const imageUrl = res.data.secure_url;
      const messageData = {
        room: roomId,
        sender: userId,
        senderName: user.name,
        message: imageUrl,
        isImage: true,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      socket.emit("send_message", messageData);
      setMessageList((list) => [...list, messageData]);
    } catch (err) { toast.error("Upload error"); } finally { setIsUploading(false); }
  };

  const sendMessage = async () => {
    if (currentMessage !== "" && partnerId) {
      const messageData = {
        room: roomId,
        sender: userId,
        senderName: user.name,
        message: currentMessage,
        isImage: false,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      socket.emit("send_message", messageData);
      socket.emit("typing", { room: roomId, userId, typing: false });
      setMessageList((list) => [...list, messageData]);
      setCurrentMessage("");
      setShowEmoji(false);
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
          <button onClick={endCall} className="mt-6 p-6 bg-red-500 text-white rounded-full shadow-2xl hover:bg-red-600 hover:scale-110 transition-all border-4 border-white/20 ring-4 ring-red-500/20">
            <PhoneOff size={32} />
          </button>
        </div>
      )}

      {/* INCOMING CALL NOTIFICATION */}
      {incomingCall && !calling && (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[110] bg-white p-6 rounded-[2.5rem] shadow-[0_20px_50px_rgba(225,29,72,0.4)] border-2 border-rose-400 flex flex-col items-center gap-4 animate-bounce-slow">
          <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center animate-pulse">
             <Phone className="text-rose-500" size={30} />
          </div>
          <div className="text-center">
            <p className="text-rose-500 font-black text-xl">Incoming {callType} Call...</p>
            <p className="text-[11px] text-gray-400 uppercase font-bold mt-1">Your Partner is waiting ❤️</p>
          </div>
          <div className="flex gap-4 w-full mt-2">
            <button onClick={answerCall} className="flex-1 bg-green-500 text-white py-3 rounded-2xl font-bold shadow-lg hover:bg-green-600 transition-all">Answer</button>
            <button onClick={() => setIncomingCall(false)} className="flex-1 bg-gray-100 text-gray-500 py-3 rounded-2xl font-bold hover:bg-gray-200">Ignore</button>
          </div>
        </div>
      )}

      {showRoutine && (
        <Routine user={user} onClose={() => setShowRoutine(false)} />
      )}

      {/* Header */}
      <div className="bg-white/60 backdrop-blur-md p-5 flex items-center justify-between border-b border-rose-50/50">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center font-black text-white shadow-lg">
               {user.partnerId?.name?.charAt(0).toUpperCase() || 'P'}
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          <div>
            <h3 className="text-gray-800 font-black">{user.partnerId?.name || "My Universe"} ❤️</h3>
            <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest italic">Always Yours</p>
          </div>
        </div>
        <div className="flex items-center gap-3 text-gray-400">
            <button onClick={() => setShowRoutine(!showRoutine)} className={`p-3 rounded-2xl transition-all active:scale-95 ${showRoutine ? 'bg-rose-500 text-white shadow-lg' : 'bg-rose-50 text-rose-400'}`}>
                <ListTodo size={20}/>
            </button>
            <button onClick={() => startCall(false)} className="p-3 bg-rose-50 text-rose-400 hover:text-rose-600 rounded-2xl transition-all active:scale-95"><Phone size={20}/></button>
            <button onClick={() => startCall(true)} className="p-3 bg-rose-50 text-rose-400 hover:text-rose-600 rounded-2xl transition-all active:scale-95"><Video size={20}/></button>
            <button className="p-2 hover:text-rose-500"><MoreVertical size={20}/></button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-gradient-to-b from-transparent to-rose-50/30">
        {messageList.map((msg, index) => {
          const isMine = msg.sender === userId;
          return (
            <div key={index} className={`flex ${isMine ? "justify-end" : "justify-start"} animate-in slide-in-from-bottom-2`}>
              <div className={`max-w-[70%] flex flex-col ${isMine ? "items-end" : "items-start"}`}>
                <div className={`shadow-sm transition-all ${
                  isMine ? "bg-rose-500 text-white rounded-[2rem] rounded-tr-none" : "bg-white text-gray-700 rounded-[2rem] rounded-tl-none border border-rose-50"
                } ${msg.isImage ? "p-1" : "px-5 py-3.5"}`}>
                  {msg.isImage || (msg.message && msg.message.startsWith("http")) ? (
                    <img src={msg.message} alt="media" className="rounded-2xl max-h-60 object-cover cursor-pointer hover:opacity-95" onClick={() => window.open(msg.message)} />
                  ) : (
                    <p className="text-[14px] font-medium leading-relaxed">{msg.message}</p>
                  )}
                </div>
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

      {showEmoji && <div className="absolute bottom-24 left-6 z-50 shadow-2xl animate-in slide-in-from-bottom-5"><EmojiPicker onEmojiClick={(d) => setCurrentMessage(p => p + d.emoji)} /></div>}

      {/* Input Bar */}
      <div className="p-6 bg-transparent">
        <div className="bg-white/80 backdrop-blur-2xl p-2 rounded-[2.5rem] flex items-center gap-2 border border-white shadow-xl shadow-rose-200/20 focus-within:ring-2 ring-rose-100 transition-all">
          <label className="p-3 text-rose-400 hover:bg-rose-50 rounded-full cursor-pointer transition-all">
            {isUploading ? <Loader2 size={22} className="animate-spin" /> : <Plus size={22} />}
            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
          </label>
          <button onClick={() => setShowEmoji(!showEmoji)} className={`p-3 rounded-full transition-all ${showEmoji ? 'bg-rose-100 text-rose-600' : 'text-rose-400 hover:bg-rose-50'}`}><Smile size={22} /></button>
          <input 
            type="text" 
            value={currentMessage}
            placeholder={isUploading ? "Sending memory..." : "Type your love..."}
            onChange={(e) => {
              setCurrentMessage(e.target.value);
              socket.emit("typing", { room: roomId, userId, typing: e.target.value.length > 0 });
            }}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            className="flex-1 bg-transparent border-none outline-none text-sm text-gray-700 font-medium px-2"
          />
          <button onClick={sendMessage} className={`p-3.5 rounded-full transition-all ${currentMessage.length > 0 ? "bg-rose-500 text-white shadow-lg scale-105" : "bg-gray-100 text-gray-400"}`}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Chat;