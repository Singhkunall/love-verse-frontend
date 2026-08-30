import React, { useEffect, useState } from 'react';
import { Heart, LogOut, User, Clock, Calendar as CalendarIcon, Sparkles, Image as ImageIcon, Plus, Trash2, Zap, Gamepad2, Star, ListTodo, CheckCircle2, Circle, ChevronRight, Radio, Touchpad, PlaySquare, MessageSquare, Bell, Lock, Trophy, Shield } from 'lucide-react';
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
import LoveRoulette from '../components/LoveRoulette';
import WatchTogether from '../components/WatchTogether';
import Ludo from '../components/Ludo';
import UniverseMap from '../components/UniverseMap';
import VirtualTouch from '../components/VirtualTouch';
import NotificationCenter from '../components/NotificationCenter';
import SecurityLock from '../components/SecurityLock';
import AnniversaryModal from '../components/AnniversaryModal';
import LoveDoodleBoard from '../components/LoveDoodleBoard';
import { mobileService } from '../utils/mobileService';
import API_URL from '../utils/config';
import { compressImage } from '../utils/imageCompressor';

const socket = io.connect(API_URL);

class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Tab Error caught:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 bg-white/90 backdrop-blur-xl rounded-3xl border border-rose-200 text-center space-y-3 my-4">
          <span className="text-4xl">🍿</span>
          <h4 className="text-xl font-bold text-gray-800">Watch Together Ready</h4>
          <p className="text-xs text-gray-500 font-medium">Tap below to reload Watch Together</p>
          <button onClick={() => this.setState({ hasError: false })} className="px-5 py-2.5 bg-rose-50 text-rose-600 rounded-2xl font-bold text-xs shadow-md">
            Reload Stream 🍿
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Dashboard() {
  const glassStyle = "bg-white/70 backdrop-blur-2xl border border-white/50 shadow-xl";
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || {});
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
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifs, setNotifs] = useState([
    { type: 'hug', title: 'Partner Hug Sent ❤️', text: 'Partner sent a warm virtual hug!', time: '10m ago' },
    { type: 'mood', title: 'Partner Mood Updated 😊', text: 'Partner is feeling Romantic today!', time: '1h ago' }
  ]);
  const [showSecurityLock, setShowSecurityLock] = useState(false);
  const [showAnniversaryModal, setShowAnniversaryModal] = useState(false);

  const userId = user?._id || user?.id || "guest";
  // ✅ Fix 1: safely extract partnerId as string regardless of object or string
  const partnerId = user?.partnerId?._id?.toString() || user?.partnerId?.toString() || "";
  // ✅ Fix 2: roomId now uses proper string IDs safely
  const roomId = [String(userId), String(partnerId)].sort().join("_");

  const partnerName = (typeof user?.partnerId === 'object' && user?.partnerId?.name)
    || user?.partnerName
    || (user?.partnerEmail ? user.partnerEmail.split('@')[0] : "Partner");

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
      toast.success(`Mood: ${newMood}`);
      fetchUserProfile();
      // Real-time partner ko notify karo
      socket.emit("mood_updated", { roomId, mood: newMood, partnerId });
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
      socket.emit("anniversary_updated", { roomId, partnerId });
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
    if (!newMem.image || !newMem.caption) return toast.error("Photo select karo aur caption dalo!");
    const uploadToast = toast.loading("Uploading memory...");
    try {
      const compressedImg = await compressImage(newMem.image);
      await axios.post(`${API_URL}/api/auth/add-memory`, {
        userId: user._id || user.id,
        partnerId: user.partnerId?._id || user.partnerId,
        image: compressedImg,
        caption: newMem.caption
      });
      toast.success("Memory Saved! 💖", { id: uploadToast });
      setNewMem({ image: '', caption: '' });
      setShowMemForm(false);
      fetchMemories();
    } catch (err) {
      console.error("Add memory error:", err);
      toast.error("Memory upload fail!", { id: uploadToast });
    }
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

    mobileService.requestNotificationPermission();

    socket.on("partner_connected", () => {
      fetchUserProfile();
      toast.success("Partner connect ho gaya! ❤️");
      mobileService.sendNotification("Partner Connected! ❤️", "Partner is now online in your sanctuary!", "❤️");
      setNotifs(prev => [{ type: 'love', title: 'Partner Online ❤️', text: 'Partner joined your sanctuary!', time: 'Just now' }, ...prev]);
    });

    socket.on("partner_mood_updated", (data) => {
      fetchUserProfile();
      const moodStr = data?.mood || "updated mood";
      mobileService.sendNotification("Partner Mood Update 😊", `Partner is feeling ${moodStr}!`, "😊");
      setNotifs(prev => [{ type: 'mood', title: 'Partner Mood Update 😊', text: `Partner is feeling ${moodStr}!`, time: 'Just now' }, ...prev]);
    });

    socket.on("partner_avatar_updated", () => {
      fetchUserProfile();
    });

    // NAYA: Nudge Receive Logic with Hearts & Native Notification
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
      triggerHearts();
      mobileService.sendNotification("Partner Hug ❤️", `${data.senderName || 'Partner'} sent you a warm virtual hug!`, "❤️");
      setNotifs(prev => [{ type: 'hug', title: 'Partner Hug Sent ❤️', text: `${data.senderName || 'Partner'} sent a virtual hug!`, time: 'Just now' }, ...prev]);
    });

    // 1-YEAR ANNIVERSARY SOCKET LISTENERS
    socket.on("receive_anniversary_toast", (data) => {
      toast.success(`${data.senderName || 'Partner'} ne 1-Year Anniversary Toast & Fireworks bheja hai! 🥂🎉`, { duration: 6000 });
      triggerHearts();
      setShowAnniversaryModal(true);
      mobileService.sendNotification(
        "HAPPY 1st ANNIVERSARY! 🎉❤️🥂",
        `${data.senderName || 'Partner'} sent a 1-Year Anniversary Toast & Fireworks! Tap to celebrate!`,
        "🥂"
      );
      setNotifs(prev => [{ type: 'love', title: '1-Year Anniversary Toast 🥂', text: `${data.senderName || 'Partner'} sent Anniversary Toast & Fireworks!`, time: 'Just now' }, ...prev]);
    });

    socket.on("receive_anniversary_letter", (data) => {
      toast.success(`${data.senderName || 'Partner'} ne 1-Year Anniversary Love Letter likha hai! 💌💖`, { duration: 6000 });
      triggerHearts();
      mobileService.sendNotification(
        "1-Year Anniversary Love Letter 💌",
        `${data.senderName || 'Partner'} wrote a secret 1-Year Anniversary letter for you!`,
        "💌"
      );
      setNotifs(prev => [{ type: 'love', title: 'Anniversary Love Letter 💌', text: `${data.senderName || 'Partner'} wrote a secret 1-Year letter!`, time: 'Just now' }, ...prev]);
    });

    // NAYA: Offline nudge check logic
    const checkOfflineNudges = async () => {
      try {
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/check-nudges/${userId}`);
        if (res.data.length > 0) {
          triggerHearts();
          toast("Partner ne aapki absence mein Hug bheja tha! 🤗❤️", { icon: '💖' });
          mobileService.sendNotification("Missed Partner Hug ❤️", "Partner sent you a hug while you were away!", "❤️");
        }
      } catch (err) { console.log("Offline nudge check failed", err); }
    };

    fetchUserProfile();
    fetchTasks();
    fetchMemories();
    checkOfflineNudges();
    if (user?.anniversaryDate) calculateDays(user.anniversaryDate);

    return () => {
      socket.off("receive_nudge");
      socket.off("task_updated");
      socket.off("partner_connected");
      socket.off("partner_mood_updated");
      socket.off("partner_avatar_updated");
      socket.off("receive_anniversary_toast");
      socket.off("receive_anniversary_letter");
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

  const handleConnect = async () => {
    if (!partnerEmail) return toast.error("Partner ka email daalo!");
    const loadId = toast.loading("Connecting...");
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/connect`, {
        userId: userId,
        partnerEmail: partnerEmail
      });
      toast.success(res.data.message, { id: loadId });
      fetchUserProfile();
    } catch (err) {
      toast.error("Connect fail ho gaya!", { id: loadId });
    }
  };
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      try {
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/update-avatar`, {
          userId,
          avatar: reader.result
        });
        // Apna UI turant update karo
        const updatedUser = { ...user, avatar: res.data.avatar };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));

        // Partner ko notify karo
        // partnerId se emit karo roomId ki jagah
        socket.emit("avatar_updated", { partnerId });

        toast.success("Profile photo updated! 🎉");
      } catch (err) {
        toast.error("Upload failed!");
      }
      setUploadingAvatar(false);
    };
  };

  const handleSendAnniversaryToast = () => {
    socket.emit("send_anniversary_toast", { roomId, senderName: user.name || "Your Love" });
    triggerHearts();
    toast.success("1-Year Anniversary Phone Notification Sent to Partner! 🥂🎉", { duration: 5000 });
  };

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
        onSendAnniversaryToast={handleSendAnniversaryToast}
      />

      <main className="flex-1 flex flex-col gap-6 overflow-y-auto">
        {/* --- TOP NAVBAR HEADER --- */}
        <nav className={`${glassStyle} p-3.5 px-5 md:px-8 rounded-[2.2rem] flex justify-between items-center z-20`}>
          {/* Mobile App Branding */}
          <div className="lg:hidden">
            <p className="text-[11px] font-bold text-gray-500">Hello, {user?.name || 'Kunal'} 👋</p>
            <h1 className="text-xl font-black tracking-tight text-gray-900 flex items-center gap-1 font-sans">
              <span>Love</span>
              <span className="text-pink-500">-Verse</span>
              <Heart size={14} className="text-pink-500 fill-pink-500 inline ml-0.5" />
            </h1>
          </div>

          {/* Desktop Web Branding */}
          <div className="hidden lg:block font-serif italic font-black text-rose-600 text-2xl tracking-tight">
            Love-Verse
          </div>
          <div className="hidden lg:block text-xs font-bold text-gray-400 uppercase tracking-widest italic font-sans">
            "Your digital home for love"
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* 1. Notification Bell */}
            <button
              onClick={() => setShowNotifs(true)}
              className="relative p-2.5 rounded-full bg-[#ffeef2] text-rose-600 hover:bg-rose-100 border border-rose-100/80 shadow-sm transition-all active:scale-95 flex items-center justify-center"
              title="Activity Center"
            >
              <Bell size={18} />
              {notifs.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-black text-[9px] flex items-center justify-center animate-pulse">
                  {notifs.length}
                </span>
              )}
            </button>

            {/* 2. Security Lock */}
            <button
              onClick={() => setShowSecurityLock(true)}
              className="p-2.5 rounded-full bg-white hover:bg-rose-50 text-gray-700 hover:text-rose-500 border border-rose-100/80 shadow-sm transition-all active:scale-95 flex items-center justify-center"
              title="Security PIN Lock"
            >
              <Lock size={18} />
            </button>

            {/* 3. User Avatar Initials Pill */}
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-pink-600 to-rose-500 text-white font-black text-xs flex items-center justify-center border-2 border-white shadow-md lg:hidden">
              {user?.name?.charAt(0) || 'K'}
            </div>

            {/* 4. Logout Button */}
            <button 
              onClick={handleLogout} 
              className="p-2.5 rounded-full bg-white hover:bg-rose-50 text-gray-400 hover:text-rose-500 border border-rose-100/80 shadow-sm transition-all active:scale-95 flex items-center justify-center lg:hidden"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </nav>

        {/* In-App Notification Center Drawer */}
        <NotificationCenter
          isOpen={showNotifs}
          onClose={() => setShowNotifs(false)}
          notifications={notifs}
          onClearAll={() => setNotifs([])}
        />

        {/* Security Passcode Modal */}
        <SecurityLock
          isOpen={showSecurityLock}
          onClose={() => setShowSecurityLock(false)}
          onUnlock={() => setShowSecurityLock(false)}
        />

        {/* 1-Year Anniversary Celebration Modal */}
        <AnniversaryModal
          isOpen={showAnniversaryModal}
          onClose={() => setShowAnniversaryModal(false)}
          user={user}
          partnerName={partnerName}
          socket={socket}
          roomId={roomId}
        />

        {/* --- DYNAMIC TABS --- */}
        {activeTab === 'home' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">

            {/* ========================================================================= */}
            {/* MOBILE APP ONLY VIEW (lg:hidden): Matches Screenshot Reference 1-to-1 */}
            {/* ========================================================================= */}
            <div className="lg:hidden space-y-4">

            {/* 1. HERO DAYS TOGETHER CARD (Matches reference screenshot 1-to-1) */}
            <div className="bg-gradient-to-r from-[#4d0b22] via-[#6d1334] to-[#360618] text-white rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden border border-pink-500/20 space-y-4">
              
              {/* Bright Vivid Couple Sunset Heart Graphic (Matches reference screenshot 1-to-1) */}
              <div className="absolute top-0 right-0 w-52 md:w-72 h-full pointer-events-none z-0 overflow-hidden rounded-r-[2.5rem]">
                <svg viewBox="0 0 220 200" className="w-full h-full">
                  <defs>
                    <radialGradient id="heroHeartSun" cx="50%" cy="45%" r="55%">
                      <stop offset="0%" stopColor="#ffccd5" stopOpacity="1" />
                      <stop offset="45%" stopColor="#ff4d8d" stopOpacity="0.95" />
                      <stop offset="85%" stopColor="#c41253" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#540826" stopOpacity="0" />
                    </radialGradient>
                  </defs>

                  {/* Big Glowing Pink Heart Sun in Sky */}
                  <path
                    d="M 140,140 C 85,95 50,55 50,28 C 50,8 70,-8 96,-8 C 112,-8 127,0 135,10 C 143,0 158,-8 174,-8 C 200,-8 220,8 220,28 C 220,55 185,95 140,140 Z"
                    fill="url(#heroHeartSun)"
                  />
                  <path
                    d="M 140,125 C 95,85 65,50 65,25 C 65,8 80,-4 100,-4 C 112,-4 125,2 135,10 C 145,2 158,-4 170,-4 C 190,-4 205,8 205,25 C 205,50 175,85 140,125 Z"
                    fill="#ffe3ea"
                    opacity="0.95"
                  />

                  {/* Glowing Star Sparkles */}
                  <circle cx="100" cy="15" r="2.5" fill="#ffffff" opacity="0.95" />
                  <circle cx="175" cy="20" r="2.5" fill="#ffffff" opacity="0.95" />
                  <circle cx="75" cy="40" r="2" fill="#ffe3ea" opacity="0.9" />

                  {/* Dark Hill Ground with Trees Contour */}
                  <path
                    d="M 20,175 C 80,135 150,135 220,165 L 220,200 L 20,200 Z"
                    fill="#360416"
                  />
                  <path
                    d="M 60,180 C 110,145 180,145 220,175 L 220,200 L 60,200 Z"
                    fill="#170108"
                  />

                  {/* Male Silhouette */}
                  <path
                    d="M 125,138 C 125,128 131,120 136,120 C 141,120 145,128 145,138 L 143,162 L 125,162 Z"
                    fill="#080004"
                  />
                  <circle cx="135.5" cy="114" r="5.5" fill="#080004" />

                  {/* Female Silhouette sitting beside him */}
                  <path
                    d="M 147,140 C 147,130 153,122 158,122 C 163,122 167,130 167,140 L 165,162 L 147,162 Z"
                    fill="#080004"
                  />
                  <circle cx="157.5" cy="116" r="5" fill="#080004" />
                  <path d="M 154,117 Q 164,123 162,133" stroke="#080004" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </div>

              {/* Header inside Hero */}
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-pink-200/90">
                  <Heart size={12} className="text-pink-400 fill-pink-400" /> TOGETHER, STILL COUNTING
                </div>
                <div className="flex items-center gap-1 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/20 text-[10px] font-bold">
                  <span>Lvl {level}</span>
                  <Shield size={10} className="text-amber-300 fill-amber-300" />
                </div>
              </div>

              {/* Days Count */}
              <div className="relative z-10">
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-5xl md:text-6xl font-black tracking-tight text-white drop-shadow-md">{daysTogether}</span>
                  <span className="font-serif italic text-2xl text-pink-200 font-light">days</span>
                </div>
                <p className="text-xs text-pink-100/80 font-medium mt-1">
                  Since {user?.anniversaryDate ? new Date(user.anniversaryDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Aug 29'} • Level {level}, stronger every day
                </p>
              </div>

              {/* 2 Hero Action Buttons */}
              <div className="flex items-center gap-2 pt-2 relative z-10">
                {!showInput ? (
                  <button
                    onClick={() => setShowInput(true)}
                    className="flex-1 py-2.5 px-4 bg-white/10 hover:bg-white/20 border border-white/30 backdrop-blur-md rounded-full font-bold text-xs text-white flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    <CalendarIcon size={14} /> Change date
                  </button>
                ) : (
                  <div className="flex-1 flex gap-1 bg-white/10 p-1.5 rounded-full border border-white/30">
                    <input type="date" value={tempDate} onChange={(e) => setTempDate(e.target.value)} className="bg-white text-gray-800 p-1 rounded-full text-xs flex-1 font-bold outline-none" />
                    <button onClick={handleUpdateDate} className="bg-rose-500 text-white px-3 rounded-full font-black text-xs">Lock</button>
                    <button onClick={() => setShowInput(false)} className="text-white px-2 font-bold">×</button>
                  </div>
                )}

                <button
                  onClick={() => setActiveTab('memories_tab')}
                  className="flex-1 py-2.5 px-4 bg-gradient-to-r from-amber-400 via-rose-500 to-pink-500 text-white rounded-full font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 transition-all active:scale-95 hover:brightness-110"
                >
                  <Sparkles size={14} /> Add a memory
                </button>
              </div>
            </div>

            {/* 2. YOUR MOOD TODAY (Matches reference screenshot 1-to-1) */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 px-1 text-[10px] font-black tracking-widest text-gray-400 uppercase">
                <Sparkles size={12} className="text-pink-500" /> YOUR MOOD TODAY
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {moods.map((m) => {
                  const isSelected = user?.mood?.includes(m.label);
                  return (
                    <button
                      key={m.label}
                      onClick={() => handleMoodUpdate(`${m.emoji} ${m.label}`)}
                      className={`flex flex-col items-center justify-center px-4 py-3 rounded-2xl border transition-all shrink-0 min-w-[76px] app-touch-active ${
                        isSelected
                          ? 'bg-rose-50/90 border-rose-400 ring-2 ring-rose-300 text-rose-600 font-black shadow-sm scale-105'
                          : 'bg-white border-gray-100 text-gray-500 hover:bg-rose-50/40 font-bold'
                      }`}
                    >
                      <span className="text-2xl mb-1">{m.emoji}</span>
                      <span className="text-[9px] uppercase tracking-tight">{m.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. PARTNER LIVE STATUS CARD (Matches reference screenshot 1-to-1) */}
            <div className="bg-[#181a29] text-white p-3.5 rounded-3xl flex items-center justify-between shadow-xl border border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center font-black text-white text-base border-2 border-white shadow-md overflow-hidden">
                    {user?.partnerId?.avatar ? (
                      <img src={user.partnerId.avatar} alt="Partner" className="w-full h-full object-cover" />
                    ) : (
                      user?.partnerId?.name?.charAt(0) || 'P'
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#181a29] rounded-full animate-pulse" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-black text-white truncate leading-tight">{user?.partnerId?.name || partnerName || 'Kunal Kumar'}</h4>
                  <p className="text-xs text-rose-300 font-medium truncate mt-0.5 flex items-center gap-1">
                    <span>🥰 Romantic</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('chat')}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all active:scale-95 shrink-0 ml-2 relative"
                title="Chat with Partner"
              >
                <MessageSquare size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" />
              </button>
            </div>

            {/* 4. STATS GRID WIDGETS (Matches reference screenshot 1-to-1) */}
            <div className="grid grid-cols-12 gap-3">
              {/* Left Widget: Connection Level */}
              <div className="col-span-6 bg-white p-4 rounded-3xl border border-rose-100/60 shadow-sm flex flex-col justify-between space-y-3 relative overflow-hidden">
                <div>
                  <div className="flex items-center gap-1 text-[9px] font-black text-pink-500 uppercase tracking-widest mb-1">
                    <Zap size={12} /> CONNECTION LEVEL
                  </div>
                  <h3 className="font-serif text-3xl font-black text-gray-900">Lvl {level}</h3>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-500 mb-1 leading-none">{progress} / 100 XP to Lvl {level + 1}</p>
                  <div className="h-2.5 bg-rose-100/70 rounded-full overflow-hidden p-0.5">
                    <div className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
                  </div>
                </div>
                {/* Floating background heart illustration */}
                <div className="absolute right-2 top-3 opacity-15 pointer-events-none">
                  <Heart size={44} className="text-pink-400 fill-pink-400" />
                </div>
              </div>

              {/* Right Column: Memories & Milestone */}
              <div className="col-span-6 flex flex-col gap-3">
                {/* Memories Saved Card */}
                <div className="bg-white p-3.5 rounded-3xl border border-rose-100/60 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">🖼️ MEMORIES</p>
                    <p className="font-serif text-2xl font-black text-gray-900 leading-none mt-1">{memories.length}</p>
                    <p className="text-[8px] font-semibold text-gray-400 mt-0.5">Memories saved</p>
                  </div>
                  <div className="w-9 h-9 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center font-black text-xs shrink-0">
                    💖
                  </div>
                </div>

                {/* Milestone Gold Card */}
                <div className="bg-white p-3.5 rounded-3xl border border-rose-100/60 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">🏆 MILESTONE</p>
                    <p className="font-serif text-2xl font-black text-amber-500 leading-none mt-1">Gold</p>
                    <p className="text-[8px] font-semibold text-gray-400 mt-0.5">Next milestone at Lvl {level + 1}</p>
                  </div>
                  <div className="w-9 h-9 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center font-black text-xs shrink-0">
                    🏆
                  </div>
                </div>
              </div>
            </div>

            {/* 5. COMING UP NEXT CARD (Matches reference screenshot 1-to-1) */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">COMING UP NEXT</p>
              <div 
                onClick={() => setActiveTab('calendar')}
                className="bg-white p-4 rounded-3xl border border-rose-100/60 shadow-sm flex items-center justify-between cursor-pointer hover:bg-rose-50/40 transition-all app-touch-active"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                    <CalendarIcon size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold italic text-rose-600">Nothing planned yet</h4>
                    <p className="text-[10px] text-gray-400 font-medium">Tap "Add a memory" or "Daily Routine" to plan your day together</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-rose-400 shrink-0" />
              </div>
            </div>

            {/* 6. EXPLORE TOGETHER MUSIC CARD (Matches reference screenshot 1-to-1) */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">❤️ EXPLORE TOGETHER</p>
              <div 
                onClick={() => setActiveTab('couple_beats')}
                className="bg-white p-3.5 rounded-3xl border border-rose-100/60 shadow-sm flex items-center justify-between cursor-pointer hover:bg-rose-50/40 transition-all app-touch-active"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-black shrink-0 shadow-md">
                    <Radio size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900 leading-tight">Heat Waves</h4>
                    <p className="text-[10px] text-gray-400 font-medium">Glass Animals</p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-bold text-rose-500">
                  <span>Play together</span>
                  <ChevronRight size={16} />
                </div>
              </div>
            </div>
          </div>

            {/* ========================================================================= */}
            {/* DESKTOP / WEB VIEW: 100% Original Desktop Layout (Untouched) */}
            {/* ========================================================================= */}
            <div className="hidden lg:block space-y-8">
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
                  <div className="relative w-24 h-24 mb-4 group cursor-pointer">
                    <div className="w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                      {user?.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-tr from-rose-500 to-pink-400 flex items-center justify-center text-white text-4xl font-black">
                          {user?.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                    </div>
                    {/* Camera overlay on hover */}
                    <label className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex items-center justify-center">
                      {uploadingAvatar ? (
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="text-white text-xs font-black">📷</span>
                      )}
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
                    </label>
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
                      <button
                        onClick={handleConnect}
                        className="bg-gray-900 text-white px-4 py-2 rounded-xl font-bold text-xs">
                        Invite
                      </button>
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
            ) : currentGame === 'ludo' ? (
              <Ludo user={user} roomId={roomId} socket={socket} onBack={() => setCurrentGame(null)} />
            ) : currentGame === 'quiz' ? (
              <CoupleQuiz user={user} roomId={roomId} socket={socket} onBack={() => setCurrentGame(null)} />
            ) : currentGame === 'doodle' ? (
              <LoveDoodleBoard user={user} roomId={roomId} socket={socket} partnerName={partnerName} onBack={() => setCurrentGame(null)} />
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* LOVE DOODLE BOARD CARD */}
                  <div className={`${glassStyle} group p-6 rounded-[2.5rem] hover:scale-[1.02] transition-all relative overflow-hidden border border-white/60 shadow-xl space-y-4`}>
                    <div className="w-14 h-14 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shadow-inner"><span className="text-3xl">🎨</span></div>
                    <div>
                      <h4 className="text-xl font-serif font-black text-gray-800">Love Doodle Board</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Real-time Drawing • Stickers • Neon Glow</p>
                    </div>
                    <button
                      onClick={() => setCurrentGame('doodle')}
                      className="w-full py-3 bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white rounded-2xl font-black text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      Start Drawing Together 🎨
                    </button>
                  </div>

                  <div className={`${glassStyle} group p-6 rounded-[2.5rem] hover:scale-[1.02] transition-all relative overflow-hidden border border-white/60 shadow-xl space-y-4`}>
                    <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shadow-inner"><span className="text-3xl">♟️</span></div>
                    <div>
                      <h4 className="text-xl font-serif font-black text-gray-800">Grandmaster Chess</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Real-time Moves • Rule Enforcement</p>
                    </div>
                    <button
                      onClick={() => setCurrentGame('chess')}
                      className="w-full py-3 bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950 rounded-2xl font-black text-xs shadow-md transition-all active:scale-95"
                    >
                      Challenge Now
                    </button>
                  </div>

                  <div className={`${glassStyle} group p-6 rounded-[2.5rem] hover:scale-[1.02] transition-all relative overflow-hidden border border-white/60 shadow-xl space-y-4`}>
                    <div className="w-14 h-14 bg-yellow-50 text-yellow-500 rounded-2xl flex items-center justify-center shadow-inner"><span className="text-3xl">🌈</span></div>
                    <div>
                      <h4 className="text-xl font-serif font-black text-gray-800">Love-UNO</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Fast Paced • Fun</p>
                    </div>
                    <button className="w-full py-3 bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950 rounded-2xl font-black text-xs shadow-md transition-all active:scale-95">
                      Draw Four!
                    </button>
                  </div>

                  <div className={`${glassStyle} group p-6 rounded-[2.5rem] hover:scale-[1.02] transition-all relative overflow-hidden border border-white/60 shadow-xl space-y-4`}>
                    <div className="w-14 h-14 bg-pink-50 text-pink-500 rounded-2xl flex items-center justify-center shadow-inner"><span className="text-3xl">🧠</span></div>
                    <div>
                      <h4 className="text-xl font-serif font-black text-gray-800">Memory Pairs</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Cute Icons • Turn Based</p>
                    </div>
                    <button
                      onClick={() => setCurrentGame('memory')}
                      className="w-full py-3 bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950 rounded-2xl font-black text-xs shadow-md transition-all active:scale-95"
                    >
                      Flip Cards
                    </button>
                  </div>

                  <div className={`${glassStyle} group p-6 rounded-[2.5rem] hover:scale-[1.02] transition-all relative overflow-hidden border border-white/60 shadow-xl space-y-4`}>
                    <div className="w-14 h-14 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center shadow-inner"><span className="text-3xl">⚡</span></div>
                    <div>
                      <h4 className="text-xl font-serif font-black text-gray-800">Fastest Finger</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Reaction Speed • 1v1 Battle</p>
                    </div>
                    <button
                      onClick={() => setCurrentGame('reaction')}
                      className="w-full py-3 bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950 rounded-2xl font-black text-xs shadow-md transition-all active:scale-95"
                    >
                      Test Speed ⚡
                    </button>
                  </div>

                  <div className={`${glassStyle} group p-6 rounded-[2.5rem] hover:scale-[1.02] transition-all relative overflow-hidden border border-white/60 shadow-xl space-y-4`}>
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center shadow-inner"><span className="text-3xl">⌨️</span></div>
                    <div>
                      <h4 className="text-xl font-serif font-black text-gray-800">Speed Typing Race</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Love Quotes • WPM Test</p>
                    </div>
                    <button
                      onClick={() => setCurrentGame('typing')}
                      className="w-full py-3 bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950 rounded-2xl font-black text-xs shadow-md transition-all active:scale-95"
                    >
                      Race Now ⌨️
                    </button>
                  </div>

                  <div className={`${glassStyle} group p-6 rounded-[2.5rem] hover:scale-[1.02] transition-all border-2 border-transparent hover:border-purple-200 relative overflow-hidden shadow-purple-100/50 space-y-4`}>
                    <div className="w-14 h-14 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center shadow-inner"><span className="text-3xl">❓</span></div>
                    <div>
                      <h4 className="text-xl font-serif font-black text-gray-800">Couple Quiz</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">1v1 Trivia • Secret Choice</p>
                    </div>
                    <button
                      onClick={() => setCurrentGame('quiz')}
                      className="w-full py-3 bg-gray-900 text-white hover:bg-purple-600 rounded-2xl font-black text-xs transition-all shadow-md active:scale-95"
                    >
                      Start Quiz ❓
                    </button>
                  </div>

                  <div className={`${glassStyle} group p-6 rounded-[2.5rem] hover:scale-[1.02] transition-all border-2 border-transparent hover:border-rose-200 relative overflow-hidden space-y-4`}>
                    <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center shadow-inner"><span className="text-3xl">🎲</span></div>
                    <div>
                      <h4 className="text-xl font-serif font-black text-gray-800">Love Ludo</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Real-time • 2 Players</p>
                    </div>
                    <button
                      onClick={() => setCurrentGame('ludo')}
                      className="w-full py-3 bg-gray-900 text-white hover:bg-rose-500 rounded-2xl font-black text-xs transition-all shadow-md active:scale-95"
                    >
                      Play Now 🎲
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'roulette' && (
          <div className="max-w-2xl mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-500">
            <LoveRoulette user={user} roomId={roomId} socket={socket} />
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
                  <div className="overflow-hidden rounded-3xl mb-4 border border-gray-50 shadow-inner">
                    <img src={mem.imageUrl} alt="memory" className="w-full h-auto object-contain grayscale-[20%] group-hover:grayscale-0 transition-all duration-500" />
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
        {activeTab === 'watch_together' && (
          <WatchTogether user={user} roomId={roomId} socket={socket} />
        )}
        {activeTab === 'universe' && (
          <UniverseMap user={user} roomId={roomId} socket={socket} />
        )}
        {activeTab === 'couple_beats' && (
          <CoupleBeats user={user} roomId={roomId} socket={socket} />
        )}
        {activeTab === 'virtual_touch' && (
          <VirtualTouch user={user} roomId={roomId} socket={socket} />
        )}
      </main>
    </div>
  );
}

export default Dashboard;