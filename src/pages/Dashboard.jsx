import React, { useEffect, useState } from 'react';
import { Heart, LogOut, User, Clock, Calendar as CalendarIcon, Sparkles, Image as ImageIcon, Plus, Trash2, Zap, Gamepad2, Star, ListTodo, CheckCircle2, Circle } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import Chat from '../components/Chat';
import TypingRace from '../components/TypingRace';
import FastestFinger from '../components/FastestFinger';
import MemoryPairs from '../components/MemoryPairs';
import ChessGame from '../components/ChessGame';
import Wishlist from '../components/Wishlist';
import Calendar from '../components/Calendar';
import Sidebar from '../components/Sidebar'; // NAYA: Sidebar Import
import io from 'socket.io-client';
import FloatingHearts from '../components/FloatingHearts'; // NAYA: Import FloatingHearts

const socket = io.connect(import.meta.env.VITE_API_URL);

function Dashboard() {
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')));
  const [partnerEmail, setPartnerEmail] = useState('');
  const [daysTogether, setDaysTogether] = useState(0);
  const [showInput, setShowInput] = useState(false);
  const [tempDate, setTempDate] = useState('');
  const [memories, setMemories] = useState([]);
  const [showMemForm, setShowMemForm] = useState(false);
  const [newMem, setNewMem] = useState({ image: '', caption: '' });
  const [activeTab, setActiveTab] = useState('home');
  const [currentGame, setCurrentGame] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [showHearts, setShowHearts] = useState(false); // NAYA: Hearts state

  const userId = user._id || user.id;
  // ✅ Fix 1: safely extract partnerId as string regardless of object or string
  const partnerId = user.partnerId?._id?.toString() || user.partnerId?.toString() || "";
  // ✅ Fix 2: roomId now uses proper string IDs
  const roomId = [userId.toString(), partnerId.toString()].sort().join("_");

  const moods = [
    { emoji: '😊', label: 'Happy', color: 'bg-yellow-100' },
    { emoji: '🥰', label: 'Romantic', color: 'bg-rose-100' },
    { emoji: '🥺', label: 'Miss You', color: 'bg-blue-100' },
    { emoji: '😡', label: 'Angry', color: 'bg-red-100' },
    { emoji: '😴', label: 'Sleepy', color: 'bg-purple-100' }
  ];

  // --- NAYA FEATURE: LOVE-O-METER LOGIC ---
  const calculateLoveLevel = () => {
    const score = (tasks.filter(t => t.completed).length * 10) + (memories.length * 20);
    const level = Math.floor(score / 100) + 1;
    const progress = score % 100;
    return { level, progress };
  };
  const { level, progress } = calculateLoveLevel();

  // NAYA: Hearts trigger karne ka function
  const triggerHearts = () => {
    setShowHearts(true);
    setTimeout(() => setShowHearts(false), 6000); 
  };

  // --- LOGIC FUNCTIONS (Functions intact) ---
  const fetchTasks = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/routine/${roomId}`);
      setTasks(res.data);
    } catch (err) { console.error("Task fetch error"); }
  };

  const toggleTask = async (id, currentStatus) => {
    try {
      await axios.put(`${import.meta.env.VITE_API_URL}/api/routine/toggle/${id}`, { completed: !currentStatus });
      socket.emit("update_task", { roomId });
      fetchTasks();
    } catch (err) { toast.error("Update failed"); }
  };

  const fetchMemories = async () => {
    try {
      const currentUserId = user._id || user.id;
      const currentPartnerId = user.partnerId?._id || user.partnerId;
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/get-memories`, { params: { userId: currentUserId, partnerId: currentPartnerId } });
      setMemories(res.data);
    } catch (err) { console.error("Memories load fail", err); }
  };

  const fetchUserProfile = async () => {
    try {
      const currentId = user._id || user.id;
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/profile/${currentId}`);
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      if (res.data.anniversaryDate) calculateDays(res.data.anniversaryDate);
    } catch (err) { console.error(err); }
  };

  const calculateDays = (date) => {
    const startDate = new Date(date);
    const today = new Date();
    const days = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    setDaysTogether(days > 0 ? days : 0);
  };

  const handleMoodUpdate = async (newMood) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/update-mood`, { userId: user._id || user.id, mood: newMood });
      toast.success(`Mood: ${newMood}`); fetchUserProfile();
    } catch (err) { toast.error("Mood update fail!"); }
  };

  const handleLogout = () => {
    localStorage.clear();
    toast.success("Logged out!");
    setTimeout(() => { window.location.href = '/'; }, 1000);
  };

  const handleUpdateDate = async () => {
    if (!tempDate) return toast.error("Date choose karo!");
    const loadingToast = toast.loading("Saving...");
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/update-anniversary`, { userId: user._id || user.id, date: tempDate });
      toast.success("Date Locked!", { id: loadingToast });
      fetchUserProfile(); setShowInput(false);
    } catch (err) { toast.error("Error!", { id: loadingToast }); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = () => { setNewMem({ ...newMem, image: reader.result }); };
    }
  };

  const handleAddMemory = async (e) => {
    e.preventDefault();
    if (!newMem.image || !newMem.caption) return toast.error("Bhai photo select karo aur caption dalo!");
    const uploadToast = toast.loading("Uploading...");
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/add-memory`, {
        userId: user._id || user.id, partnerId: user.partnerId?._id || user.partnerId, image: newMem.image, caption: newMem.caption
      });
      toast.success("Locked! 💖", { id: uploadToast });
      setNewMem({ image: '', caption: '' }); setShowMemForm(false); fetchMemories();
    } catch (err) { toast.error("Fail!", { id: uploadToast }); }
  };

  const handleDeleteMemory = (id) => {
    toast((t) => (
      <div className="flex flex-col gap-3">
        <span className="font-medium text-gray-800">Bhai, sach mein delete karni hai? 🥺</span>
        <div className="flex gap-2">
          <button onClick={async () => {
            toast.dismiss(t.id);
            const deleteToast = toast.loading("Deleting...");
            try {
              await axios.delete(`${import.meta.env.VITE_API_URL}/api/auth/delete-memory/${id}`);
              toast.success("Deleted!", { id: deleteToast });
              fetchMemories();
            } catch (err) { toast.error("Fail!", { id: deleteToast }); }
          }} className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold">Haan</button>
          <button onClick={() => toast.dismiss(t.id)} className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs">Nahi</button>
        </div>
      </div>
    ));
  };

  useEffect(() => {
    socket.emit("setup", userId);
    socket.emit("join_chat", roomId);
    socket.on("task_updated", () => { fetchTasks(); });
    
    // NAYA: Nudge Receive Logic with Hearts
    socket.on("receive_nudge", (data) => {
      toast(`${data.senderName} ne aapko ek Virtual Hug bheja! 🤗❤️`, {
        icon: '💖',
        duration: 4000,
        style: {
          borderRadius: '20px',
          background: '#fff0f3',
          color: '#e11d48',
          border: '2px solid #fb7185'
        },
      });
      triggerHearts(); // Trigger hearts on real-time nudge
    });

    // NAYA: Offline nudge check logic
    const checkOfflineNudges = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/check-nudges/${userId}`);
        if (res.data.length > 0) {
          triggerHearts();
          toast("Partner ne aapki absence mein Hug bheja tha! 🤗❤️", { icon: '💖' });
        }
      } catch (err) { console.log("Offline nudge check failed", err); }
    };

    fetchTasks();
    fetchMemories();
    checkOfflineNudges(); // Check for missed hugs on mount
    if (user?.anniversaryDate) calculateDays(user.anniversaryDate);

    return () => {
      socket.off("receive_nudge");
      socket.off("task_updated");
    };
  }, [roomId, userId]);

  const sendNudge = async () => {
    try {
      // 1. Send via Socket (Real-time)
      socket.emit("send_nudge", { 
        roomId, 
        senderName: user.name 
      });

      // 2. Save to DB (For Offline Support)
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/send-nudge`, {
        senderId: userId,
        receiverId: partnerId,
        roomId: roomId
      });

      toast.success("Hug Bheja Gaya! ❤️");
    } catch (err) {
      console.error(err);
      toast.error("Hug deliver nahi ho paya!");
    }
  };

  const glassStyle = "bg-white/70 backdrop-blur-2xl border border-white/50 shadow-xl";

  return (
    <div className="min-h-screen bg-[#fff0f3] flex gap-6 p-4 md:p-6 lg:p-8 font-sans overflow-x-hidden relative">
      
      {/* NAYA: Floating Hearts Component */}
      {showHearts && <FloatingHearts />}

      {/* --- SIDEBAR COMPONENT --- */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        handleLogout={handleLogout}
        sendNudge={sendNudge}
      />

      <main className="flex-1 flex flex-col gap-6 overflow-y-auto">
        <nav className={`${glassStyle} p-4 px-8 rounded-[2rem] flex justify-between items-center`}>
          <div className="lg:hidden font-black text-rose-500 italic">Love-Verse</div>
          <div className="hidden lg:block text-xs font-bold text-gray-400 uppercase tracking-widest italic font-sans">
            "Your digital home for love"
          </div>
          <button onClick={handleLogout} className="lg:hidden text-gray-400"><LogOut size={20} /></button>
        </nav>

        {/* --- DYNAMIC TABS --- */}
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            
            {/* LOVE-O-METER UI CARD */}
            <div className={`${glassStyle} p-6 rounded-[2.5rem] relative overflow-hidden group`}>
               <div className="flex justify-between items-end mb-4 relative z-10">
                <div>
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Love Connection</p>
                  <h4 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                    Level {level} <span className="text-sm font-bold text-rose-300 italic">— Stronger Together</span>
                  </h4>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-gray-400 uppercase">XP to Next Level</p>
                  <p className="text-xs font-bold text-gray-600">{100 - progress} pts</p>
                </div>
              </div>
              <div className="h-4 bg-rose-50 rounded-full border border-rose-100 p-1 relative z-10">
                <div 
                  className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className={`lg:col-span-4 ${glassStyle} p-8 rounded-[3rem] text-center flex flex-col items-center justify-center relative overflow-hidden`}>
                <div className="absolute top-4 right-4 text-rose-200 animate-pulse"><Star size={24} fill="currentColor" /></div>
                <div className="w-24 h-24 bg-gradient-to-tr from-rose-500 to-pink-400 rounded-full mb-4 flex items-center justify-center text-white text-4xl font-black border-4 border-white shadow-xl">
                  {user?.name?.charAt(0)}
                </div>
                <h2 className="text-2xl font-black text-gray-800 tracking-tight">{user?.name}</h2>
                <div className="mt-3 px-4 py-1.5 bg-rose-50 rounded-full text-rose-500 font-bold text-[10px] uppercase tracking-widest border border-rose-100">
                  Mood: {user?.mood || 'Happy 😊'}
                </div>
              </div>

              <div className="lg:col-span-8 bg-gradient-to-br from-rose-500 to-pink-600 rounded-[3.5rem] p-8 text-white relative overflow-hidden shadow-2xl min-h-[300px] flex flex-col justify-center group">
                <Heart className="absolute -bottom-10 -left-10 opacity-10 group-hover:scale-110 transition-transform duration-1000" size={300} fill="white" />
                <div className="relative z-10 text-center lg:text-left lg:pl-10">
                  <h3 className="text-xs font-black mb-2 uppercase tracking-[0.3em] opacity-80 flex items-center gap-2"><Clock size={16} /> Together Since</h3>
                  <div className="flex items-baseline gap-4">
                    <span className="text-[8rem] font-black leading-none tracking-tighter drop-shadow-2xl">{daysTogether}</span>
                    <span className="text-2xl font-bold opacity-80 italic">Days</span>
                  </div>
                  <div className="mt-6">
                    {!showInput ? (
                      <button onClick={() => setShowInput(true)} className="bg-white/20 backdrop-blur-md text-white px-6 py-3 rounded-2xl font-black text-xs border border-white/30 flex items-center gap-2 hover:bg-white/30 transition-all">
                        <CalendarIcon size={16} /> {user?.anniversaryDate ? "Change Date" : "Set Anniversary"}
                      </button>
                    ) : (
                      <div className="flex gap-2 bg-white/20 p-3 rounded-2xl backdrop-blur-lg border border-white/30 inline-flex items-center">
                        <input type="date" value={tempDate} onChange={(e) => setTempDate(e.target.value)} className="bg-white text-gray-800 p-2 rounded-xl outline-none font-bold text-xs" />
                        <button onClick={handleUpdateDate} className="bg-white text-rose-500 px-4 py-2 rounded-xl font-black text-xs shadow-lg">Lock</button>
                        <button onClick={() => setShowInput(false)} className="text-white px-2 font-bold text-lg">×</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Mood & Partner Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={`${glassStyle} p-8 rounded-[3rem]`}>
                <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2"><Sparkles className="text-rose-400" size={20} /> Current Mood</h3>
                <div className="flex flex-wrap gap-3">
                  {moods.map((m) => (
                    <button key={m.label} onClick={() => handleMoodUpdate(`${m.emoji} ${m.label}`)} className={`text-2xl p-4 rounded-2xl transition-all hover:scale-110 shadow-sm ${m.color}`}>
                      {m.emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div className={`${glassStyle} p-8 rounded-[3rem]`}>
                <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><User className="text-rose-400" size={20} /> Partner Status</h3>
                {user.partnerId ? (
                  <div className="space-y-2">
                    <p className="text-rose-400 font-bold text-[10px] tracking-widest uppercase flex items-center gap-1"><Heart size={10} fill="currentColor" /> Linked ❤️</p>
                    <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 shadow-inner">
                      <p className="text-[10px] text-rose-400 uppercase font-black mb-1">Partner's Mood</p>
                      <p className="text-xl font-bold text-gray-800">{user.partnerId?.mood || "Normal 😊"}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input type="email" placeholder="Partner's Email" value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} className="flex-1 p-3 bg-white rounded-xl border border-gray-100 outline-none text-sm focus:ring-1 ring-rose-200" />
                    <button className="bg-gray-900 text-white px-4 py-2 rounded-xl font-bold text-xs">Invite</button>
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`${glassStyle} p-5 rounded-[2rem] text-center`}>
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Memories</p>
                <p className="text-2xl font-black text-rose-500">{memories.length}</p>
              </div>
              <div className={`${glassStyle} p-5 rounded-[2rem] text-center`}>
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Routine</p>
                <p className="text-2xl font-black text-rose-500">{tasks.length}</p>
              </div>
              <div className={`${glassStyle} p-5 rounded-[2rem] text-center`}>
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Level</p>
                <p className="text-2xl font-black text-rose-500">{level}</p>
              </div>
              <div className={`${glassStyle} p-5 rounded-[2rem] text-center`}>
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Milestone</p>
                <p className="text-2xl font-black text-rose-500">Gold</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'routine' && (
          <div className="max-w-4xl mx-auto w-full space-y-6 animate-in slide-in-from-right duration-500">
            <div className="flex items-center justify-between px-4">
              <h3 className="text-3xl font-black text-gray-800 flex items-center gap-3 italic">
                <ListTodo className="text-rose-500" size={32} /> Daily Routine
              </h3>
              <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border border-rose-100">
                <span className="text-xs font-bold text-rose-500 uppercase tracking-tighter">
                  Tasks Done: {tasks.filter(t => t.completed).length}/{tasks.length}
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              {tasks.map((task) => (
                <div key={task._id} className={`${glassStyle} p-6 rounded-[2rem] flex items-center justify-between group transition-all hover:scale-[1.01]`}>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleTask(task._id, task.completed)}
                      className={`p-1 rounded-xl transition-all ${task.completed ? 'text-green-500' : 'text-gray-300 hover:text-rose-400'}`}
                    >
                      {task.completed ? <CheckCircle2 size={28} /> : <Circle size={28} />}
                    </button>
                    <span className={`text-lg font-bold ${task.completed ? 'text-gray-400 line-through italic' : 'text-gray-700'}`}>
                      {task.text}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-black text-gray-400 uppercase bg-gray-50 px-3 py-1 rounded-full">
                      Added by {task.addedBy === userId ? 'Me' : 'Partner'}
                    </span>
                  </div>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="py-20 text-center text-gray-400 font-bold italic">
                  Abhi koi task nahi hai. Chat panel mein jaakar "+" button dabao! ✨
                </div>
              )}
            </div>
          </div>
        )}

        {/* --- GAMES TAB --- */}
        {activeTab === 'games' && (
          <div className="max-w-6xl mx-auto w-full pb-20 px-4">
            {currentGame === 'typing' ? (
              <TypingRace user={user} roomId={roomId} onBack={() => setCurrentGame(null)} />
            ) : currentGame === 'reaction' ? (
              <FastestFinger user={user} roomId={roomId} onBack={() => setCurrentGame(null)} />
            ) : currentGame === 'memory' ? (
              <MemoryPairs user={user} roomId={roomId} onBack={() => setCurrentGame(null)} />
            ) : currentGame === 'chess' ? (
              <ChessGame
                user={user}
                roomId={roomId}
                onBack={() => setCurrentGame(null)}
                isWhite={userId.toString() < partnerId.toString()}
              />
            ) : (
              <div className="space-y-10 animate-in slide-in-from-right duration-500">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-100 rounded-full text-rose-500 font-black text-[10px] uppercase tracking-[0.2em]">
                    <Zap size={14} className="fill-current" /> Live 1v1 Battle
                  </div>
                  <h3 className="text-4xl md:text-5xl font-black text-gray-800 italic flex items-center justify-center gap-4">
                    <Gamepad2 className="text-rose-500" size={48} /> Play Zone
                  </h3>
                  <p className="text-gray-500 font-bold text-sm italic">"Chalo dekhte hain kaun jitta hai! ❤️"</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  <div className={`${glassStyle} group p-8 rounded-[3.5rem] hover:scale-[1.03] transition-all border-2 border-transparent hover:border-blue-200 relative overflow-hidden`}>
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner"><span className="text-3xl">♟️</span></div>
                    <h4 className="text-2xl font-black text-gray-800 mb-2">Grandmaster Chess</h4>
                    <p className="text-xs text-gray-500 font-bold leading-relaxed mb-6 uppercase tracking-tighter">Real-time Moves • Rule Enforcement</p>
                    <button
                      onClick={() => setCurrentGame('chess')}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs group-hover:bg-blue-600 transition-all shadow-lg"
                    >
                      Challenge Now
                    </button>
                  </div>

                  <div className={`${glassStyle} group p-8 rounded-[3.5rem] hover:scale-[1.03] transition-all border-2 border-transparent hover:border-yellow-300 relative overflow-hidden`}>
                    <div className="w-16 h-16 bg-yellow-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner"><span className="text-3xl">🌈</span></div>
                    <h4 className="text-2xl font-black text-gray-800 mb-2">Love-UNO</h4>
                    <p className="text-xs text-gray-500 font-bold leading-relaxed mb-6 uppercase tracking-tighter">Fast Paced • Fun</p>
                    <button className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs group-hover:bg-yellow-500 transition-all shadow-lg">Draw Four!</button>
                  </div>

                  <div className={`${glassStyle} group p-8 rounded-[3.5rem] hover:scale-[1.03] transition-all border-2 border-transparent hover:border-emerald-200 relative overflow-hidden shadow-emerald-100/50`}>
                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner"><span className="text-3xl">⚡</span></div>
                    <h4 className="text-2xl font-black text-gray-800 mb-2">Typing Speedster</h4>
                    <p className="text-xs text-gray-500 font-bold leading-relaxed mb-6 uppercase tracking-tighter">Live Progress • Speed Battle</p>
                    <button
                      onClick={() => setCurrentGame('typing')}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs group-hover:bg-emerald-600 transition-all shadow-lg"
                    >
                      Start Typing
                    </button>
                  </div>

                  <div className={`${glassStyle} group p-8 rounded-[3.5rem] hover:scale-[1.03] transition-all border-2 border-transparent hover:border-purple-200 relative overflow-hidden shadow-purple-100/50`}>
                    <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner"><span className="text-3xl">🎯</span></div>
                    <h4 className="text-2xl font-black text-gray-800 mb-2">Fastest Finger</h4>
                    <p className="text-xs text-gray-500 font-bold leading-relaxed mb-6 uppercase tracking-tighter">Reflex Test • Milliseconds</p>
                    <button
                      onClick={() => setCurrentGame('reaction')}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs group-hover:bg-purple-600 transition-all shadow-lg"
                    >
                      Test Reflexes
                    </button>
                  </div>

                  <div className={`${glassStyle} group p-8 rounded-[3.5rem] hover:scale-[1.03] transition-all border-2 border-transparent hover:border-pink-200 relative overflow-hidden shadow-pink-100/50`}>
                    <div className="w-16 h-16 bg-pink-100 rounded-2xl flex items-center justify-center mb-6 shadow-inner"><span className="text-3xl">🧠</span></div>
                    <h4 className="text-2xl font-black text-gray-800 mb-2">Memory Pairs</h4>
                    <p className="text-xs text-gray-500 font-bold leading-relaxed mb-6 uppercase tracking-tighter">Cute Icons • Turn Based</p>
                    <button
                      onClick={() => setCurrentGame('memory')}
                      className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs group-hover:bg-pink-600 transition-all shadow-lg"
                    >
                      Flip Cards
                    </button>
                  </div>

                  <div className="border-4 border-dashed border-rose-200 p-8 rounded-[3.5rem] flex flex-col items-center justify-center text-center group bg-white/30">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm group-hover:rotate-180 transition-transform duration-500"><Plus className="text-rose-300" size={32} /></div>
                    <p className="text-xs font-black text-rose-300 uppercase tracking-[0.3em]">Next Game Loading...</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'wishlist' && (
          <div className="max-w-6xl mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-500">
            <Wishlist user={user} roomId={roomId} />
          </div>
        )}
        {activeTab === 'calendar' && <Calendar user={user} roomId={roomId} socket={socket} />}

        {activeTab === 'memories_tab' && (
          <div className="space-y-6 pb-20 animate-in fade-in slide-in-from-right-4 duration-500 px-4">
            <div className="flex justify-between items-center">
              <h3 className="text-3xl font-black text-gray-800 flex items-center gap-3">
                <ImageIcon className="text-rose-500" size={32} /> Our Memories
              </h3>
              <button onClick={() => setShowMemForm(!showMemForm)} className="bg-rose-500 text-white p-4 rounded-2xl shadow-lg hover:rotate-90 transition-all duration-300">
                <Plus size={24} />
              </button>
            </div>

            {showMemForm && (
              <form onSubmit={handleAddMemory} className="bg-white p-8 rounded-[2.5rem] shadow-xl border-2 border-dashed border-rose-200 animate-in zoom-in-95">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Choose Memory</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full p-3 bg-gray-50 rounded-2xl text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-rose-50 file:text-rose-600" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase ml-2">Cute Caption</label>
                    <input type="text" placeholder="Write something sweet..." value={newMem.caption} onChange={(e) => setNewMem({ ...newMem, caption: e.target.value })} className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-1 ring-rose-200" />
                  </div>
                </div>
                <button type="submit" className="w-full mt-6 bg-gray-900 text-white py-4 rounded-2xl font-bold">Upload to Our Verse</button>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {memories.map((mem, index) => (
                <div key={mem._id} className={`group relative bg-white p-4 pb-12 shadow-2xl transition-all duration-500 hover:rotate-0 hover:scale-105 ${index % 2 === 0 ? '-rotate-2' : 'rotate-2'}`}>
                  <button onClick={() => handleDeleteMemory(mem._id)} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 z-10 transition-opacity cursor-pointer shadow-lg"><Trash2 size={18} /></button>
                  <div className="aspect-square overflow-hidden rounded-3xl mb-4 border border-gray-50 shadow-inner">
                    <img src={mem.imageUrl} alt="memory" className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-500" />
                  </div>
                  <p className="font-medium text-gray-800 text-center italic tracking-tight px-2">"{mem.caption}"</p>
                  <p className="text-[9px] text-gray-400 text-center mt-3 font-bold uppercase tracking-tighter">{new Date(mem.createdAt).toDateString()}</p>
                </div>
              ))}
              {memories.length === 0 && (
                <div className="col-span-full py-20 text-center text-gray-400 font-bold italic">Bhai, koi memory nahi hai. First photo upload karo! 📸</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'chat' && (
          <div className="h-[80vh] flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
            <Chat user={user} />
          </div>
        )}
      </main>
    </div>
  );
}

export default Dashboard;